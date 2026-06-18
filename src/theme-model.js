const IOS_COLOR_BINDINGS = [
  ["HeaderStyle-Main", "-ios-text-color", "headerText"],
  ["HeaderStyle-Main", "-ios-tab-text-color", "descriptionText"],
  ["HeaderStyle-Main", "-ios-tab-highlighted-text-color", "headerText"],
  ["MainViewStyle-Primary", "background-color", "mainBackground"],
  ["MainViewStyle-Primary", "-ios-text-color", "titleText"],
  ["MainViewStyle-Primary", "-ios-highlighted-text-color", "titlePressed"],
  ["MainViewStyle-Primary", "-ios-description-text-color", "descriptionText"],
  ["MainViewStyle-Primary", "-ios-description-highlighted-text-color", "titlePressed"],
  ["MainViewStyle-Primary", "-ios-paragraph-text-color", "paragraphText"],
  ["MainViewStyle-Primary", "-ios-paragraph-highlighted-text-color", "titlePressed"],
  ["MainViewStyle-Primary", "-ios-selected-background-color", "bodyPressed"],
  ["MainViewStyle-Secondary", "background-color", "mainBackground"],
  ["SectionTitleStyle-Main", "border-color", "sectionTitle"],
  ["SectionTitleStyle-Main", "-ios-text-color", "sectionTitle"],
  ["FeatureStyle-Primary", "-ios-text-color", "featureText"],
  ["BackgroundStyle-ChatRoom", "background-color", "chatBackground"],
  ["InputBarStyle-Chat", "background-color", "inputBarBackground"],
  ["InputBarStyle-Chat", "-ios-send-normal-background-color", "sendButton"],
  ["InputBarStyle-Chat", "-ios-send-normal-foreground-color", "sendButtonText"],
  ["InputBarStyle-Chat", "-ios-send-highlighted-background-color", "sendButtonPressed"],
  ["InputBarStyle-Chat", "-ios-button-normal-foreground-color", "inputMenu"],
  ["InputBarStyle-Chat", "-ios-button-text-color", "inputBarText"],
  ["MessageCellStyle-Send", "-ios-text-color", "sendText"],
  ["MessageCellStyle-Send", "-ios-selected-text-color", "sendText"],
  ["MessageCellStyle-Send", "-ios-unread-text-color", "unreadCount"],
  ["MessageCellStyle-Receive", "-ios-text-color", "receiveText"],
  ["MessageCellStyle-Receive", "-ios-selected-text-color", "receiveText"],
  ["MessageCellStyle-Receive", "-ios-unread-text-color", "unreadCount"],
  ["BackgroundStyle-Passcode", "background-color", "passcodeBackground"],
  ["LabelStyle-PasscodeTitle", "-ios-text-color", "passcodeText"],
  ["PasscodeStyle", "-ios-keypad-background-color", "passcodeKeypadBackground"],
  ["PasscodeStyle", "-ios-keypad-text-normal-color", "passcodeText"],
  ["BackgroundStyle-MessageNotificationBar", "background-color", "notificationBackground"],
  ["LabelStyle-MessageNotificationBarName", "-ios-text-color", "notificationText"],
  ["LabelStyle-MessageNotificationBarMessage", "-ios-text-color", "paragraphText"],
  ["BackgroundStyle-DirectShareBar", "background-color", "directShareBackground"],
];

