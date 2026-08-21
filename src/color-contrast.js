import { PREVIEW_PAGES } from "./preview-pages.js";

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

const contrastContext = (definition) => {
  const kind = definition.kind ?? "text";
  const declaredImageStates = definition.imageStates ?? Object.fromEntries(
    (definition.imageKeys ?? []).map((key) => [key, definition.imageState]),
  );
  const imageStates = Object.freeze({ ...declaredImageStates });
  const imageKeys = Object.freeze(Object.keys(imageStates));
  const protectedImageKeys = Object.freeze([...(definition.protectedImageKeys ?? [])]);
  const states = Object.values(imageStates);
  const imageState = states.length === 0
    ? "none"
    : states.every((state) => state === states[0])
      ? states[0]
      : states.includes("bundled")
        ? "bundled"
        : states[0];

  return Object.freeze({
    state: "default",
    kind,
    required: kind === "large-text" || kind === "ui-component" || kind === "image" ? 3 : 4.5,
    ...definition,
    imageKeys,
    imageState,
    imageStates,
    protectedImageKeys,
  });
};

const mainImage = Object.freeze({ mainBackground: "cleared" });
const chatImage = Object.freeze({ chatBackground: "cleared" });
const headerImages = (...keys) => Object.freeze({
  mainBackground: "cleared",
  ...Object.fromEntries(keys.map((key) => [key, "bundled"])),
});
const tabImages = (...keys) => Object.freeze({
  mainBackground: "cleared",
  tabBackground: "cleared",
  ...Object.fromEntries(keys.map((key) => [key, "bundled"])),
});
const productImages = Object.freeze({
  shoppingImage_01: "bundled",
  shoppingImage_02: "bundled",
  shoppingImage_03: "bundled",
  shoppingImage_04: "bundled",
});

/**
 * Auditable default-preview contrast ledger. Static colors use CSS hex syntax;
 * theme color keys use KakaoTalk's ARGB syntax. `backgroundLayers` are ordered
 * back-to-front. Raster-dependent rows remain unknown unless each dependency
 * is named in `protectedImageKeys` and covered by the declared CSS guarantee.
 */
