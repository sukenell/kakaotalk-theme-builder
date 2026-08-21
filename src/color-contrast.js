/**
 * A normalized color. RGB channels use the 0–255 range and alpha uses 0–1.
 *
 * @typedef {object} RgbaColor
 * @property {number} r
 * @property {number} g
 * @property {number} b
 * @property {number} a
 */

/**
 * @typedef {object} ContrastEvaluation
 * @property {"pass" | "fail" | "unknown"} status
 * @property {number | null} ratio Unrounded contrast ratio, or null when unresolved.
 * @property {number} required
 */

const SIX_DIGIT_HEX = /^#([0-9a-f]{6})$/i;
const EIGHT_DIGIT_HEX = /^#([0-9a-f]{8})$/i;

const byteFromHex = (hex, start) => Number.parseInt(hex.slice(start, start + 2), 16);

/**
 * Parses a CSS hexadecimal color. Eight digits are interpreted as #RRGGBBAA.
 * Unsupported or malformed values return null.
 *
 * @param {unknown} value
 * @returns {RgbaColor | null}
 */
export function parseCssHex(value) {
  if (typeof value !== "string") {
    return null;
  }

  const opaqueMatch = value.match(SIX_DIGIT_HEX);
  if (opaqueMatch) {
    const hex = opaqueMatch[1];
    return {
      r: byteFromHex(hex, 0),
      g: byteFromHex(hex, 2),
      b: byteFromHex(hex, 4),
      a: 1,
    };
  }

  const alphaMatch = value.match(EIGHT_DIGIT_HEX);
  if (!alphaMatch) {
    return null;
  }

  const hex = alphaMatch[1];
  return {
    r: byteFromHex(hex, 0),
    g: byteFromHex(hex, 2),
    b: byteFromHex(hex, 4),
    a: byteFromHex(hex, 6) / 255,
  };
}

/**
 * Parses a KakaoTalk theme hexadecimal color. Eight digits are interpreted as
 * #AARRGGBB, unlike CSS hexadecimal colors. Unsupported or malformed values
 * return null.
 *
 * @param {unknown} value
 * @returns {RgbaColor | null}
 */
export function parseThemeArgb(value) {
  if (typeof value !== "string") {
    return null;
  }

  const opaqueMatch = value.match(SIX_DIGIT_HEX);
  if (opaqueMatch) {
    const hex = opaqueMatch[1];
    return {
      r: byteFromHex(hex, 0),
      g: byteFromHex(hex, 2),
      b: byteFromHex(hex, 4),
      a: 1,
    };
  }

  const alphaMatch = value.match(EIGHT_DIGIT_HEX);
  if (!alphaMatch) {
    return null;
  }

  const hex = alphaMatch[1];
  return {
    r: byteFromHex(hex, 2),
    g: byteFromHex(hex, 4),
    b: byteFromHex(hex, 6),
    a: byteFromHex(hex, 0) / 255,
  };
}

const isChannel = (value, maximum) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= maximum;

/** @param {unknown} color */
const isRgbaColor = (color) =>
  color !== null &&
  typeof color === "object" &&
  isChannel(color.r, 255) &&
  isChannel(color.g, 255) &&
  isChannel(color.b, 255) &&
  isChannel(color.a, 1);

/**
 * Alpha-composites a normalized foreground color over a normalized background.
 * Returns null when either input is not a valid RGBA color.
 *
 * @param {RgbaColor} foreground
 * @param {RgbaColor} background
 * @returns {RgbaColor | null}
 */
export function compositeColors(foreground, background) {
  if (!isRgbaColor(foreground) || !isRgbaColor(background)) {
    return null;
  }

  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const compositeChannel = (foregroundChannel, backgroundChannel) =>
    (foregroundChannel * foreground.a +
      backgroundChannel * background.a * (1 - foreground.a)) /
    alpha;

  return {
    r: compositeChannel(foreground.r, background.r),
    g: compositeChannel(foreground.g, background.g),
    b: compositeChannel(foreground.b, background.b),
    a: alpha,
  };
}