const ANDROID_COLOR_BINDINGS = {
  theme_header_color: "headerText",
  theme_section_title_color: "sectionTitle",
  theme_title_color: "titleText",
  theme_title_pressed_color: "titlePressed",
  theme_paragraph_color: "paragraphText",
  theme_paragraph_pressed_color: "titlePressed",
  theme_description_color: "descriptionText",
  theme_description_pressed_color: "titlePressed",
  theme_feature_primary_color: "featureText",
  theme_feature_primary_pressed_color: "titlePressed",
  theme_feature_browse_tab_color: "descriptionText",
  theme_feature_browse_tab_focused_color: "headerText",
  theme_background_color: "mainBackground",
  theme_chatroom_background_color: "chatBackground",
  theme_passcode_background_color: "passcodeBackground",
  theme_header_cell_color: "mainBackground",
  theme_body_cell_pressed_color: "bodyPressed",
  theme_body_cell_border_color: "bodyBorder",
  theme_body_secondary_cell_color: "mainBackground",
  theme_tab_lightbannerbadge_background_color: "headerText",
  theme_tab_bannerbadge_background_color: "headerText",
  theme_direct_share_color: "headerText",
  theme_direct_share_button_color: "inputMenu",
  theme_direct_share_background_color: "directShareBackground",
  theme_notification_color: "notificationText",
  theme_notification_background_color: "notificationBackground",
  theme_notification_background_pressed_color: "bodyPressed",
  theme_passcode_color: "passcodeText",
  theme_passcode_keypad_color: "passcodeText",
  theme_passcode_keypad_pressed_color: "passcodeKeypadPressed",
  theme_passcode_keypad_background_color: "passcodeKeypadBackground",
  theme_passcode_keypad_pressed_background_color: "passcodeKeypadPressedBackground",
  theme_passcode_pattern_line_color: "notificationBackground",
  theme_chatroom_bubble_me_color: "sendText",
  theme_chatroom_bubble_you_color: "receiveText",
  theme_chatroom_unread_count_color: "unreadCount",
  theme_chatroom_input_bar_color: "inputBarText",
  theme_chatroom_input_bar_background_color: "inputBarBackground",
  theme_chatroom_input_bar_menu_icon_color: "inputMenu",
  theme_chatroom_input_bar_menu_button_color: "inputMenuButton",
  theme_chatroom_input_bar_send_icon_color: "sendButtonText",
  theme_chatroom_input_bar_send_button_color: "sendButton",
};

const defaultColors = {
  mainBackground: "#FFDEDE",
  chatBackground: "#FFDEDE",
  headerText: "#664242",
  titleText: "#664242",
  titlePressed: "#B06B6B",
  descriptionText: "#805959",
  paragraphText: "#805959",
  sectionTitle: "#F66C6C",
  featureText: "#805959",
  bodyPressed: "#FFB3B3",
  bodyBorder: "#26664242",
  sendText: "#FFFFFF",
  receiveText: "#4D4D4D",
  unreadCount: "#FF7F7F",
  inputBarBackground: "#FFFFFF",
  inputBarText: "#191919",
  inputMenu: "#E86464",
  inputMenuButton: "#0A000000",
  sendButton: "#FF7F7F",
  sendButtonPressed: "#F27979",
  sendButtonText: "#FFFFFF",
  passcodeBackground: "#FCC5C5",
  passcodeText: "#664242",
  passcodeKeypadBackground: "#FFF2F2",
  passcodeKeypadPressed: "#CCB8B8",
  passcodeKeypadPressedBackground: "#99FFDEDE",
  notificationBackground: "#FCC5C5",
  notificationText: "#604242",
  directShareBackground: "#FFFFFF",
};

export const defaultThemeState = {
  appName: "My Kakao Theme",
  baseAuthorName: "reha",
  additionalAuthorName: "",
  themeIdSegment: "example",
  version: "1.0.0",
  colors: defaultColors,
};