export const CONTRAST_CONTEXTS = Object.freeze([
  contrastContext({
    id: "home-status", pageId: "home", label: "상태 표시줄", selector: "#preview-panel-home .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "정적 전경과 불투명 프리뷰 배경",
  }),
  contrastContext({
    id: "home-header-title", pageId: "home", label: "홈 헤더 제목", selector: "#preview-panel-home .main-header strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "초기 mainBackground 이미지는 cleared이며 단색 토큰이 노출됨",
  }),
  contrastContext({
    id: "home-header-actions", pageId: "home", label: "홈 헤더 아이콘", selector: "#preview-panel-home .friend-action-icon",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageStates: headerImages("headerSearch", "headerFriendTab", "headerSettings"),
    kind: "ui-component", guarantee: "css-currentcolor-mask", protectedImageKeys: ["headerSearch", "headerFriendTab", "headerSettings"],
    foregroundProperty: "background-color", backgroundSource: "parent",
    evidence: "bundled raster는 마스크 모양만 제공하고 CSS currentColor가 실제 전경을 보장",
  }),
  contrastContext({
    id: "home-segment-default", pageId: "home", label: "친구 필터 기본", selector: "#preview-panel-home .friend-segment:not(.is-active)",
    foregroundKey: "titleText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "투명 필터 위 cleared mainBackground 단색",
  }),
  contrastContext({
    id: "home-segment-selected", pageId: "home", label: "친구 필터 선택", selector: "#preview-panel-home .friend-segment.is-active",
    foregroundKey: "titlePressed", backgroundKey: "bodyPressed", state: "selected", evidence: "선택 텍스트/배경 네이티브 토큰 쌍",
  }),
  contrastContext({
    id: "home-promo-title", pageId: "home", label: "친구 광고 제목", selector: "#preview-panel-home .friends-promo-card strong",
    foreground: "#20242A", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFF0"], imageStates: mainImage,
    evidence: "main surface 위 94% 흰 카드의 실제 텍스트",
  }),
  contrastContext({
    id: "home-promo-secondary", pageId: "home", label: "친구 광고 보조", selector: "#preview-panel-home .friends-promo-card > div:first-child > span",
    foreground: "#5A616C", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFF0"], imageStates: mainImage,
    evidence: "main surface 위 94% 흰 카드의 불투명 보조 텍스트",
  }),
  contrastContext({
    id: "home-section", pageId: "home", label: "친구 섹션 제목", selector: "#preview-panel-home .friends-section-label",
    foregroundKey: "sectionTitle", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "섹션 제목 토큰과 cleared 메인 단색",
  }),
  contrastContext({
    id: "home-profile-name", pageId: "home", label: "친구 이름", selector: "#preview-panel-home :is(.updated-profile-card, .favorite-profile-row) strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "친구 이름과 cleared main surface",
  }),
  contrastContext({
    id: "home-secondary", pageId: "home", label: "친구 상태 메시지", selector: "#preview-panel-home .favorite-profile-row span",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "투명 혼합을 제거한 불투명 paragraphText",
  }),
  contrastContext({
    id: "home-tab-icons-default", pageId: "home", label: "선택되지 않은 하단 탭 아이콘", selector: "#preview-panel-home .bottom-tabs .preview-mock-control:not(.is-selected) .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabChatIcon", "tabOpenChatIcon", "tabShoppingIcon", "tabMoreIcon"),
    kind: "image", evidence: "수동 이미지 검사 대상: 네 개의 실제 bundled normal PNG와 tab/main raster surface",
  }),
  contrastContext({
    id: "home-tab-icon-selected", pageId: "home", label: "선택된 친구 탭 아이콘", selector: "#preview-panel-home .tab-friends.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabFriendIconSelected"),
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "chat-list-status", pageId: "chat-list", label: "대화 목록 상태 표시줄", selector: "#preview-panel-chat-list .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "상태 표시줄의 고정 흰 surface",
  }),
  contrastContext({
    id: "chat-list-header-title", pageId: "chat-list", label: "대화 목록 헤더", selector: "#preview-panel-chat-list .chat-list-header > strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "초기 mainBackground 이미지는 cleared",
  }),
  contrastContext({
    id: "chat-list-header-actions", pageId: "chat-list", label: "대화 목록 헤더 아이콘", selector: "#preview-panel-chat-list .chat-list-actions :is(.friend-action-icon, .chat-compose-icon)",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageStates: headerImages("headerSearch", "headerCompose", "headerSettings"),
    kind: "ui-component", guarantee: "css-currentcolor-mask", protectedImageKeys: ["headerSearch", "headerCompose", "headerSettings"],
    foregroundProperty: "background-color", backgroundSource: "parent",
    evidence: "bundled raster 마스크와 CSS currentColor 전경",
  }),
  contrastContext({
    id: "chat-list-title", pageId: "chat-list", label: "대화 상대 이름", selector: "#preview-panel-chat-list .chat-list-copy strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "불투명 헤더 전경과 cleared main surface",
  }),
  contrastContext({
    id: "chat-list-member-count", pageId: "chat-list", label: "대화방 참여자 수", selector: "#preview-panel-chat-list .room-member-count",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "참여자 수와 cleared main surface",
  }),
  contrastContext({
    id: "chat-list-secondary", pageId: "chat-list", label: "대화 미리보기", selector: "#preview-panel-chat-list .chat-list-copy > span",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "투명 혼합을 제거한 불투명 paragraphText",
  }),
  contrastContext({
    id: "chat-list-time", pageId: "chat-list", label: "대화 목록 시각", selector: "#preview-panel-chat-list .chat-list-meta time",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "대화 시각과 cleared main surface",
  }),
  contrastContext({
    id: "chat-list-unread", pageId: "chat-list", label: "읽지 않은 메시지 수", selector: "#preview-panel-chat-list .unread-badge",
    foregroundKey: "unreadCount", background: "#552020", evidence: "네이티브 unreadCount는 전경, 웹 전용 불투명 배지는 배경",
  }),
  contrastContext({
    id: "chat-list-tab-icons-default", pageId: "chat-list", label: "선택되지 않은 하단 탭 아이콘", selector: "#preview-panel-chat-list .bottom-tabs .preview-mock-control:not(.is-selected) .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabFriendIcon", "tabOpenChatIcon", "tabShoppingIcon", "tabMoreIcon"),
    kind: "image", evidence: "수동 이미지 검사 대상: bundled normal PNG와 tab/main raster surface",
  }),
  contrastContext({
    id: "chat-list-tab-icon-selected", pageId: "chat-list", label: "선택된 대화 탭 아이콘", selector: "#preview-panel-chat-list .tab-chat.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabChatIconSelected"),
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "open-chat-status", pageId: "open-chat", label: "지금 상태 표시줄", selector: "#preview-panel-open-chat .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "상태 표시줄의 고정 흰 surface",
  }),
  contrastContext({
    id: "open-chat-header-title", pageId: "open-chat", label: "지금 헤더", selector: "#preview-panel-open-chat .chat-list-header > strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "초기 mainBackground 이미지는 cleared",
  }),
  contrastContext({
    id: "open-chat-header-actions", pageId: "open-chat", label: "지금 헤더 아이콘", selector: "#preview-panel-open-chat .chat-list-actions :is(.friend-action-icon, .chat-compose-icon)",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageStates: headerImages("headerSearch", "headerCompose", "headerSettings"),
    kind: "ui-component", guarantee: "css-currentcolor-mask", protectedImageKeys: ["headerSearch", "headerCompose", "headerSettings"],
    foregroundProperty: "background-color", backgroundSource: "parent",
    evidence: "bundled raster 마스크와 CSS currentColor 전경",
  }),
  contrastContext({
    id: "open-chat-title", pageId: "open-chat", label: "오픈채팅 제목", selector: "#preview-panel-open-chat .chat-list-title strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "불투명 헤더 전경과 cleared main surface",
  }),
  contrastContext({
    id: "open-chat-member-count", pageId: "open-chat", label: "오픈채팅 참여자 수", selector: "#preview-panel-open-chat .room-member-count",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "참여자 수와 cleared main surface",
  }),
  contrastContext({
    id: "open-chat-secondary", pageId: "open-chat", label: "오픈채팅 메시지", selector: "#preview-panel-open-chat .chat-list-copy > span",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "투명 혼합을 제거한 불투명 paragraphText",
  }),
  contrastContext({
    id: "open-chat-time", pageId: "open-chat", label: "오픈채팅 시각", selector: "#preview-panel-open-chat .chat-list-meta time",
    foregroundKey: "paragraphText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "대화 시각과 cleared main surface",
  }),
  contrastContext({
    id: "open-chat-unread", pageId: "open-chat", label: "오픈채팅 읽지 않음", selector: "#preview-panel-open-chat .unread-badge",
    foregroundKey: "unreadCount", background: "#552020", evidence: "웹 전용 배경과 네이티브 unreadCount 전경",
  }),
  contrastContext({
    id: "open-chat-tab-icons-default", pageId: "open-chat", label: "선택되지 않은 하단 탭 아이콘", selector: "#preview-panel-open-chat .bottom-tabs .preview-mock-control:not(.is-selected) .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabFriendIcon", "tabChatIcon", "tabShoppingIcon", "tabMoreIcon"),
    kind: "image", evidence: "수동 이미지 검사 대상: bundled normal PNG와 tab/main raster surface",
  }),
  contrastContext({
    id: "open-chat-tab-icon-selected", pageId: "open-chat", label: "선택된 지금 탭 아이콘", selector: "#preview-panel-open-chat .tab-openchat.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabOpenChatIconSelected"),
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "shopping-status", pageId: "shopping", label: "쇼핑 상태 표시줄", selector: "#preview-panel-shopping .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "상태 표시줄의 고정 흰 surface",
  }),
  contrastContext({
    id: "shopping-header-title", pageId: "shopping", label: "쇼핑 헤더", selector: "#preview-panel-shopping .phone-header > strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "쇼핑 헤더 제목과 cleared main surface",
  }),
  contrastContext({
    id: "shopping-header-actions", pageId: "shopping", label: "쇼핑 헤더 아이콘", selector: "#preview-panel-shopping .chat-list-actions :is(.friend-action-icon, .shopping-action-icon)",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageStates: headerImages("headerSearch", "headerShopping", "headerSettings"),
    kind: "ui-component", guarantee: "css-currentcolor-mask", protectedImageKeys: ["headerSearch", "headerShopping", "headerSettings"],
    foregroundProperty: "background-color", backgroundSource: "parent",
    evidence: "bundled raster 마스크와 CSS currentColor 전경",
  }),
  contrastContext({
    id: "shopping-tab-default", pageId: "shopping", label: "쇼핑 필터 기본", selector: "#preview-panel-shopping .shopping-tab:not(.is-active)",
    foregroundKey: "titleText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "투명 필터 위 cleared main surface",
  }),
  contrastContext({
    id: "shopping-tab-selected", pageId: "shopping", label: "쇼핑 필터 선택", selector: "#preview-panel-shopping .shopping-tab.is-active",
    foregroundKey: "titlePressed", backgroundKey: "bodyPressed", state: "selected", evidence: "선택 텍스트/배경 토큰 쌍",
  }),
  contrastContext({
    id: "shopping-summary-title", pageId: "shopping", label: "쇼핑 요약 제목", selector: "#preview-panel-shopping .shopping-summary-card strong",
    foregroundKey: "titleText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFE6"], imageStates: mainImage,
    evidence: "메인 단색 위 90% 흰 카드 합성",
  }),
  contrastContext({
    id: "shopping-summary-secondary", pageId: "shopping", label: "쇼핑 요약 보조", selector: "#preview-panel-shopping .shopping-summary-heading span",
    foregroundKey: "paragraphText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFE6"], imageStates: mainImage,
    evidence: "투명 글자를 제거하고 카드 배경을 합성",
  }),
  contrastContext({
    id: "shopping-summary-heart", pageId: "shopping", label: "찜한 상품 하트", selector: "#preview-panel-shopping .shopping-summary-thumb.has-heart",
    foreground: "#FFFFFF", background: "#FF3B6B", imageStates: productImages, kind: "ui-component", guarantee: "opaque-backing",
    protectedImageKeys: Object.keys(productImages), foregroundPseudo: "::after", backgroundSource: "foreground-pseudo",
    evidence: "상품 raster 위 실제 ::after 하트와 불투명 원형 CSS backing",
  }),
  contrastContext({
    id: "shopping-order-glyph", pageId: "shopping", label: "주문 내역 원화 기호", selector: "#preview-panel-shopping .shopping-order-icon",
    foreground: "#9B3F49", background: "#DEDEDE", kind: "ui-component", foregroundPseudo: "::before", backgroundSource: "foreground-pseudo",
    evidence: "실제 ::before의 고정 전경/배경",
  }),
  contrastContext({
    id: "shopping-pick-title", pageId: "shopping", label: "오늘의 PICK", selector: "#preview-panel-shopping .shopping-pick-title strong",
    foregroundKey: "sectionTitle", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "섹션 제목 토큰과 cleared 메인 단색",
  }),
  contrastContext({
    id: "shopping-pick-info", pageId: "shopping", label: "오늘의 PICK 정보 아이콘", selector: "#preview-panel-shopping .shopping-pick-title > span",
    foregroundKey: "sectionTitle", backgroundKey: "mainBackground", imageStates: mainImage, kind: "ui-component",
    evidence: "정보 기호와 원형 경계가 cleared main surface 위 sectionTitle 색 사용",
  }),
  contrastContext({
    id: "shopping-carousel-default", pageId: "shopping", label: "상품 이동 버튼", selector: "#preview-panel-shopping .shopping-carousel-control.next",
    foregroundKey: "titleText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFE6"], imageStates: mainImage, kind: "ui-component",
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
    id: "shopping-product-badge", pageId: "shopping", label: "상품 배지", selector: "#preview-panel-shopping .shop-badge",
    foreground: "#FFE936", backgroundLayers: ["#FFFFFF", "#222222BD"], imageStates: productImages,
    guarantee: "worst-case-backing", protectedImageKeys: Object.keys(productImages), backingSelector: ".shop-badge",
    evidence: "worst-case white raster + fixed 74% #222 badge backing",
  }),
  contrastContext({
    id: "shopping-product-title", pageId: "shopping", label: "상품 제목", selector: "#preview-panel-shopping .shop-card-content strong",
    foreground: "#FFFFFF", backgroundLayers: ["#FFFFFF", "#000000B8"], imageStates: productImages,
    guarantee: "worst-case-scrim", protectedImageKeys: Object.keys(productImages), backingSelector: ".shop-card-content",
    evidence: "worst-case white raster + fixed 72% black scrim backing",
  }),
  contrastContext({
    id: "shopping-product-price", pageId: "shopping", label: "상품 가격", selector: "#preview-panel-shopping .shop-price",
    foreground: "#FFFFFF", backgroundLayers: ["#FFFFFF", "#000000B8"], imageStates: productImages,
    guarantee: "worst-case-scrim", protectedImageKeys: Object.keys(productImages), backingSelector: ".shop-card-content",
    evidence: "worst-case white raster + fixed 72% black scrim backing",
  }),
  contrastContext({
    id: "shopping-tab-icons-default", pageId: "shopping", label: "선택되지 않은 하단 탭 아이콘", selector: "#preview-panel-shopping .bottom-tabs .preview-mock-control:not(.is-selected) .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabFriendIcon", "tabChatIcon", "tabOpenChatIcon", "tabMoreIcon"),
    kind: "image", evidence: "수동 이미지 검사 대상: bundled normal PNG와 tab/main raster surface",
  }),
  contrastContext({
    id: "shopping-tab-icon-selected", pageId: "shopping", label: "선택된 쇼핑 탭 아이콘", selector: "#preview-panel-shopping .tab-shopping.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabShoppingIconSelected"),
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "more-status", pageId: "more", label: "더보기 상태 표시줄", selector: "#preview-panel-more .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "상태 표시줄의 고정 흰 surface",
  }),
  contrastContext({
    id: "more-header-title", pageId: "more", label: "더보기 헤더", selector: "#preview-panel-more .chat-list-header > strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageKeys: ["mainBackground"], imageState: "cleared",
    evidence: "초기 mainBackground 이미지는 cleared",
  }),
  contrastContext({
    id: "more-header-actions", pageId: "more", label: "더보기 헤더 아이콘", selector: "#preview-panel-more .chat-list-actions :is(.friend-action-icon, .scan-action-icon)",
    foregroundKey: "headerText", backgroundKey: "mainBackground", imageStates: headerImages("headerSearch", "headerScan", "headerSettings"),
    kind: "ui-component", guarantee: "css-currentcolor-mask", protectedImageKeys: ["headerSearch", "headerScan", "headerSettings"],
    foregroundProperty: "background-color", backgroundSource: "parent",
    evidence: "bundled raster 마스크와 CSS currentColor 전경",
  }),
  contrastContext({
    id: "more-segment-default", pageId: "more", label: "더보기 필터 기본", selector: "#preview-panel-more .more-segment:not(.is-active)",
    foregroundKey: "titleText", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "투명 필터 위 cleared main surface",
  }),
  contrastContext({
    id: "more-segment-selected", pageId: "more", label: "더보기 필터 선택", selector: "#preview-panel-more .more-segment.is-active",
    foregroundKey: "titlePressed", backgroundKey: "bodyPressed", state: "selected", evidence: "선택 텍스트/배경 토큰 쌍",
  }),
  contrastContext({
    id: "more-service-icon", pageId: "more", label: "더보기 서비스 아이콘", selector: "#preview-panel-more .more-service-icon",
    foregroundKey: "headerText", background: "#FFE7E7", imageStates: mainImage, kind: "ui-component", guarantee: "opaque-backing",
    protectedImageKeys: ["mainBackground"], foregroundProperty: "border-top-color", backgroundSource: "parent", backingSelector: ".more-service-panel",
    evidence: "main raster 위 불투명 service panel과 headerText 경계",
  }),
  contrastContext({
    id: "more-service-title", pageId: "more", label: "더보기 서비스 이름", selector: "#preview-panel-more .more-service-item strong",
    foregroundKey: "titleText", background: "#FFE7E7", imageStates: mainImage, guarantee: "opaque-backing",
    protectedImageKeys: ["mainBackground"], backingSelector: ".more-service-panel",
    evidence: "main raster를 차단하는 불투명 mainBackground 72% + white color-mix",
  }),
  contrastContext({
    id: "more-page-dot-default", pageId: "more", label: "더보기 기본 페이지 점", selector: "#preview-panel-more .more-page-dots span:not(.active)",
    foregroundKey: "headerText", foregroundOpacity: 0.65, background: "#FFE7E7", imageStates: mainImage, kind: "ui-component",
    guarantee: "opaque-backing", protectedImageKeys: ["mainBackground"], foregroundProperty: "background-color",
    backgroundSource: "parent", backingSelector: ".more-service-panel",
    evidence: "불투명 service panel 위 65% headerText 페이지 상태",
  }),
  contrastContext({
    id: "more-page-dot-selected", pageId: "more", label: "더보기 선택 페이지 점", selector: "#preview-panel-more .more-page-dots span.active",
    foregroundKey: "headerText", background: "#FFE7E7", imageStates: mainImage, kind: "ui-component",
    guarantee: "opaque-backing", protectedImageKeys: ["mainBackground"], foregroundProperty: "background-color",
    backgroundSource: "parent", backingSelector: ".more-service-panel",
    state: "selected", evidence: "불투명 service panel 위 headerText 선택 상태",
  }),
  contrastContext({
    id: "more-ad-title", pageId: "more", label: "광고 제목", selector: "#preview-panel-more .more-ad-art strong",
    foreground: "#23406D", backgroundLayers: ["#000000", "#FFFFFFBD"], imageKeys: ["readingLogAd"], imageState: "bundled",
    guarantee: "worst-case-scrim", protectedImageKeys: ["readingLogAd"], backingSelector: ".more-ad-art strong",
    evidence: "worst-case black raster + fixed 74% white scrim backing",
  }),
  contrastContext({
    id: "more-ad-description", pageId: "more", label: "광고 설명", selector: "#preview-panel-more .more-ad-art span:not(.ad-mark)",
    foreground: "#23406D", backgroundLayers: ["#000000", "#FFFFFFB3"], imageKeys: ["readingLogAd"], imageState: "bundled",
    guarantee: "worst-case-scrim", protectedImageKeys: ["readingLogAd"], backingSelector: ".more-ad-art span",
    evidence: "worst-case black raster + fixed 70% white scrim backing",
  }),
  contrastContext({
    id: "more-ad-mark", pageId: "more", label: "광고 표시", selector: "#preview-panel-more .ad-mark",
    foreground: "#687078", background: "#FFFFFF", imageKeys: ["readingLogAd"], imageState: "bundled",
    guarantee: "opaque-backing", protectedImageKeys: ["readingLogAd"], backingSelector: ".ad-mark",
    evidence: "번들 광고 이미지와 분리된 opaque white backing",
  }),
  contrastContext({
    id: "more-ad-footer-title", pageId: "more", label: "광고 푸터 제목", selector: "#preview-panel-more .more-ad-footer strong",
    foregroundKey: "titleText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFE6"], imageStates: mainImage,
    evidence: "main raster 위 90% 흰 광고 카드 푸터",
  }),
  contrastContext({
    id: "more-ad-footer-link", pageId: "more", label: "광고 다운로드 링크", selector: "#preview-panel-more .more-ad-footer a",
    foregroundKey: "titleText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFE6"], imageStates: mainImage,
    evidence: "main raster 위 90% 흰 광고 카드 링크",
  }),
  contrastContext({
    id: "more-section", pageId: "more", label: "더보기 섹션 제목", selector: "#preview-panel-more .more-section-heading",
    foregroundKey: "sectionTitle", backgroundKey: "mainBackground", imageStates: mainImage, evidence: "섹션 제목 토큰과 cleared 메인 단색",
  }),
  contrastContext({
    id: "more-tab-icons-default", pageId: "more", label: "선택되지 않은 하단 탭 아이콘", selector: "#preview-panel-more .bottom-tabs .preview-mock-control:not(.is-selected) .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabFriendIcon", "tabChatIcon", "tabOpenChatIcon", "tabShoppingIcon"),
    kind: "image", evidence: "수동 이미지 검사 대상: bundled normal PNG와 tab/main raster surface",
  }),
  contrastContext({
    id: "more-tab-icon-selected", pageId: "more", label: "선택된 더보기 탭 아이콘", selector: "#preview-panel-more .tab-more.is-selected .tab-icon",
    foreground: "#000000", backgroundKey: "tabBackground", imageStates: tabImages("tabMoreIconSelected"),
    state: "selected", kind: "image", evidence: "수동 이미지 검사 대상: 번들 PNG가 전경 자체임",
  }),

  contrastContext({
    id: "chat-status", pageId: "chat", label: "채팅방 상태 표시줄", selector: "#preview-panel-chat .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "상태 표시줄의 고정 흰 surface",
  }),
  contrastContext({
    id: "chat-header-title", pageId: "chat", label: "채팅방 헤더", selector: "#preview-panel-chat .phone-header strong",
    foregroundKey: "headerText", backgroundKey: "mainBackground", evidence: "헤더는 이미지 없이 메인 단색 사용",
  }),
  contrastContext({
    id: "chat-header-actions", pageId: "chat", label: "채팅방 헤더 작업", selector: "#preview-panel-chat .phone-header > .preview-mock-control",
    foregroundKey: "headerText", backgroundKey: "mainBackground", kind: "ui-component", evidence: "헤더의 뒤로/메뉴 currentColor UI",
  }),
  contrastContext({
    id: "chat-date", pageId: "chat", label: "채팅 날짜", selector: "#preview-panel-chat .date-chip",
    foreground: "#FFFFFF", backgroundLayers: ["#FFFFFF", "#0000008C"], imageStates: chatImage,
    guarantee: "worst-case-scrim", protectedImageKeys: ["chatBackground"], backingSelector: ".date-chip",
    evidence: "모든 chat raster에서 최악 흰색을 기준으로 한 55% 검정 scrim 칩",
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
    id: "chat-send-bubble-normal", pageId: "chat", label: "보낸 기본 말풍선", selector: "#preview-panel-chat .send-bubble:not(.additional-bubble)",
    foregroundKey: "sendText", backgroundLayers: ["#FFFFFF", "#000000B8"], imageStates: { chatBackground: "cleared", sendBubbleNormal: "bundled" },
    guarantee: "worst-case-scrim", protectedImageKeys: ["chatBackground", "sendBubbleNormal"], backingPseudo: "::before",
    evidence: "worst-case white raster + fixed 72% black CSS backing",
  }),
  contrastContext({
    id: "chat-send-bubble-additional", pageId: "chat", label: "보낸 추가 말풍선", selector: "#preview-panel-chat .send-bubble.additional-bubble",
    foregroundKey: "sendText", backgroundLayers: ["#FFFFFF", "#000000B8"], imageStates: { chatBackground: "cleared", sendBubbleTailless: "bundled" },
    guarantee: "worst-case-scrim", protectedImageKeys: ["chatBackground", "sendBubbleTailless"], backingPseudo: "::before",
    evidence: "tailless raster 위 fixed 72% black CSS backing",
  }),
  contrastContext({
    id: "chat-receive-bubble-normal", pageId: "chat", label: "받은 기본 말풍선", selector: "#preview-panel-chat .receive-bubble:not(.additional-bubble):not(.typing-bubble)",
    foregroundKey: "receiveText", background: "#F8F8F8", imageStates: { chatBackground: "cleared", receiveBubbleNormal: "bundled" },
    guarantee: "opaque-backing", protectedImageKeys: ["chatBackground", "receiveBubbleNormal"], backingPseudo: "::before",
    evidence: "번들 raster 위 불투명 CSS backing",
  }),
  contrastContext({
    id: "chat-receive-bubble-additional", pageId: "chat", label: "받은 추가 말풍선", selector: "#preview-panel-chat .receive-bubble.additional-bubble",
    foregroundKey: "receiveText", background: "#F8F8F8", imageStates: { chatBackground: "cleared", receiveBubbleTailless: "bundled" },
    guarantee: "opaque-backing", protectedImageKeys: ["chatBackground", "receiveBubbleTailless"], backingPseudo: "::before",
    evidence: "tailless raster 위 불투명 CSS backing",
  }),
  contrastContext({
    id: "chat-receive-bubble-typing", pageId: "chat", label: "입력 중 말풍선", selector: "#preview-panel-chat .receive-bubble.typing-bubble",
    foregroundKey: "receiveText", background: "#F8F8F8", imageStates: { chatBackground: "cleared", receiveBubbleNormal: "bundled" },
    guarantee: "opaque-backing", protectedImageKeys: ["chatBackground", "receiveBubbleNormal"], backingPseudo: "::before",
    evidence: "입력 중 bundled raster 위 불투명 CSS backing",
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
    id: "bubble-detail-status", pageId: "bubble-detail", label: "말풍선 상세 상태 표시줄", selector: "#preview-panel-bubble-detail .phone-status",
    foreground: "#3C4148", backgroundKey: "mainBackground", evidence: "상세 article의 chat 단색 surface이며 raster는 screen 내부에만 적용",
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
    id: "bubble-detail-editor-crop", pageId: "bubble-detail", label: "편집 이미지 자르기 경계", selector: "#preview-panel-bubble-detail .nine-patch-crop",
    foreground: "#201B1BB8", backgroundKey: "mainBackground", imageStates: { chatBackground: "cleared", sendBubbleNormal: "bundled" },
    kind: "ui-component", foregroundProperty: "border-top-color", evidence: "bundled 편집 raster 위 경계이므로 수동 이미지 검사 대상",
  }),
  contrastContext({
    id: "bubble-detail-stretch-guide", pageId: "bubble-detail", label: "늘림 범위 가이드", selector: "#preview-panel-bubble-detail .nine-patch-guide.stretch-x",
    foreground: "#27B169F0", backgroundKey: "mainBackground", imageStates: { chatBackground: "cleared", sendBubbleNormal: "bundled" },
    kind: "ui-component", foregroundProperty: "border-left-color", evidence: "bundled 편집 raster 위 dashed guide이므로 수동 이미지 검사 대상",
  }),
  contrastContext({
    id: "bubble-detail-padding-guide", pageId: "bubble-detail", label: "내용 범위 가이드", selector: "#preview-panel-bubble-detail .nine-patch-guide.padding-x",
    foreground: "#5F52DAD1", backgroundKey: "mainBackground", imageStates: { chatBackground: "cleared", sendBubbleNormal: "bundled" },
    kind: "ui-component", foregroundProperty: "border-left-color", evidence: "bundled 편집 raster 위 solid guide이므로 수동 이미지 검사 대상",
  }),
  contrastContext({
    id: "bubble-detail-fit-legend", pageId: "bubble-detail", label: "말풍선 배치 범례", selector: "#preview-panel-bubble-detail .nine-patch-fit-control legend",
    foregroundKey: "descriptionText", backgroundKey: "mainBackground", imageStates: chatImage, evidence: "불투명 descriptionText와 cleared chat surface",
  }),
  contrastContext({
    id: "bubble-detail-fit-default", pageId: "bubble-detail", label: "선택되지 않은 배치 방식", selector: "#preview-panel-bubble-detail .nine-patch-fit-option input:not(:checked) + label",
    foregroundKey: "titleText", backgroundLayers: [{ colorKey: "mainBackground" }, "#FFFFFFAD"], imageStates: chatImage,
    evidence: "chat surface 위 68% 흰 라디오 label",
  }),
  contrastContext({
    id: "bubble-detail-fit-selected", pageId: "bubble-detail", label: "선택된 맞춤 방식", selector: "#preview-panel-bubble-detail .nine-patch-fit-option input:checked + label",
    foregroundKey: "sendButtonText", backgroundKey: "sendButton", state: "selected", evidence: "선택 라디오가 전송 버튼 토큰 쌍을 사용",
  }),
  contrastContext({
    id: "bubble-detail-control-legend", pageId: "bubble-detail", label: "말풍선 범위 범례", selector: "#preview-panel-bubble-detail .nine-patch-control legend",
    foregroundKey: "descriptionText", backgroundKey: "mainBackground", imageStates: chatImage, evidence: "가로/세로 늘림과 내용 범위의 실제 visible legend",
  }),
  contrastContext({
    id: "bubble-detail-control-value", pageId: "bubble-detail", label: "말풍선 범위 값", selector: "#preview-panel-bubble-detail [data-nine-patch-value]",
    foregroundKey: "titleText", backgroundKey: "mainBackground", imageStates: chatImage, evidence: "range 옆 실제 visible 숫자 값",
  }),

  contrastContext({
    id: "passcode-status", pageId: "passcode", label: "잠금화면 상태 표시줄", selector: "#preview-panel-passcode .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "passcode image는 screen에만 적용되고 status surface는 흰색",
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
    id: "passcode-cancel", pageId: "passcode", label: "암호 입력 취소", selector: "#preview-panel-passcode .passcode-cancel",
    foregroundKey: "passcodeKeypadText", backgroundKey: "mainBackground", imageStates: { passcodeBackgroundImage: "cleared" },
    evidence: "투명 취소 버튼과 실제 passcode screen surface",
  }),
  contrastContext({
    id: "passcode-delete", pageId: "passcode", label: "암호 한 자리 지우기", selector: "#preview-panel-passcode .passcode-delete",
    foregroundKey: "passcodeKeypadText", backgroundKey: "mainBackground", imageStates: { passcodeBackgroundImage: "cleared" },
    evidence: "투명 삭제 버튼과 실제 passcode screen surface",
  }),
  contrastContext({
    id: "passcode-dot-default", pageId: "passcode", label: "암호 빈 점", selector: "#preview-panel-passcode .passcode-dot:not(.is-selected)",
    foreground: "#000000", backgroundKey: "mainBackground", imageStates: { passcodeBackgroundImage: "cleared", passcodeDot: "bundled", passcodeDot2: "bundled", passcodeDot3: "bundled", passcodeDot4: "bundled" },
    kind: "image", evidence: "수동 이미지 검사 대상: 번들 점 PNG가 전경 자체임",
  }),
  contrastContext({
    id: "passcode-dot-selected", pageId: "passcode", label: "암호 입력 점", selector: "#preview-panel-passcode .passcode-dot.is-selected",
    foreground: "#000000", backgroundKey: "mainBackground", imageStates: { passcodeBackgroundImage: "cleared", passcodeDotSelected: "bundled", passcodeDotSelected2: "bundled", passcodeDotSelected3: "bundled", passcodeDotSelected4: "bundled" },
    state: "selected", activation: "passcode-digit", kind: "image", evidence: "수동 이미지 검사 대상: 실제 입력 후 선택 번들 점 PNG",
  }),

  contrastContext({
    id: "splash-status", pageId: "splash", label: "로딩 화면 상태 표시줄", selector: "#preview-panel-splash .phone-status",
    foreground: "#3C4148", backgroundKey: "mainBackground", imageKeys: ["splashImage"], imageState: "cleared",
    evidence: "초기 splashImage는 cleared",
  }),
  contrastContext({
    id: "splash-theme-icon", pageId: "splash", label: "로딩 테마 아이콘", selector: "#preview-panel-splash .splash-icon",
    foreground: "#000000", backgroundKey: "mainBackground", imageStates: { splashImage: "cleared", themeIcon: "bundled" }, kind: "image",
    evidence: "수동 이미지 검사 대상: 번들 테마 아이콘이 전경 자체임",
  }),

  contrastContext({
    id: "theme-list-status", pageId: "theme-list", label: "테마 목록 상태 표시줄", selector: "#preview-panel-theme-list .phone-status",
    foreground: "#3C4148", background: "#FFFFFF", evidence: "상태 표시줄의 고정 흰 surface",
  }),
  contrastContext({
    id: "theme-list-back", pageId: "theme-list", label: "테마 목록 뒤로가기", selector: "#preview-panel-theme-list .theme-list-header > .preview-mock-control:first-child",
    foregroundKey: "headerText", background: "#FFFFFF", kind: "ui-component", evidence: "SVG mask가 상속하는 headerText currentColor",
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
    id: "theme-list-title-default", pageId: "theme-list", label: "기본 테마 이름", selector: "#preview-panel-theme-list .theme-list-row:not(.active-theme-row) .theme-list-copy strong",
    foreground: "#202124", background: "#FFFFFF", evidence: "불투명 정적 전경/배경",
  }),
  contrastContext({
    id: "theme-list-secondary-default", pageId: "theme-list", label: "기본 테마 설명", selector: "#preview-panel-theme-list .theme-list-row:not(.active-theme-row) .theme-list-copy > span",
    foreground: "#687078", background: "#FFFFFF", evidence: "불투명 정적 보조 전경",
  }),
  contrastContext({
    id: "theme-list-title-selected", pageId: "theme-list", label: "선택된 테마 이름", selector: "#preview-panel-theme-list .active-theme-row .theme-list-copy strong",
    foreground: "#202124", background: "#F9F3F4", state: "selected", evidence: "기본 sectionTitle 6%와 흰색의 불투명 선택 배경",
  }),
  contrastContext({
    id: "theme-list-secondary-selected", pageId: "theme-list", label: "선택된 테마 설명", selector: "#preview-panel-theme-list .active-theme-row .theme-list-copy > span",
    foreground: "#687078", background: "#F9F3F4", state: "selected", evidence: "선택 배경에서도 4.5 이상인 불투명 보조 전경",
  }),
  contrastContext({
    id: "theme-list-choice-default", pageId: "theme-list", label: "선택되지 않은 테마 표시", selector: "#preview-panel-theme-list .theme-choice:not(.selected)",
    foreground: "#687078", background: "#FFFFFF", kind: "ui-component", foregroundProperty: "border-top-color",
    evidence: "선택되지 않은 원 테두리와 흰 배경",
  }),
  contrastContext({
    id: "theme-list-choice-selected", pageId: "theme-list", label: "선택 표시", selector: "#preview-panel-theme-list .theme-choice.selected",
    foregroundKey: "sectionTitle", background: "#F9F3F4", state: "selected", kind: "ui-component", foregroundProperty: "border-top-color",
    evidence: "선택 원 테두리는 sectionTitle 토큰을 사용",
  }),
  contrastContext({
    id: "theme-list-download", pageId: "theme-list", label: "공식 테마 다운로드", selector: "#preview-panel-theme-list .theme-download",
    foreground: "#3C4148", background: "#FFFFFF", kind: "ui-component", evidence: "다운로드 화살표와 흰 row 배경",
  }),
  contrastContext({
    id: "theme-list-user-icon", pageId: "theme-list", label: "사용자 테마 아이콘", selector: "#preview-panel-theme-list .active-theme-row .theme-icon",
    foreground: "#000000", background: "#F9F3F4", imageStates: { themeIcon: "bundled" }, kind: "image",
    evidence: "수동 이미지 검사 대상: 실제 bundled themeIcon PNG",
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
 * @param {{ imageStates?: Record<string, "cleared" | "bundled" | "user"> }} [options]
 * @returns {ContrastEvaluation}
 */
export function evaluateContrastContext(context, colors, options = {}) {
  const unknown = { status: "unknown", ratio: null, required: context?.required ?? 4.5 };
  if (!context || typeof context !== "object") {
    return unknown;
  }

  const protectedImageKeys = new Set(context.protectedImageKeys ?? []);
  const hasUnresolvedRaster = (context.imageKeys ?? []).some((key) => {
    const state = options.imageStates?.[key] ?? context.imageStates?.[key] ?? context.imageState;
    return ["bundled", "user"].includes(state) && !protectedImageKeys.has(key);
  });
  if (context.kind === "image" || hasUnresolvedRaster) {
    return unknown;
  }

  let foreground = context.foregroundKey
    ? parseThemeArgb(colors?.[context.foregroundKey])
    : parseContextStaticColor(context.foreground);
  if (foreground && context.foregroundOpacity !== undefined) {
    if (
      typeof context.foregroundOpacity !== "number" ||
      !Number.isFinite(context.foregroundOpacity) ||
      context.foregroundOpacity < 0 ||
      context.foregroundOpacity > 1
    ) {
      return unknown;
    }
    foreground = { ...foreground, a: foreground.a * context.foregroundOpacity };
  }
  const background = resolveContextBackground(context, colors);
  return evaluateContrastPair(foreground, background, context.required);
}

function getContextColorKeys(context) {
  const keys = [];
  const addKey = (key) => {
    if (typeof key === "string" && !keys.includes(key)) {
      keys.push(key);
    }
  };

  addKey(context.foregroundKey);
  addKey(context.backgroundKey);
  for (const layer of context.backgroundLayers ?? []) {
    addKey(layer?.colorKey);
  }

  return keys;
}

function getEffectiveImageStates(context, imageStates) {
  return Object.fromEntries((context.imageKeys ?? []).map((key) => [
    key,
    imageStates?.[key] ?? context.imageStates?.[key] ?? context.imageState,
  ]));
}

function summarizeContrastResults(results) {
  const passCount = results.filter(({ status }) => status === "pass").length;
  const failCount = results.filter(({ status }) => status === "fail").length;
  const unknownCount = results.filter(({ status }) => status === "unknown").length;
  const numericRatios = results.flatMap(({ ratio }) => ratio === null ? [] : [ratio]);

  return {
    total: results.length,
    passCount,
    failCount,
    unknownCount,
    worst: numericRatios.length ? Math.min(...numericRatios) : null,
  };
}

/**
 * Evaluates an entire theme against the existing preview ledger without DOM
 * access. Results, page summaries, and dependency indexes follow PREVIEW_PAGES
 * order. Ratios remain unrounded so display formatting cannot affect AA gates.
 *
 * @param {object} input
 * @param {Record<string, string>} input.colors
 * @param {Record<string, "cleared" | "bundled" | "user">} [input.imageStates]
 * @param {ReadonlyArray<object>} [input.contexts]
 */
export function evaluateThemeContrast({
  colors = {},
  imageStates = {},
  contexts = CONTRAST_CONTEXTS,
} = {}) {
  const pageOrder = new Map(PREVIEW_PAGES.map(({ id }, index) => [id, index]));
  const orderedContexts = contexts
    .map((context, sourceIndex) => ({ context, sourceIndex }))
    .sort((left, right) => {
      const leftPage = pageOrder.get(left.context.pageId) ?? Number.MAX_SAFE_INTEGER;
      const rightPage = pageOrder.get(right.context.pageId) ?? Number.MAX_SAFE_INTEGER;
      return leftPage - rightPage || left.sourceIndex - right.sourceIndex;
    })
    .map(({ context }) => context);

  const results = orderedContexts.map((context) => {
    const evaluation = evaluateContrastContext(context, colors, { imageStates });
    return {
      ...context,
      imageKeys: [...(context.imageKeys ?? [])],
      protectedImageKeys: [...(context.protectedImageKeys ?? [])],
      colorKeys: getContextColorKeys(context),
      effectiveImageStates: getEffectiveImageStates(context, imageStates),
      ...evaluation,
    };
  });

  const byPage = {};
  for (const page of PREVIEW_PAGES) {
    const pageResults = results.filter(({ pageId }) => pageId === page.id);
    const pageSummary = summarizeContrastResults(pageResults);
    byPage[page.id] = {
      pageId: page.id,
      label: page.label,
      results: pageResults,
      ...pageSummary,
      status: pageSummary.failCount > 0
        ? "fail"
        : pageSummary.unknownCount > 0
          ? "unknown"
          : "pass",
    };
  }

  const byColor = {};
  for (const result of results) {
    for (const colorKey of result.colorKeys) {
      (byColor[colorKey] ??= []).push(result);
    }
  }

  const summary = summarizeContrastResults(results);
  const failedPageIds = PREVIEW_PAGES
    .filter(({ id }) => byPage[id].failCount > 0)
    .map(({ id }) => id);
  const unknownPageIds = PREVIEW_PAGES
    .filter(({ id }) => byPage[id].unknownCount > 0)
    .map(({ id }) => id);
  summary.failedPageIds = failedPageIds;
  summary.unknownPageIds = unknownPageIds;

  return {
    results,
    byPage,
    byColor,
    summary,
    failedPageIds,
    unknownPageIds,
  };
}