const linearizeSrgbChannel = (channel) => {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : ((srgb + 0.055) / 1.055) ** 2.4;
};

/**
 * Calculates WCAG relative luminance for normalized RGB channels. Alpha is not
 * applied; translucent colors must be composited onto a known background first.
 *
 * @param {RgbaColor} color
 * @returns {number | null}
 */
export function relativeLuminance(color) {
  if (!isRgbaColor(color)) {
    return null;
  }

  return (
    0.2126 * linearizeSrgbChannel(color.r) +
    0.7152 * linearizeSrgbChannel(color.g) +
    0.0722 * linearizeSrgbChannel(color.b)
  );
}

/**
 * Calculates the unrounded WCAG contrast ratio between two opaque colors.
 * Invalid or translucent inputs return null.
 *
 * @param {RgbaColor} first
 * @param {RgbaColor} second
 * @returns {number | null}
 */
export function contrastRatio(first, second) {
  if (!isRgbaColor(first) || !isRgbaColor(second)) {
    return null;
  }
  if (first.a !== 1 || second.a !== 1) {
    return null;
  }

  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluates foreground contrast against a known background using an unrounded
 * ratio. A translucent foreground is first composited over the background. If
 * the background itself is translucent, or any input is invalid, the pair is
 * unresolved and returns an `unknown` status.
 *
 * @param {RgbaColor} foreground
 * @param {RgbaColor} background
 * @param {number} [required=4.5]
 * @returns {ContrastEvaluation}
 */
export function evaluateContrastPair(foreground, background, required = 4.5) {
  const unknown = { status: "unknown", ratio: null, required };
  if (
    !isRgbaColor(foreground) ||
    !isRgbaColor(background) ||
    background.a !== 1 ||
    typeof required !== "number" ||
    !Number.isFinite(required) ||
    required <= 0
  ) {
    return unknown;
  }

  const resolvedForeground = compositeColors(foreground, background);
  const ratio = contrastRatio(resolvedForeground, background);
  if (ratio === null) {
    return unknown;
  }

  return {
    status: ratio >= required ? "pass" : "fail",
    ratio,
    required,
  };
}

const contrastContext = (definition) =>
  Object.freeze({
    imageKeys: [],
    imageState: "none",
    state: "default",
    kind: "text",
    required: definition.kind === "large-text" || definition.kind === "ui-component" || definition.kind === "image" ? 3 : 4.5,
    ...definition,
  });

/**
 * Auditable default-preview contrast ledger. Static colors use CSS hex syntax;
 * theme color keys use KakaoTalk's ARGB syntax. `backgroundLayers` are ordered
 * back-to-front. Raster-dependent rows remain unknown unless `guarantee`
 * identifies a CSS backing/scrim that is independent from raster pixels.
 */
export const CONTRAST_CONTEXTS = Object.freeze([
  contrastContext({
    id: "home-status", pageId: "home", label: "상태 표시줄", selector: "#preview-panel-home .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "정적 전경과 불투명 프리뷰 배경",
  }),
  contrastContext({
    id: "home-header", pageId: "home", label: "홈 헤더", selector: "#preview-panel-home .main-header strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "초기 mainBackground 이미지는 cleared이며 단색 토큰이 노출됨",
  }),
  contrastContext({
    id: "home-segment-default", pageId: "home", label: "친구 필터 기본", selector: "#preview-panel-home .friend-segment:not(.is-active)",
    foregroundKey: "titleText", backgroundKey: "mainBackground", evidence: "투명 필터 위 mainBackground 단색",
  }),
  contrastContext({
    id: "home-segment-selected", pageId: "home", label: "친구 필터 선택", selector: "#preview-panel-home .friend-segment.is-active",
    foregroundKey: "titlePressed", backgroundKey: "bodyPressed", state: "selected", evidence: "선택 텍스트/배경 네이티브 토큰 쌍",
  }),
  contrastContext({
    id: "home-section", pageId: "home", label: "친구 섹션 제목", selector: "#preview-panel-home .friends-section-label",
    foregroundKey: "sectionTitle", backgroundKey: "mainBackground", evidence: "섹션 제목 토큰과 cleared 메인 단색",
  }),
  contrastContext({
    id: "home-secondary", pageId: "home", label: "친구 상태 메시지", selector: "#preview-panel-home .favorite-profile-row span",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", evidence: "투명 혼합을 제거한 불투명 paragraphText",
  }),
  contrastContext({
    id: "home-tab-icon-selected", pageId: "home", label: "선택된 친구 탭 아이콘", selector: "#preview-panel-home .tab-friends.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageKeys: ["tabFriendIconSelected"], imageState: "bundled",
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "chat-list-header", pageId: "chat-list", label: "대화 목록 헤더", selector: "#preview-panel-chat-list .chat-list-header > strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "초기 mainBackground 이미지는 cleared",
  }),
  contrastContext({
    id: "chat-list-title", pageId: "chat-list", label: "대화 상대 이름", selector: "#preview-panel-chat-list .chat-list-copy > strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", evidence: "불투명 헤더 전경과 메인 단색",
  }),
  contrastContext({
    id: "chat-list-secondary", pageId: "chat-list", label: "대화 미리보기", selector: "#preview-panel-chat-list .chat-list-copy > span",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", evidence: "투명 혼합을 제거한 불투명 paragraphText",
  }),
  contrastContext({
    id: "chat-list-unread", pageId: "chat-list", label: "읽지 않은 메시지 수", selector: "#preview-panel-chat-list .unread-badge",
    foregroundKey: "unreadCount", background: "#552020", evidence: "네이티브 unreadCount는 전경, 웹 전용 불투명 배지는 배경",
  }),
  contrastContext({
    id: "chat-list-tab-icon-selected", pageId: "chat-list", label: "선택된 대화 탭 아이콘", selector: "#preview-panel-chat-list .tab-chat.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageKeys: ["tabChatIconSelected"], imageState: "bundled",
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "open-chat-header", pageId: "open-chat", label: "지금 헤더", selector: "#preview-panel-open-chat .chat-list-header > strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "초기 mainBackground 이미지는 cleared",
  }),
  contrastContext({
    id: "open-chat-title", pageId: "open-chat", label: "오픈채팅 제목", selector: "#preview-panel-open-chat .chat-list-title strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", evidence: "불투명 헤더 전경과 메인 단색",
  }),
  contrastContext({
    id: "open-chat-secondary", pageId: "open-chat", label: "오픈채팅 메시지", selector: "#preview-panel-open-chat .chat-list-copy > span",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", evidence: "투명 혼합을 제거한 불투명 paragraphText",
  }),
  contrastContext({
    id: "open-chat-unread", pageId: "open-chat", label: "오픈채팅 읽지 않음", selector: "#preview-panel-open-chat .unread-badge",
    foregroundKey: "unreadCount", background: "#552020", evidence: "웹 전용 배경과 네이티브 unreadCount 전경",
  }),
  contrastContext({
    id: "open-chat-tab-icon-selected", pageId: "open-chat", label: "선택된 지금 탭 아이콘", selector: "#preview-panel-open-chat .tab-openchat.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageKeys: ["tabOpenChatIconSelected"], imageState: "bundled",
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "shopping-header", pageId: "shopping", label: "쇼핑 헤더", selector: "#preview-panel-shopping .phone-header",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    kind: "ui-component", evidence: "마스크 아이콘은 currentColor이며 메인 이미지는 cleared",
  }),
  contrastContext({
    id: "shopping-tab-default", pageId: "shopping", label: "쇼핑 필터 기본", selector: "#preview-panel-shopping .shopping-tab:not(.is-active)",
    foregroundKey: "titleText", backgroundKey: "mainBackground", evidence: "투명 필터 위 메인 단색",
  }),
  contrastContext({
    id: "shopping-tab-selected", pageId: "shopping", label: "쇼핑 필터 선택", selector: "#preview-panel-shopping .shopping-tab.is-active",
    foregroundKey: "titlePressed", backgroundKey: "bodyPressed", state: "selected", evidence: "선택 텍스트/배경 토큰 쌍",
  }),
  contrastContext({
    id: "shopping-summary-title", pageId: "shopping", label: "쇼핑 요약 제목", selector: "#preview-panel-shopping .shopping-summary-card strong",
    foregroundKey: "titleText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFE6"],
    evidence: "메인 단색 위 90% 흰 카드 합성",
  }),
  contrastContext({
    id: "shopping-summary-secondary", pageId: "shopping", label: "쇼핑 요약 보조", selector: "#preview-panel-shopping .shopping-summary-heading span",
    foregroundKey: "paragraphText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFE6"],
    evidence: "투명 글자를 제거하고 카드 배경을 합성",
  }),
  contrastContext({
    id: "shopping-order-glyph", pageId: "shopping", label: "주문 내역 원화 기호", selector: "#preview-panel-shopping .shopping-order-icon",
    foreground: "#9B3F49", background: "#DEDEDE", kind: "ui-component", evidence: "::before의 고정 전경/배경",
  }),
  contrastContext({
    id: "shopping-pick-title", pageId: "shopping", label: "오늘의 PICK", selector: "#preview-panel-shopping .shopping-pick-title strong",
    foregroundKey: "sectionTitle", backgroundKey: "mainBackground", evidence: "섹션 제목 토큰과 cleared 메인 단색",
  }),
  contrastContext({
    id: "shopping-carousel-default", pageId: "shopping", label: "상품 이동 버튼", selector: "#preview-panel-shopping .shopping-carousel-control.next",
    foregroundKey: "titleText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFE6"], kind: "ui-component",
    evidence: "메인 단색 위 90% 흰 버튼",
  }),
  contrastContext({
    id: "shopping-carousel-hover", pageId: "shopping", label: "상품 이동 버튼 호버", selector: "#preview-panel-shopping .shopping-carousel-control.next",
    foregroundKey: "titleText", background: "#F5F5F5", state: "hover", kind: "ui-component", evidence: "명시된 불투명 hover 배경",
  }),
  contrastContext({
    id: "shopping-carousel-pressed", pageId: "shopping", label: "상품 이동 버튼 누름", selector: "#preview-panel-shopping .shopping-carousel-control.next",
    foregroundKey: "titleText", background: "#E5E5E5", state: "pressed", kind: "ui-component", evidence: "명시된 불투명 active 배경",
  }),
  contrastContext({
    id: "shopping-product-title", pageId: "shopping", label: "상품 제목", selector: "#preview-panel-shopping .shop-card-content strong",
    foreground: "#FFFFFF", backgroundLayers: ["#FFFFFF", "#000000B8"], imageKeys: ["shoppingImage_01", "shoppingImage_02", "shoppingImage_03", "shoppingImage_04"],
    imageState: "bundled", guarantee: "worst-case-scrim", evidence: "worst-case white raster + fixed 72% black scrim backing",
  }),
  contrastContext({
    id: "shopping-product-price", pageId: "shopping", label: "상품 가격", selector: "#preview-panel-shopping .shop-price",
    foreground: "#FFFFFF", backgroundLayers: ["#FFFFFF", "#000000B8"], imageKeys: ["shoppingImage_01", "shoppingImage_02", "shoppingImage_03", "shoppingImage_04"],
    imageState: "bundled", guarantee: "worst-case-scrim", evidence: "worst-case white raster + fixed 72% black scrim backing",
  }),
  contrastContext({
    id: "shopping-tab-icon-selected", pageId: "shopping", label: "선택된 쇼핑 탭 아이콘", selector: "#preview-panel-shopping .tab-shopping.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageKeys: ["tabShoppingIconSelected"], imageState: "bundled",
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "more-header", pageId: "more", label: "더보기 헤더", selector: "#preview-panel-more .chat-list-header > strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "초기 mainBackground 이미지는 cleared",
  }),
  contrastContext({
    id: "more-segment-default", pageId: "more", label: "더보기 필터 기본", selector: "#preview-panel-more .more-segment:not(.is-active)",
    foregroundKey: "titleText", backgroundKey: "mainBackground", evidence: "투명 필터 위 메인 단색",
  }),
  contrastContext({
    id: "more-segment-selected", pageId: "more", label: "더보기 필터 선택", selector: "#preview-panel-more .more-segment.is-active",
    foregroundKey: "titlePressed", backgroundKey: "bodyPressed", state: "selected", evidence: "선택 텍스트/배경 토큰 쌍",
  }),
  contrastContext({
    id: "more-service-title", pageId: "more", label: "더보기 서비스 이름", selector: "#preview-panel-more .more-service-item strong",
    foregroundKey: "titleText", background: "#FFE7E7", evidence: "기본 mainBackground 72%와 흰색 28%의 불투명 color-mix 결과",
  }),
  contrastContext({
    id: "more-ad-title", pageId: "more", label: "광고 제목", selector: "#preview-panel-more .more-ad-art strong",
    foreground: "#23406D", backgroundLayers: ["#000000", "#FFFFFFBD"], imageKeys: ["readingLogAd"], imageState: "bundled",
    guarantee: "worst-case-scrim", evidence: "worst-case black raster + fixed 74% white scrim backing",
  }),
  contrastContext({
    id: "more-ad-description", pageId: "more", label: "광고 설명", selector: "#preview-panel-more .more-ad-art span:not(.ad-mark)",
    foreground: "#23406D", backgroundLayers: ["#000000", "#FFFFFFB3"], imageKeys: ["readingLogAd"], imageState: "bundled",
    guarantee: "worst-case-scrim", evidence: "worst-case black raster + fixed 70% white scrim backing",
  }),
  contrastContext({
    id: "more-ad-mark", pageId: "more", label: "광고 표시", selector: "#preview-panel-more .ad-mark",
    foreground: "#687078", background: "#FFFFFF", imageKeys: ["readingLogAd"], imageState: "bundled",
    guarantee: "opaque-backing", evidence: "번들 광고 이미지와 분리된 opaque white backing",
  }),
  contrastContext({
    id: "more-section", pageId: "more", label: "더보기 섹션 제목", selector: "#preview-panel-more .more-section-heading",
    foregroundKey: "sectionTitle", backgroundKey: "mainBackground", evidence: "섹션 제목 토큰과 cleared 메인 단색",
  }),
  contrastContext({
    id: "more-tab-icon-selected", pageId: "more", label: "선택된 더보기 탭 아이콘", selector: "#preview-panel-more .tab-more.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageKeys: ["tabMoreIconSelected"], imageState: "bundled",
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "chat-header", pageId: "chat", label: "채팅방 헤더", selector: "#preview-panel-chat .phone-header strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", evidence: "헤더는 이미지 없이 메인 단색 사용",
  }),
  contrastContext({
    id: "chat-date", pageId: "chat", label: "채팅 날짜", selector: "#preview-panel-chat .date-chip",
    foreground: "#FFFFFF", backgroundLayers: [{ colorKey: "mainBackground" }, "#0000008C"], imageKeys: ["chatBackground"], imageState: "cleared",
    evidence: "cleared 채팅 단색 위 55% 검정 칩",
  }),
  contrastContext({
    id: "chat-sender", pageId: "chat", label: "발신자 이름", selector: "#preview-panel-chat .sender",
    foregroundKey: "receiveText", backgroundKey: "mainBackground", imageKeys: ["chatBackground"], imageState: "cleared",
    evidence: "초기 chatBackground 이미지는 cleared",
  }),
  contrastContext({
    id: "chat-time", pageId: "chat", label: "메시지 시각", selector: "#preview-panel-chat .message-time",
    foregroundKey: "receiveText", backgroundKey: "mainBackground", imageKeys: ["chatBackground"], imageState: "cleared",
    evidence: "투명 혼합을 제거한 불투명 receiveText",
  }),
  contrastContext({
    id: "chat-send-bubble", pageId: "chat", label: "보낸 말풍선", selector: "#preview-panel-chat .send-bubble",
    foregroundKey: "sendText", backgroundLayers: ["#FFFFFF", "#000000B8"], imageKeys: ["sendBubbleNormal", "sendBubbleTailless"], imageState: "bundled",
    guarantee: "worst-case-scrim", evidence: "worst-case white raster + fixed 72% black CSS backing",
  }),
  contrastContext({
    id: "chat-receive-bubble", pageId: "chat", label: "받은 말풍선", selector: "#preview-panel-chat .receive-bubble",
    foregroundKey: "receiveText", background: "#F8F8F8", imageKeys: ["receiveBubbleNormal", "receiveBubbleTailless"], imageState: "bundled",
    guarantee: "opaque-backing", evidence: "번들 raster 위 불투명 CSS backing",
  }),
  contrastContext({
    id: "chat-input", pageId: "chat", label: "메시지 입력 안내", selector: "#preview-panel-chat .input-pill",
    foregroundKey: "inputBarText", backgroundLayers: [{ colorKey: "inputBarBackground" }, "#0000000D"], evidence: "입력바 위 5% 검정 필드",
  }),
  contrastContext({
    id: "chat-input-menu", pageId: "chat", label: "입력 메뉴", selector: "#preview-panel-chat .input-bar-content > .preview-mock-control:first-child",
    foregroundKey: "inputMenu", backgroundLayers: [{ colorKey: "inputBarBackground" }, { colorKey: "inputMenuButton" }],
    kind: "ui-component", evidence: "ARGB inputMenuButton을 입력바 위에 합성",
  }),
  contrastContext({
    id: "chat-send-button", pageId: "chat", label: "전송 버튼", selector: "#preview-panel-chat .send-button",
    foregroundKey: "sendButtonText", backgroundKey: "sendButton", evidence: "전송 전경/배경 네이티브 토큰 쌍",
  }),

  contrastContext({
    id: "bubble-detail-header", pageId: "bubble-detail", label: "말풍선 상세 헤더", selector: "#preview-panel-bubble-detail .bubble-detail-header h3",
    foregroundKey: "headerText", backgroundKey: "mainBackground", evidence: "헤더는 이미지 없이 메인 단색 사용",
  }),
  contrastContext({
    id: "bubble-detail-action", pageId: "bubble-detail", label: "말풍선 상세 작업 버튼", selector: "#preview-panel-bubble-detail .bubble-detail-actions button",
    foregroundKey: "headerText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFF8F"], kind: "ui-component",
    evidence: "메인 단색 위 56% 흰 버튼 합성",
  }),
  contrastContext({
    id: "bubble-detail-send-default", pageId: "bubble-detail", label: "보낸 기본 말풍선 샘플", selector: "#preview-panel-bubble-detail .nine-patch-sample",
    foregroundKey: "sendText", backgroundLayers: ["#FFFFFF", "#000000B8"], imageKeys: ["sendBubbleNormal", "sendBubbleTailless"], imageState: "bundled",
    guarantee: "worst-case-scrim", evidence: "기본 번들 raster 위 fixed scrim backing",
  }),
  contrastContext({
    id: "bubble-detail-send-selected", pageId: "bubble-detail", label: "보낸 선택 말풍선 샘플", selector: "#preview-panel-bubble-detail .nine-patch-sample",
    foregroundKey: "sendText", backgroundLayers: ["#FFFFFF", "#000000B8"], imageKeys: ["sendBubbleSelected", "sendBubbleTaillessSelected"], imageState: "bundled",
    state: "selected", guarantee: "worst-case-scrim", evidence: "선택 번들 raster 위 fixed scrim backing",
  }),
  contrastContext({
    id: "bubble-detail-receive-default", pageId: "bubble-detail", label: "받은 기본 말풍선 샘플", selector: "#preview-panel-bubble-detail .nine-patch-sample",
    foregroundKey: "receiveText", background: "#F8F8F8", imageKeys: ["receiveBubbleNormal", "receiveBubbleTailless"], imageState: "bundled",
    guarantee: "opaque-backing", evidence: "기본 번들 raster 위 opaque backing",
  }),
  contrastContext({
    id: "bubble-detail-receive-selected", pageId: "bubble-detail", label: "받은 선택 말풍선 샘플", selector: "#preview-panel-bubble-detail .nine-patch-sample",
    foregroundKey: "receiveText", background: "#F8F8F8", imageKeys: ["receiveBubbleSelected", "receiveBubbleTaillessSelected"], imageState: "bundled",
    state: "selected", guarantee: "opaque-backing", evidence: "선택 번들 raster 위 opaque backing",
  }),
  contrastContext({
    id: "bubble-detail-fit", pageId: "bubble-detail", label: "말풍선 맞춤 방식", selector: "#preview-panel-bubble-detail .nine-patch-fit-control",
    foregroundKey: "descriptionText", backgroundKey: "mainBackground", evidence: "불투명 descriptionText와 cleared 채팅 단색",
  }),
  contrastContext({
    id: "bubble-detail-fit-selected", pageId: "bubble-detail", label: "선택된 맞춤 방식", selector: "#preview-panel-bubble-detail .nine-patch-fit-option input:checked + label",
    foregroundKey: "sendButtonText", backgroundKey: "sendButton", state: "selected", evidence: "선택 라디오가 전송 버튼 토큰 쌍을 사용",
  }),

  contrastContext({
    id: "passcode-title", pageId: "passcode", label: "암호 제목", selector: "#preview-panel-passcode .passcode-intro strong",
    foregroundKey: "passcodeText", backgroundKey: "mainBackground", imageKeys: ["passcodeBackgroundImage"], imageState: "cleared",
    kind: "large-text", evidence: "초기 passcodeBackgroundImage는 cleared",
  }),
  contrastContext({
    id: "passcode-description", pageId: "passcode", label: "암호 안내", selector: "#preview-panel-passcode .passcode-intro > span",
    foregroundKey: "passcodeText", backgroundKey: "mainBackground", imageKeys: ["passcodeBackgroundImage"], imageState: "cleared",
    evidence: "투명 혼합을 제거한 불투명 passcodeText",
  }),
  contrastContext({
    id: "passcode-keypad", pageId: "passcode", label: "암호 키패드", selector: "#preview-panel-passcode .keypad button[data-passcode-digit]",
    foregroundKey: "passcodeKeypadText", backgroundKey: "mainBackground", imageKeys: ["passcodeBackgroundImage"], imageState: "cleared",
    kind: "large-text", evidence: "키패드는 투명하므로 keypad background 토큰이 아닌 실제 화면 단색과 비교",
  }),
  contrastContext({
    id: "passcode-dot-default", pageId: "passcode", label: "암호 빈 점", selector: "#preview-panel-passcode .passcode-dot",
    foreground: "#000000", backgroundKey: "mainBackground", imageKeys: ["passcodeDot", "passcodeDot2", "passcodeDot3", "passcodeDot4"], imageState: "bundled",
    kind: "image", evidence: "수동 이미지 검사 대상: 번들 점 PNG가 전경 자체임",
  }),
  contrastContext({
    id: "passcode-dot-selected", pageId: "passcode", label: "암호 입력 점", selector: "#preview-panel-passcode .passcode-dot",
    foreground: "#000000", backgroundKey: "mainBackground", imageKeys: ["passcodeDotSelected", "passcodeDotSelected2", "passcodeDotSelected3", "passcodeDotSelected4"], imageState: "bundled",
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 선택 번들 점 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "splash-status", pageId: "splash", label: "로딩 화면 상태 표시줄", selector: "#preview-panel-splash .phone-status",
    foreground: "#3C4148", backgroundKey: "mainBackground", imageKeys: ["splashImage"], imageState: "cleared",
    evidence: "초기 splashImage는 cleared",
  }),
  contrastContext({
    id: "splash-theme-icon", pageId: "splash", label: "로딩 테마 아이콘", selector: "#preview-panel-splash .splash-icon",
    foreground: "#000000", backgroundKey: "mainBackground", imageKeys: ["themeIcon"], imageState: "bundled", kind: "image",
    evidence: "수동 이미지 검사 대상: 번들 테마 아이콘이 전경 자체임",
  }),

  contrastContext({
    id: "theme-list-header", pageId: "theme-list", label: "테마 목록 헤더", selector: "#preview-panel-theme-list .theme-list-header strong",
    foregroundKey: "headerText", background: "#FFFFFF", evidence: "헤더의 고정 흰 배경",
  }),
  contrastContext({
    id: "theme-list-manage", pageId: "theme-list", label: "테마 관리", selector: "#preview-panel-theme-list .theme-list-header > .preview-mock-control:last-child",
    foreground: "#687078", background: "#FFFFFF", evidence: "불투명 정적 보조 전경",
  }),
  contrastContext({
    id: "theme-list-section", pageId: "theme-list", label: "테마 목록 섹션", selector: "#preview-panel-theme-list .section-title",
    foregroundKey: "sectionTitle", background: "#FFFFFF", evidence: "섹션 제목 토큰과 고정 흰 배경",
  }),
  contrastContext({
    id: "theme-list-title", pageId: "theme-list", label: "테마 이름", selector: "#preview-panel-theme-list .theme-list-copy strong",
    foreground: "#202124", background: "#FFFFFF", evidence: "불투명 정적 전경/배경",
  }),
  contrastContext({
    id: "theme-list-secondary", pageId: "theme-list", label: "테마 설명", selector: "#preview-panel-theme-list .theme-list-copy > span",
    foreground: "#687078", background: "#FFFFFF", evidence: "불투명 정적 보조 전경",
  }),
  contrastContext({
    id: "theme-list-selected-row", pageId: "theme-list", label: "선택된 테마", selector: "#preview-panel-theme-list .active-theme-row .theme-list-copy strong",
    foreground: "#202124", background: "#F7F0F0", state: "selected", evidence: "기본 sectionTitle 8%와 흰색의 불투명 선택 배경",
  }),
  contrastContext({
    id: "theme-list-choice-selected", pageId: "theme-list", label: "선택 표시", selector: "#preview-panel-theme-list .theme-choice.selected",
    foregroundKey: "sectionTitle", background: "#FFFFFF", state: "selected", kind: "ui-component",
    evidence: "선택 원 테두리는 sectionTitle 토큰을 사용",
  }),
]);