export const IMAGE_TARGETS = {
  mainBackground: {
    label: "메인 배경",
    ios: ["Images/mainBgImage@3x.png"],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_background_image.png",
      "src/main/theme/drawable-sw600dp/theme_background_image.png",
    ],
  },
  chatBackground: {
    label: "채팅방 배경",
    ios: ["Images/chatroomBgImage@3x.png"],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_chatroom_background_image.png",
      "src/main/theme/drawable-sw600dp/theme_chatroom_background_image.png",
    ],
  },
  tabBackground: {
    label: "탭 배경",
    ios: ["Images/maintabBgImage@2x.png", "Images/maintabBgImage@3x.png"],
    android: ["src/main/theme/drawable-xxhdpi/theme_maintab_cell_image.9.png"],
    androidRequiresNinePatch: true,
  },
  tabFriendIcon: {
    label: "친구 탭 아이콘",
    ios: [
      "Images/maintabIcoFriends@2x.png",
      "Images/maintabIcoFriends@3x.png",
      "Images/maintabIcoFriendsSelected@2x.png",
      "Images/maintabIcoFriendsSelected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_friends_image.png",
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_friends_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_friends_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_friends_focused_image.png",
    ],
  },
  tabChatIcon: {
    label: "대화 탭 아이콘",
    ios: [
      "Images/maintabIcoChats@2x.png",
      "Images/maintabIcoChats@3x.png",
      "Images/maintabIcoChatsSelected@2x.png",
      "Images/maintabIcoChatsSelected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_image.png",
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_chats_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_chats_focused_image.png",
    ],
  },
  tabOpenChatIcon: {
    label: "오픈채팅 탭 아이콘",
    ios: [
      "Images/maintabIcoNow@2x.png",
      "Images/maintabIcoNow@3x.png",
      "Images/maintabIcoNowSelected@2x.png",
      "Images/maintabIcoNowSelected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_image.png",
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_now_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_now_focused_image.png",
    ],
  },
  tabShoppingIcon: {
    label: "쇼핑 탭 아이콘",
    ios: [
      "Images/maintabIcoShopping@2x.png",
      "Images/maintabIcoShopping@3x.png",
      "Images/maintabIcoShoppingSelected@2x.png",
      "Images/maintabIcoShoppingSelected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_shopping_image.png",
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_shopping_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_shopping_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_shopping_focused_image.png",
    ],
  },
  tabMoreIcon: {
    label: "더보기 탭 아이콘",
    ios: [
      "Images/maintabIcoMore@2x.png",
      "Images/maintabIcoMore@3x.png",
      "Images/maintabIcoMoreSelected@2x.png",
      "Images/maintabIcoMoreSelected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_more_image.png",
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_more_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_more_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_more_focused_image.png",
    ],
  },
  profileImage: {
    label: "기본 프로필",
    ios: ["Images/profileImg01@3x.png"],
    android: ["src/main/theme/drawable-xxhdpi/theme_profile_01_image.png"],
  },
  themeIcon: {
    label: "테마 아이콘",
    ios: ["Images/commonIcoTheme.png"],
    android: [
      "src/main/res/mipmap-mdpi/ic_launcher.png",
      "src/main/res/mipmap-hdpi/ic_launcher.png",
      "src/main/res/mipmap-xhdpi/ic_launcher.png",
      "src/main/res/mipmap-xxhdpi/ic_launcher.png",
      "src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    ],
  },
  sendBubble: {
    label: "보낸 말풍선",
    ios: [
      "Images/chatroomBubbleSend01@2x.png",
      "Images/chatroomBubbleSend01@3x.png",
      "Images/chatroomBubbleSend01Selected@2x.png",
      "Images/chatroomBubbleSend01Selected@3x.png",
      "Images/chatroomBubbleSend02@2x.png",
      "Images/chatroomBubbleSend02@3x.png",
      "Images/chatroomBubbleSend02Selected@2x.png",
      "Images/chatroomBubbleSend02Selected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_01_image.9.png",
      "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_02_image.9.png",
    ],
    androidRequiresNinePatch: true,
  },
  receiveBubble: {
    label: "받은 말풍선",
    ios: [
      "Images/chatroomBubbleReceive01@2x.png",
      "Images/chatroomBubbleReceive01@3x.png",
      "Images/chatroomBubbleReceive01Selected@2x.png",
      "Images/chatroomBubbleReceive01Selected@3x.png",
      "Images/chatroomBubbleReceive02@2x.png",
      "Images/chatroomBubbleReceive02@3x.png",
      "Images/chatroomBubbleReceive02Selected@2x.png",
      "Images/chatroomBubbleReceive02Selected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_you_01_image.9.png",
      "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_you_02_image.9.png",
    ],
    androidRequiresNinePatch: true,
  },
  passcodeBackgroundImage: {
    label: "암호 화면 배경",
    ios: ["Images/passcodeBgImage@3x.png"],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_passcode_background_image.png",
      "src/main/theme/drawable-sw600dp/theme_passcode_background_image.png",
    ],
  },
  passcodeDot: {
    label: "암호 기본 이미지",
    ios: [
      "Images/passcodeImgCode01@3x.png",
      "Images/passcodeImgCode02@3x.png",
      "Images/passcodeImgCode03@3x.png",
      "Images/passcodeImgCode04@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_passcode_01_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_02_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_03_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_04_image.png",
    ],
  },
  passcodeDotSelected: {
    label: "암호 입력 이미지",
    ios: [
      "Images/passcodeImgCode01Selected@3x.png",
      "Images/passcodeImgCode02Selected@3x.png",
      "Images/passcodeImgCode03Selected@3x.png",
      "Images/passcodeImgCode04Selected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_passcode_01_checked_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_02_checked_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_03_checked_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_04_checked_image.png",
    ],
  },
};

const cssString = (value) => `'${String(value ?? "").replaceAll("'", "")}'`;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function getActiveColors(state) {
  return state?.colors ?? defaultThemeState.colors;
}

const colorFor = (state, key) => getActiveColors(state)?.[key] ?? defaultThemeState.colors[key];

export function setActiveColor(state, key, value) {
  const normalizedValue = String(value).toUpperCase();

  if (!state.colors) {
    state.colors = { ...defaultThemeState.colors };
  }

  state.colors[key] = normalizedValue;
}