function parseContextStaticColor(value) {
  return parseCssHex(value);
}

function resolveContextColor(source, colors) {
  if (typeof source === "string") {
    return parseContextStaticColor(source);
  }

  if (source && typeof source === "object" && typeof source.colorKey === "string") {
    return parseThemeArgb(colors?.[source.colorKey]);
  }

  return null;
}

function resolveContextBackground(context, colors) {
  if (context.backgroundKey) {
    return parseThemeArgb(colors?.[context.backgroundKey]);
  }
  if (context.background) {
    return parseContextStaticColor(context.background);
  }
  if (!Array.isArray(context.backgroundLayers) || context.backgroundLayers.length === 0) {
    return null;
  }

  let composite = resolveContextColor(context.backgroundLayers[0], colors);
  for (const layer of context.backgroundLayers.slice(1)) {
    const foreground = resolveContextColor(layer, colors);
    composite = compositeColors(foreground, composite);
    if (!composite) {
      return null;
    }
  }

  return composite;
}

/**
 * Evaluates one ledger row against a theme palette. Raster foregrounds and
 * unprotected raster backgrounds intentionally remain unknown.
 *
 * @param {object} context
 * @param {Record<string, string>} colors
 * @returns {ContrastEvaluation}
 */
export function evaluateContrastContext(context, colors) {
  const unknown = { status: "unknown", ratio: null, required: context?.required ?? 4.5 };
  if (!context || typeof context !== "object") {
    return unknown;
  }

  const dependsOnRaster = Array.isArray(context.imageKeys) && context.imageKeys.length > 0;
  if (context.kind === "image" || (dependsOnRaster && ["bundled", "user"].includes(context.imageState) && !context.guarantee)) {
    return unknown;
  }

  const foreground = context.foregroundKey
    ? parseThemeArgb(colors?.[context.foregroundKey])
    : parseContextStaticColor(context.foreground);
  const background = resolveContextBackground(context, colors);
  return evaluateContrastPair(foreground, background, context.required);
}