export function sanitizeThemeIdSegment(value) {
  const sanitized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (!sanitized) {
    return "example";
  }

  return sanitized;
}

export function getThemeId(state) {
  if (state.themeIdSegment !== undefined) {
    return `com.${sanitizeThemeIdSegment(state.themeIdSegment)}.kakaotalk.theme`;
  }

  return state.themeId || `com.${defaultThemeState.themeIdSegment}.kakaotalk.theme`;
}

export function getAuthorName(state) {
  if (state.baseAuthorName !== undefined || state.additionalAuthorName !== undefined) {
    const baseAuthor = String(state.baseAuthorName || defaultThemeState.baseAuthorName).trim();
    const additionalAuthor = String(state.additionalAuthorName || "").trim();
    return additionalAuthor ? `${baseAuthor}, ${additionalAuthor}` : baseAuthor;
  }

  return state.authorName || defaultThemeState.baseAuthorName;
}

function replaceInCssBlock(css, blockName, property, value) {
  const blockPattern = new RegExp(`${escapeRegex(blockName)}\\s*\\{[\\s\\S]*?\\}`, "m");
  const blockMatch = css.match(blockPattern);
  const declarationPattern = new RegExp(`(${escapeRegex(property)}\\s*:\\s*)[^;]*(;)`);

  if (!blockMatch) {
    return `${css.trimEnd()}\n\n${blockName}\n{\n    ${property}: ${value};\n}\n`;
  }

  const block = blockMatch[0];
  const nextBlock = declarationPattern.test(block)
    ? block.replace(declarationPattern, `$1${value}$2`)
    : block.replace(/\n?\}$/, `\n    ${property}: ${value};\n}`);

  return css.replace(block, nextBlock);
}

function replaceManifestValue(css, property, value) {
  return replaceInCssBlock(css, "ManifestStyle", property, cssString(value));
}

export function patchIosThemeCss(css, state) {
  let nextCss = css;
  nextCss = replaceManifestValue(nextCss, "-kakaotalk-theme-name", state.appName);
  nextCss = replaceManifestValue(nextCss, "-kakaotalk-theme-version", state.version);
  nextCss = replaceManifestValue(nextCss, "-kakaotalk-author-name", getAuthorName(state));
  nextCss = replaceManifestValue(nextCss, "-kakaotalk-theme-id", getThemeId(state));

  nextCss = nextCss.replace(/\n\s*-kakaotalk-theme-style\s*:\s*'[^']*';/g, "");

  for (const [blockName, property, colorKey] of IOS_COLOR_BINDINGS) {
    nextCss = replaceInCssBlock(nextCss, blockName, property, colorFor(state, colorKey));
  }

  return nextCss;
}

function replaceXmlResource(xml, tagName, resourceName, value) {
  const safeName = escapeRegex(resourceName);
  const pattern = new RegExp(`(<${tagName}\\s+name="${safeName}">)[\\s\\S]*?(<\\/${tagName}>)`);

  if (pattern.test(xml)) {
    return xml.replace(pattern, `$1${value}$2`);
  }

  return xml.replace(
    /<\/resources>\s*$/,
    `    <${tagName} name="${resourceName}">${value}</${tagName}>\n</resources>`,
  );
}

export function patchAndroidColorsXml(xml, state) {
  let nextXml = xml;

  for (const [resourceName, colorKey] of Object.entries(ANDROID_COLOR_BINDINGS)) {
    const value = colorFor(state, colorKey);
    if (value) {
      nextXml = replaceXmlResource(nextXml, "color", resourceName, value);
    }
  }

  return nextXml;
}

export function patchAndroidStringsXml(xml, state) {
  const name = escapeXml(state.appName || defaultThemeState.appName);
  let nextXml = replaceXmlResource(xml, "string", "theme_title", name);
  nextXml = replaceXmlResource(nextXml, "string", "app_name", name);
  return nextXml;
}

export function patchAndroidBuildGradle(gradle, state) {
  const themeId = getThemeId(state);
  return gradle
    .replace(/namespace\s*=\s*"[^"]*"/, `namespace = "${themeId}"`)
    .replace(/applicationId\s*=\s*"[^"]*"/, `applicationId = "${themeId}"`);
}

export function patchAndroidManifestXml(manifest, state) {
  return manifest.replace(/package="[^"]*"/, `package="${getThemeId(state)}"`);
}

export function cloneDefaultThemeState() {
  const colors = { ...defaultThemeState.colors };

  return {
    ...defaultThemeState,
    colors,
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
