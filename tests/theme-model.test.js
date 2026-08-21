import assert from "node:assert/strict";
import test from "node:test";

import {
  ADDITIONAL_IMAGE_KEYS,
  CHAT_BUBBLE_IMAGE_KEYS,
  cloneDefaultThemeState,
  createThemeGenerationSnapshot,
  defaultThemeState,
  getAuthorName,
  getActiveColors,
  getThemeId,
  IMAGE_TARGETS,
  isValidThemeIdSegment,
  isValidThemeVersion,
  normalizeThemeVersion,
  patchAndroidBuildGradle,
  patchAndroidColorsXml,
  patchAndroidManifestXml,
  patchAndroidStringsXml,
  patchIosThemeCss,
  sanitizeThemeIdSegment,
  setActiveColor,
  TAB_ICON_IMAGE_KEYS,
} from "../src/theme-model.js";
import { PREVIEW_DEFAULT_IMAGE_PATHS } from "../src/preview-assets.js";

test("getThemeId only accepts the middle package segment from user input", () => {
  assert.equal(getThemeId({ themeIdSegment: "reha" }), "com.reha.kakaotalk.theme");
  assert.equal(getThemeId({ themeIdSegment: "Reha Lab!" }), "com.rehalab.kakaotalk.theme");
  assert.equal(getThemeId({ themeIdSegment: "테마_Reha123!" }), "com.reha.kakaotalk.theme");
  assert.equal(getThemeId({ themeIdSegment: "123" }), "com.example.kakaotalk.theme");
  assert.equal(sanitizeThemeIdSegment(""), "example");
});

test("default theme name uses the requested Korean wording", () => {
  assert.equal(defaultThemeState.appName, "나의 테마");
});

test("default tab background color is white in preview and downloaded themes", () => {
  assert.equal(defaultThemeState.colors.tabBackground, "#FFFFFF");

  const iosCss = `TabBarStyle-Main
{
    background-color: #00FFFFFF;
}`;
  const androidXml = `<resources>
    <color name="theme_maintab_cell_color">#00FFFFFF</color>
</resources>`;

  assert.match(patchIosThemeCss(iosCss, defaultThemeState), /TabBarStyle-Main[\s\S]*background-color: #FFFFFF;/);
  assert.match(patchAndroidColorsXml(androidXml, defaultThemeState), /name="theme_maintab_cell_color">#FFFFFF</);
});

test("tab background image exports transparent tab colors", () => {
  const iosCss = `TabBarStyle-Main
{
    background-color: #FFFFFF;
}`;
  const androidXml = `<resources>
    <color name="theme_maintab_cell_color">#FFFFFF</color>
</resources>`;
  const state = { colors: { tabBackground: "#ABCDEF" } };

  assert.match(
    patchIosThemeCss(iosCss, state, { transparentTabBackground: true }),
    /TabBarStyle-Main[\s\S]*background-color: transparent;/,
  );
  assert.match(
    patchAndroidColorsXml(androidXml, state, { transparentTabBackground: true }),
    /name="theme_maintab_cell_color">#00ABCDEF</,
  );
});

test("default passcode background matches the main background in preview and downloaded themes", () => {
  assert.equal(defaultThemeState.colors.mainBackground, "#FFDEDE");
  assert.equal(defaultThemeState.colors.passcodeBackground, defaultThemeState.colors.mainBackground);

  const iosCss = `MainViewStyle-Primary
{
    background-color: #FFDEDE;
}
BackgroundStyle-Passcode
{
    background-color: #FCC5C5;
}`;
  const androidXml = `<resources>
    <color name="theme_background_color">#FFDEDE</color>
    <color name="theme_passcode_background_color">#FCC5C5</color>
</resources>`;

  assert.match(patchIosThemeCss(iosCss, defaultThemeState), /BackgroundStyle-Passcode[\s\S]*background-color: #FFDEDE;/);
  assert.match(patchAndroidColorsXml(androidXml, defaultThemeState), /name="theme_passcode_background_color">#FFDEDE</);
});

test("single background color drives downloaded main, chat, and passcode backgrounds", () => {
  const state = {
    colors: {
      mainBackground: "#123456",
      chatBackground: "#654321",
      passcodeBackground: "#ABCDEF",
    },
  };
  const iosCss = `MainViewStyle-Primary
{
    background-color: #FFDEDE;
}
MainViewStyle-Secondary
{
    background-color: #FFDEDE;
}
BackgroundStyle-ChatRoom
{
    background-color: #FFDEDE;
}
BackgroundStyle-Passcode
{
    background-color: #FFDEDE;
}`;
  const androidXml = `<resources>
    <color name="theme_background_color">#FFDEDE</color>
    <color name="theme_header_cell_color">#FFDEDE</color>
    <color name="theme_body_cell_color">#FFDEDE</color>
    <color name="theme_body_secondary_cell_color">#FFDEDE</color>
    <color name="theme_chatroom_background_color">#FFDEDE</color>
    <color name="theme_passcode_background_color">#FFDEDE</color>
</resources>`;

  const patchedCss = patchIosThemeCss(iosCss, state);
  const patchedXml = patchAndroidColorsXml(androidXml, state);

  assert.match(patchedCss, /MainViewStyle-Primary[\s\S]*background-color: #123456;/);
  assert.match(patchedCss, /MainViewStyle-Secondary[\s\S]*background-color: #123456;/);
  assert.match(patchedCss, /BackgroundStyle-ChatRoom[\s\S]*background-color: #123456;/);
  assert.match(patchedCss, /BackgroundStyle-Passcode[\s\S]*background-color: #123456;/);
  assert.doesNotMatch(patchedCss, /#654321|#ABCDEF/);
  assert.match(patchedXml, /name="theme_background_color">#123456</);
  assert.match(patchedXml, /name="theme_header_cell_color">#123456</);
  assert.match(patchedXml, /name="theme_body_cell_color">#123456</);
  assert.match(patchedXml, /name="theme_body_secondary_cell_color">#123456</);
  assert.match(patchedXml, /name="theme_chatroom_background_color">#123456</);
  assert.match(patchedXml, /name="theme_passcode_background_color">#123456</);
  assert.doesNotMatch(patchedXml, /#654321|#ABCDEF/);
});

test("main background color drives downloaded top notification backgrounds", () => {
  const state = {
    colors: {
      mainBackground: "#123456",
      notificationBackground: "#654321",
      bodyPressed: "#ABCDEF",
    },
  };
  const iosCss = `BackgroundStyle-MessageNotificationBar
{
    background-color: #FCC5C5;
}`;
  const androidXml = `<resources>
    <color name="theme_notification_background_color">#FCC5C5</color>
    <color name="theme_notification_background_pressed_color">#FFB3B3</color>
</resources>`;

  const patchedCss = patchIosThemeCss(iosCss, state);
  const patchedXml = patchAndroidColorsXml(androidXml, state);
  const notificationCss = patchedCss.match(/BackgroundStyle-MessageNotificationBar\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const notificationXml = [
    patchedXml.match(/<color name="theme_notification_background_color">#[0-9A-F]+<\/color>/)?.[0] ?? "",
    patchedXml.match(/<color name="theme_notification_background_pressed_color">#[0-9A-F]+<\/color>/)?.[0] ?? "",
  ].join("\n");

  assert.match(patchedCss, /BackgroundStyle-MessageNotificationBar[\s\S]*background-color: #123456;/);
  assert.match(patchedXml, /name="theme_notification_background_color">#123456</);
  assert.match(patchedXml, /name="theme_notification_background_pressed_color">#123456</);
  assert.doesNotMatch(notificationCss, /#654321|#ABCDEF/);
  assert.doesNotMatch(notificationXml, /#654321|#ABCDEF/);
});

test("downloaded top segment colors match preview selected menu colors", () => {
  const state = {
    colors: {
      headerText: "#223344",
      titleText: "#102030",
      descriptionText: "#445566",
      titlePressed: "#A1B2C3",
      bodyPressed: "#D4E5F6",
    },
  };
  const iosCss = `HeaderStyle-Main
{
    -ios-text-color: #664242;
    -ios-tab-text-color: #B39898;
    -ios-tab-highlighted-text-color: #664242;
}
MainViewStyle-Primary
{
    -ios-selected-background-color: #664242;
}`;
  const androidXml = `<resources>
    <color name="theme_feature_browse_tab_color">#D49B9B</color>
    <color name="theme_feature_browse_tab_focused_color">#664242</color>
    <color name="theme_body_cell_pressed_color">#664242</color>
</resources>`;

  const patchedCss = patchIosThemeCss(iosCss, state);
  const patchedXml = patchAndroidColorsXml(androidXml, state);
  const iosSegmentCss = [
    patchedCss.match(/-ios-tab-text-color: #[0-9A-F]+;/)?.[0] ?? "",
    patchedCss.match(/-ios-tab-highlighted-text-color: #[0-9A-F]+;/)?.[0] ?? "",
    patchedCss.match(/-ios-selected-background-color: #[0-9A-F]+;/)?.[0] ?? "",
  ].join("\n");
  const androidSegmentXml = [
    patchedXml.match(/<color name="theme_feature_browse_tab_color">#[0-9A-F]+<\/color>/)?.[0] ?? "",
    patchedXml.match(/<color name="theme_feature_browse_tab_focused_color">#[0-9A-F]+<\/color>/)?.[0] ?? "",
    patchedXml.match(/<color name="theme_body_cell_pressed_color">#[0-9A-F]+<\/color>/)?.[0] ?? "",
  ].join("\n");

  assert.match(patchedCss, /HeaderStyle-Main[\s\S]*-ios-tab-text-color: #102030;/);
  assert.match(patchedCss, /HeaderStyle-Main[\s\S]*-ios-tab-highlighted-text-color: #A1B2C3;/);
  assert.match(patchedCss, /MainViewStyle-Primary[\s\S]*-ios-selected-background-color: #D4E5F6;/);
  assert.doesNotMatch(iosSegmentCss, /#223344|#445566/);
  assert.match(patchedXml, /name="theme_feature_browse_tab_color">#102030</);
  assert.match(patchedXml, /name="theme_feature_browse_tab_focused_color">#A1B2C3</);
  assert.match(patchedXml, /name="theme_body_cell_pressed_color">#D4E5F6</);
  assert.doesNotMatch(androidSegmentXml, /#223344|#445566/);
});

test("theme versions normalize to numeric triplets and validate strictly", () => {
  assert.equal(normalizeThemeVersion("v1.2.3-beta"), "1.2.3");
  assert.equal(normalizeThemeVersion("1..2...3.4"), "1.2.3");
  assert.equal(normalizeThemeVersion("01.002.0003"), "01.002.0003");
  assert.equal(normalizeThemeVersion("1.2"), "1.2");
  assert.equal(isValidThemeVersion("1.2.3"), true);
  assert.equal(isValidThemeVersion("25.10.0"), true);
  assert.equal(isValidThemeVersion("1.2"), false);
  assert.equal(isValidThemeVersion("1.2.3.4"), false);
  assert.equal(isValidThemeVersion("1.2.x"), false);
  assert.equal(isValidThemeVersion(" 1.2.3"), false);
  assert.equal(isValidThemeVersion("1.2.3 "), false);
});

test("theme id segments accept only one or more raw ASCII letters", () => {
  assert.equal(isValidThemeIdSegment("example"), true);
  assert.equal(isValidThemeIdSegment("Theme"), true);
  assert.equal(isValidThemeIdSegment("테마"), false);
  assert.equal(isValidThemeIdSegment("theme1"), false);
  assert.equal(isValidThemeIdSegment(" theme"), false);
  assert.equal(isValidThemeIdSegment("theme "), false);
  assert.equal(isValidThemeIdSegment(""), false);
});

test("theme generation snapshots isolate mutable state, upload maps, variants, and bubble layout", () => {
  const imageBytes = new Uint8Array([1, 2, 3]);
  const variantBytes = new Uint8Array([4, 5, 6]);
  const upload = {
    data: imageBytes,
    variants: { "Images/bubble.png": variantBytes },
    bubbleLayout: {
      stretchX: [10, 20],
      stretchY: [11, 21],
      paddingX: [12, 22],
      paddingY: [13, 23],
      referenceSize: { width: 120, height: 105 },
      fit: "contain",
    },
  };
  const originalState = { appName: "Invocation", colors: { mainBackground: "#123456" } };
  const originalUploads = { sendBubbleNormal: upload, splashImage: { cleared: true } };

  const snapshot = createThemeGenerationSnapshot(originalState, originalUploads);
  originalState.appName = "Later";
  originalState.colors.mainBackground = "#654321";
  originalUploads.sendBubbleNormal = { data: new Uint8Array([9]) };
  delete originalUploads.splashImage;
  upload.variants["Images/bubble.png"] = new Uint8Array([8]);
  upload.bubbleLayout.paddingX[0] = 99;

  assert.equal(snapshot.state.appName, "Invocation");
  assert.equal(snapshot.state.colors.mainBackground, "#123456");
  assert.equal(snapshot.uploads.splashImage.cleared, true);
  assert.strictEqual(snapshot.uploads.sendBubbleNormal.data, imageBytes);
  assert.strictEqual(snapshot.uploads.sendBubbleNormal.variants["Images/bubble.png"], variantBytes);
  assert.deepEqual(snapshot.uploads.sendBubbleNormal.bubbleLayout.paddingX, [12, 22]);
});

test("download patchers normalize raw version values as an export defense", () => {
  const rawState = { ...cloneDefaultThemeState(), version: " v2..3.4-beta " };
  const ios = patchIosThemeCss("", rawState);
  const android = patchAndroidBuildGradle('versionName = "1.0.0"', rawState);

  assert.match(ios, /-kakaotalk-theme-version: '2.3.4';/);
  assert.match(android, /versionName = "2.3.4"/);
});

test("passcode title and keypad text colors can differ in downloaded themes", () => {
  const css = `
LabelStyle-PasscodeTitle
{
    -ios-text-color: #664242;
}
PasscodeStyle
{
    -ios-keypad-text-normal-color: #664242;
}`;
  const androidXml = `<resources>
    <color name="theme_passcode_color">#664242</color>
    <color name="theme_passcode_keypad_color">#664242</color>
</resources>`;
  const state = {
    colors: {
      passcodeText: "#664242",
      passcodeKeypadText: "#FFF9F9",
    },
  };

  const patchedCss = patchIosThemeCss(css, state);
  const patchedXml = patchAndroidColorsXml(androidXml, state);

  assert.match(patchedCss, /LabelStyle-PasscodeTitle[\s\S]*-ios-text-color: #664242;/);
  assert.match(patchedCss, /PasscodeStyle[\s\S]*-ios-keypad-text-normal-color: #FFF9F9;/);
  assert.match(patchedXml, /name="theme_passcode_color">#664242</);
  assert.match(patchedXml, /name="theme_passcode_keypad_color">#FFF9F9</);
});

test("Korean theme names are preserved in iOS CSS and Android strings", () => {
  const css = `ManifestStyle
{
    -kakaotalk-theme-name: 'Apeach';
}`;
  const strings = `<resources>
    <string name="theme_title">Apeach</string>
    <string name="app_name">Apeach</string>
</resources>`;

  const state = { appName: "복숭아 테마 & 친구" };

  assert.match(patchIosThemeCss(css, state), /-kakaotalk-theme-name: '복숭아 테마 & 친구';/);
  assert.match(patchAndroidStringsXml(strings, state), /<string name="theme_title">복숭아 테마 &amp; 친구<\/string>/);
  assert.match(patchAndroidStringsXml(strings, state), /<string name="app_name">복숭아 테마 &amp; 친구<\/string>/);
});

test("IMAGE_TARGETS maps passcode normal and selected images for preview and output", () => {
  assert.deepEqual(IMAGE_TARGETS.passcodeBackgroundImage.ios, ["Images/passcodeBgImage@3x.png"]);
  assert.ok(
    IMAGE_TARGETS.passcodeBackgroundImage.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_passcode_background_image.png",
    ),
  );
  assert.deepEqual(IMAGE_TARGETS.passcodeDot.ios, [
    "Images/passcodeImgCode01@3x.png",
    "Images/passcodeImgCode02@3x.png",
    "Images/passcodeImgCode03@3x.png",
    "Images/passcodeImgCode04@3x.png",
  ]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDotSelected.ios, [
    "Images/passcodeImgCode01Selected@3x.png",
    "Images/passcodeImgCode02Selected@3x.png",
    "Images/passcodeImgCode03Selected@3x.png",
    "Images/passcodeImgCode04Selected@3x.png",
  ]);
  assert.ok(IMAGE_TARGETS.passcodeDot.android.includes("src/main/theme/drawable-xxhdpi/theme_passcode_01_image.png"));
  assert.ok(IMAGE_TARGETS.passcodeDotSelected.android.includes("src/main/theme/drawable-xxhdpi/theme_passcode_01_checked_image.png"));
  assert.deepEqual(IMAGE_TARGETS.passcodeDot2.ios, ["Images/passcodeImgCode02@3x.png"]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDot3.ios, ["Images/passcodeImgCode03@3x.png"]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDot4.ios, ["Images/passcodeImgCode04@3x.png"]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDotSelected2.ios, ["Images/passcodeImgCode02Selected@3x.png"]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDotSelected3.ios, ["Images/passcodeImgCode03Selected@3x.png"]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDotSelected4.ios, ["Images/passcodeImgCode04Selected@3x.png"]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDot2.android, ["src/main/theme/drawable-xxhdpi/theme_passcode_02_image.png"]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDotSelected4.android, [
    "src/main/theme/drawable-xxhdpi/theme_passcode_04_checked_image.png",
  ]);
});

test("IMAGE_TARGETS exposes display sizes for preview upload images", () => {
  assert.deepEqual(IMAGE_TARGETS.mainBackground.displaySizes, {
    ios: [1125, 2250],
    android: [1440, 2880],
  });
  assert.deepEqual(IMAGE_TARGETS.chatBackground.displaySizes, {
    ios: [1125, 2250],
    android: [1440, 2880],
  });
  assert.deepEqual(IMAGE_TARGETS.tabBackground.displaySize, [1410, 147]);
  assert.deepEqual(IMAGE_TARGETS.profileImage.displaySize, [360, 360]);
  assert.deepEqual(IMAGE_TARGETS.passcodeBackgroundImage.displaySizes, {
    ios: [1200, 1200],
    android: [1440, 1440],
  });
  assert.deepEqual(IMAGE_TARGETS.passcodeDot.displaySize, [132, 132]);
  assert.deepEqual(IMAGE_TARGETS.passcodeDotSelected.displaySize, [132, 132]);
  assert.deepEqual(IMAGE_TARGETS.splashImage.displaySize, [1440, 2560]);
  assert.deepEqual(IMAGE_TARGETS.themeIcon.displaySize, [162, 162]);
});

test("IMAGE_TARGETS maps each 3x chat bubble upload to generated 2x and 3x outputs", () => {
  assert.deepEqual(CHAT_BUBBLE_IMAGE_KEYS, [
    "sendBubbleNormal",
    "sendBubbleSelected",
    "sendBubbleTailless",
    "sendBubbleTaillessSelected",
    "receiveBubbleNormal",
    "receiveBubbleSelected",
    "receiveBubbleTailless",
    "receiveBubbleTaillessSelected",
  ]);
  assert.deepEqual(IMAGE_TARGETS.sendBubbleNormal.ios, [
    "Images/chatroomBubbleSend01@2x.png",
    "Images/chatroomBubbleSend01@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.sendBubbleNormal.label, "나의 말풍선 - 기본");
  assert.deepEqual(IMAGE_TARGETS.sendBubbleSelected.ios, [
    "Images/chatroomBubbleSend01Selected@2x.png",
    "Images/chatroomBubbleSend01Selected@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.sendBubbleSelected.label, "나의 말풍선 - 기본+선택");
  assert.deepEqual(IMAGE_TARGETS.sendBubbleTailless.ios, [
    "Images/chatroomBubbleSend02@2x.png",
    "Images/chatroomBubbleSend02@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.sendBubbleTailless.label, "나의 말풍선 - 추가");
  assert.deepEqual(IMAGE_TARGETS.sendBubbleTaillessSelected.ios, [
    "Images/chatroomBubbleSend02Selected@2x.png",
    "Images/chatroomBubbleSend02Selected@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.sendBubbleTaillessSelected.label, "나의 말풍선 - 추가+선택");
  assert.deepEqual(IMAGE_TARGETS.receiveBubbleNormal.ios, [
    "Images/chatroomBubbleReceive01@2x.png",
    "Images/chatroomBubbleReceive01@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.receiveBubbleNormal.label, "상대 말풍선 - 기본");
  assert.deepEqual(IMAGE_TARGETS.receiveBubbleSelected.ios, [
    "Images/chatroomBubbleReceive01Selected@2x.png",
    "Images/chatroomBubbleReceive01Selected@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.receiveBubbleSelected.label, "상대 말풍선 - 기본+선택");
  assert.deepEqual(IMAGE_TARGETS.receiveBubbleTailless.ios, [
    "Images/chatroomBubbleReceive02@2x.png",
    "Images/chatroomBubbleReceive02@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.receiveBubbleTailless.label, "상대 말풍선 - 추가");
  assert.deepEqual(IMAGE_TARGETS.receiveBubbleTaillessSelected.ios, [
    "Images/chatroomBubbleReceive02Selected@2x.png",
    "Images/chatroomBubbleReceive02Selected@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.receiveBubbleTaillessSelected.label, "상대 말풍선 - 추가+선택");
  assert.equal(IMAGE_TARGETS.sendBubbleNormal.previewIos, "Images/chatroomBubbleSend01@3x.png");
  assert.equal(IMAGE_TARGETS.receiveBubbleNormal.previewIos, "Images/chatroomBubbleReceive01@3x.png");
  assert.deepEqual(IMAGE_TARGETS.sendBubbleNormal.displaySize, [120, 105]);
  assert.deepEqual(IMAGE_TARGETS.receiveBubbleNormal.displaySize, [120, 105]);
  assert.ok(
    IMAGE_TARGETS.sendBubbleNormal.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_01_image.9.png",
    ),
  );
  assert.ok(
    IMAGE_TARGETS.receiveBubbleTailless.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_you_02_image.9.png",
    ),
  );
});

test("IMAGE_TARGETS maps separate normal and selected bottom tab icon uploads", () => {
  assert.deepEqual(TAB_ICON_IMAGE_KEYS, [
    "tabFriendIcon",
    "tabFriendIconSelected",
    "tabChatIcon",
    "tabChatIconSelected",
    "tabOpenChatIcon",
    "tabOpenChatIconSelected",
    "tabShoppingIcon",
    "tabShoppingIconSelected",
    "tabMoreIcon",
    "tabMoreIconSelected",
    "tabCallIcon",
    "tabCallIconSelected",
    "tabPiccomaIcon",
    "tabPiccomaIconSelected",
    "tabFindIcon",
    "tabFindIconSelected",
    "tabGameIcon",
    "tabGameIconSelected",
  ]);
  assert.deepEqual(IMAGE_TARGETS.tabFriendIcon.ios, [
    "Images/maintabIcoFriends@2x.png",
    "Images/maintabIcoFriends@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.tabFriendIcon.previewIos, "Images/maintabIcoFriends@3x.png");
  assert.equal(IMAGE_TARGETS.tabFriendIcon.previewScale, 3);
  assert.deepEqual(IMAGE_TARGETS.tabFriendIcon.displaySize, [114, 114]);
  assert.deepEqual(IMAGE_TARGETS.tabFriendIconSelected.ios, [
    "Images/maintabIcoFriendsSelected@2x.png",
    "Images/maintabIcoFriendsSelected@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.tabFriendIconSelected.previewIos, "Images/maintabIcoFriendsSelected@3x.png");
  assert.equal(IMAGE_TARGETS.tabFriendIcon.label, "친구 탭 아이콘 - 기본");
  assert.equal(IMAGE_TARGETS.tabFriendIconSelected.label, "친구 탭 아이콘 - 선택");
  assert.ok(IMAGE_TARGETS.tabFriendIcon.android.includes("src/main/theme/drawable-xxhdpi/theme_maintab_ico_friends_image.png"));
  assert.ok(
    IMAGE_TARGETS.tabFriendIconSelected.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_friends_focused_image.png",
    ),
  );
  assert.deepEqual(IMAGE_TARGETS.tabChatIcon.ios, [
    "Images/maintabIcoChats@2x.png",
    "Images/maintabIcoChats@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.tabChatIcon.previewIos, "Images/maintabIcoChats@3x.png");
  assert.deepEqual(IMAGE_TARGETS.tabChatIconSelected.ios, [
    "Images/maintabIcoChatsSelected@2x.png",
    "Images/maintabIcoChatsSelected@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.tabChatIconSelected.previewIos, "Images/maintabIcoChatsSelected@3x.png");
  assert.ok(IMAGE_TARGETS.tabChatIcon.android.includes("src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_image.png"));
  assert.ok(
    IMAGE_TARGETS.tabChatIconSelected.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_focused_image.png",
    ),
  );
  assert.ok(
    IMAGE_TARGETS.tabOpenChatIcon.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_image.png",
    ),
  );
  assert.ok(
    IMAGE_TARGETS.tabOpenChatIconSelected.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_focused_image.png",
    ),
  );
  assert.deepEqual(IMAGE_TARGETS.tabOpenChatIcon.ios, [
    "Images/maintabIcoNow@2x.png",
    "Images/maintabIcoNow@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.tabOpenChatIcon.previewIos, "Images/maintabIcoNow@3x.png");
  assert.deepEqual(IMAGE_TARGETS.tabOpenChatIconSelected.ios, [
    "Images/maintabIcoNowSelected@2x.png",
    "Images/maintabIcoNowSelected@3x.png",
  ]);
  assert.equal(IMAGE_TARGETS.tabOpenChatIconSelected.previewIos, "Images/maintabIcoNowSelected@3x.png");
  assert.ok(IMAGE_TARGETS.tabShoppingIcon.ios.includes("Images/maintabIcoShopping@3x.png"));
  assert.equal(IMAGE_TARGETS.tabShoppingIcon.previewIos, "Images/maintabIcoShopping@3x.png");
  assert.ok(IMAGE_TARGETS.tabShoppingIconSelected.ios.includes("Images/maintabIcoShoppingSelected@3x.png"));
  assert.equal(IMAGE_TARGETS.tabShoppingIconSelected.previewIos, "Images/maintabIcoShoppingSelected@3x.png");
  assert.equal(IMAGE_TARGETS.tabMoreIcon.previewIos, "Images/maintabIcoMore@3x.png");
  assert.equal(IMAGE_TARGETS.tabMoreIconSelected.previewIos, "Images/maintabIcoMoreSelected@3x.png");
  assert.ok(
    IMAGE_TARGETS.tabMoreIconSelected.android.includes(
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_more_focused_image.png",
    ),
  );
  assert.deepEqual(IMAGE_TARGETS.tabCallIcon.ios, [
    "Images/maintabIcoCall@2x.png",
    "Images/maintabIcoCall@3x.png",
  ]);
  assert.deepEqual(IMAGE_TARGETS.tabCallIconSelected.ios, [
    "Images/maintabIcoCallSelected@2x.png",
    "Images/maintabIcoCallSelected@3x.png",
  ]);
  assert.ok(
    IMAGE_TARGETS.tabCallIcon.android.includes("src/main/theme/drawable-xxhdpi/theme_maintab_ico_call_image.png"),
  );
  assert.ok(
    IMAGE_TARGETS.tabCallIconSelected.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_call_focused_image.png",
    ),
  );
  assert.deepEqual(IMAGE_TARGETS.tabPiccomaIcon.ios, [
    "Images/maintabIcoPiccoma@2x.png",
    "Images/maintabIcoPiccoma@3x.png",
  ]);
  assert.ok(
    IMAGE_TARGETS.tabPiccomaIconSelected.android.includes(
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_piccoma_focused_image.png",
    ),
  );
  assert.equal(IMAGE_TARGETS.tabFindIcon.ios.length, 0);
  assert.ok(
    IMAGE_TARGETS.tabFindIcon.android.includes("src/main/theme/drawable-xxhdpi/theme_maintab_ico_find_image.png"),
  );
  assert.ok(
    IMAGE_TARGETS.tabGameIconSelected.android.includes(
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_game_focused_image.png",
    ),
  );
  assert.ok(
    IMAGE_TARGETS.tabOpenChatIcon.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_openchat_image.png",
    ),
  );
});

test("IMAGE_TARGETS maps additional Android structure upload inputs", () => {
  assert.deepEqual(ADDITIONAL_IMAGE_KEYS, [
    "addFriendButton",
    "addFriendButtonPressed",
    "profileFullImage",
    "themeIconBackground",
    "themeIconForeground",
    "themeIconRound",
  ]);
  assert.deepEqual(IMAGE_TARGETS.addFriendButton.ios, [
    "Images/findBtnAddFriend@2x.png",
    "Images/findBtnAddFriend@3x.png",
  ]);
  assert.deepEqual(IMAGE_TARGETS.addFriendButton.displaySize, [126, 102]);
  assert.ok(
    IMAGE_TARGETS.addFriendButtonPressed.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_find_add_friend_button_pressed_image.png",
    ),
  );
  assert.deepEqual(IMAGE_TARGETS.profileFullImage.android, [
    "src/main/theme/drawable-nodpi/theme_profile_01_image_full.png",
  ]);
  assert.ok(IMAGE_TARGETS.themeIconBackground.android.includes("src/main/res/mipmap-xxxhdpi/ic_launcher_background.png"));
  assert.ok(IMAGE_TARGETS.themeIconForeground.android.includes("src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png"));
  assert.ok(IMAGE_TARGETS.themeIconRound.android.includes("src/main/res/mipmap-xxxhdpi/ic_launcher_round.png"));
});

test("IMAGE_TARGETS maps the Android splash loading image upload", () => {
  assert.equal(IMAGE_TARGETS.splashImage.label, "로딩 배경");
  assert.deepEqual(IMAGE_TARGETS.splashImage.android, [
    "src/main/theme/drawable-xxhdpi/theme_splash_image.png",
    "src/main/theme/drawable-xhdpi/theme_splash_image.png",
    "src/main/theme/drawable-sw600dp/theme_splash_image.png",
    "src/main/theme/drawable-land-xxhdpi/theme_splash_image.png",
    "src/main/theme/drawable-land-xhdpi/theme_splash_image.png",
    "src/main/theme/drawable-sw600dp-land/theme_splash_image.png",
  ]);
  assert.equal(PREVIEW_DEFAULT_IMAGE_PATHS.splashImage, "");
});

test("getAuthorName keeps reha first and appends user input with a comma", () => {
  assert.equal(getAuthorName({ baseAuthorName: "reha", additionalAuthorName: "" }), "reha");
  assert.equal(getAuthorName({ baseAuthorName: "reha", additionalAuthorName: "mina" }), "reha, mina");
  assert.equal(getAuthorName({ baseAuthorName: "reha", additionalAuthorName: "mina, sol" }), "reha, mina, sol");
});

test("getActiveColors always returns the single theme color palette", () => {
  const state = {
    themeStyle: "dark",
    colors: { chatBackground: "#FAFAFA", headerText: "#111111" },
    colorModes: {
      light: { chatBackground: "#FFFFFF", headerText: "#222222" },
      dark: { chatBackground: "#101418", headerText: "#F7E7B3" },
    },
  };

  assert.equal(getActiveColors(state).chatBackground, "#FAFAFA");
  assert.equal(getActiveColors(state).headerText, "#111111");
});

test("setActiveColor updates the single palette regardless of any themeStyle value", () => {
  const state = {
    themeStyle: "dark",
    colors: { chatBackground: "#FAFAFA", headerText: "#111111" },
  };

  setActiveColor(state, "chatBackground", "#101418");
  assert.equal(getActiveColors(state).chatBackground, "#101418");
  assert.equal(state.colors.chatBackground, "#101418");
  assert.equal(state.colorModes, undefined);
});

test("cloneDefaultThemeState has no theme mode fields", () => {
  const state = cloneDefaultThemeState();

  assert.equal("themeStyle" in state, false);
  assert.equal("colorModes" in state, false);
  assert.equal(getActiveColors(state).chatBackground, state.colors.chatBackground);
});

test("theme patching ignores themeStyle and never writes dark mode metadata", () => {
  const css = `BackgroundStyle-ChatRoom
{
    background-color: #FFDEDE;
}
ManifestStyle
{
    -kakaotalk-theme-style: 'dark';
}`;
  const xml = `<resources><color name="theme_chatroom_background_color">#FFDEDE</color></resources>`;
  const state = {
    themeStyle: "dark",
    colors: { chatBackground: "#FFFFFF" },
  };

  const patchedCss = patchIosThemeCss(css, state);
  assert.match(patchedCss, /BackgroundStyle-ChatRoom[\s\S]*background-color: #FFDEDE;/);
  assert.doesNotMatch(patchedCss, /-kakaotalk-theme-style/);
  assert.match(patchAndroidColorsXml(xml, state), /name="theme_chatroom_background_color">#FFDEDE</);
});

test("patchIosThemeCss updates manifest and downloadable chat text colors", () => {
  const css = `
ManifestStyle
{
    -kakaotalk-theme-name: 'Apeach';
    -kakaotalk-theme-version: '25.8.0';
    -kakaotalk-author-name: 'Kakao Corp.';
    -kakaotalk-theme-id: 'com.kakao.talk.theme.apeachios';
}
HeaderStyle-Main
{
    -ios-text-color: #664242;
}
TabBarStyle-Main
{
    background-color: ;
    -ios-background-image: 'maintabBgImage.png';
}
MainViewStyle-Primary
{
    background-color: #FFDEDE;
    -ios-text-color: #664242;
    -ios-description-text-color: #805959;
    -ios-paragraph-text-color: #805959;
}
MainViewStyle-Secondary
{
    background-color: #FFDEDE;
}
BackgroundStyle-ChatRoom
{
    background-color: #FFDEDE;
}
InputBarStyle-Chat
{
    -ios-button-normal-background-color: #000000;
    -ios-button-normal-background-alpha: 0.04;
}
MessageCellStyle-Send
{
    -ios-text-color: #FFFFFF;
    -ios-unread-text-color: #FF7F7F;
    -ios-title-edgeinsets: 10px 11px 7px 17px;
    -ios-group-title-edgeinsets: 10px 11px 7px 17px;
}
MessageCellStyle-Receive
{
    -ios-text-color: #4D4D4D;
    -ios-title-edgeinsets: 10px 17px 7px 11px;
    -ios-group-title-edgeinsets: 10px 17px 7px 11px;
}
BottomBannerStyle
{
    background-color: #664142;
}
BottomBannerStyle-Light
{
    background-color: #664242;
}
`;

  const patched = patchIosThemeCss(css, {
    appName: "Night Peach",
    baseAuthorName: "reha",
    additionalAuthorName: "Theme Lab",
    themeIdSegment: "nightpeach",
    version: "1.2.3",
    themeStyle: "dark",
    colors: {
      mainBackground: "#101418",
      tabBackground: "#ABCDEF",
      chatBackground: "#202830",
      headerText: "#F7E7B3",
      titleText: "#F8F2DE",
      descriptionText: "#B9C5C7",
      paragraphText: "#C8D4D8",
      sendText: "#111111",
      receiveText: "#F6F6F6",
      unreadCount: "#FFE066",
    },
  });

  assert.match(patched, /-kakaotalk-theme-name: 'Night Peach';/);
  assert.match(patched, /-kakaotalk-author-name: 'reha, Theme Lab';/);
  assert.match(patched, /-kakaotalk-theme-id: 'com.nightpeach.kakaotalk.theme';/);
  assert.doesNotMatch(patched, /-kakaotalk-theme-style/);
  assert.match(patched, /HeaderStyle-Main[\s\S]*-ios-text-color: #F7E7B3;/);
  assert.match(patched, /TabBarStyle-Main[\s\S]*background-color: #ABCDEF;/);
  assert.match(patched, /MainViewStyle-Primary[\s\S]*background-color: #101418;/);
  assert.match(patched, /MainViewStyle-Secondary[\s\S]*background-color: #101418;/);
  assert.match(patched, /MainViewStyle-Secondary[\s\S]*-ios-background-image: 'mainBgImage\.png';/);
  assert.match(patched, /BottomBannerStyle\s*\{[\s\S]*background-color: #101418;/);
  assert.match(patched, /BottomBannerStyle-Light\s*\{[\s\S]*background-color: #101418;/);
  assert.match(patched, /BackgroundStyle-ChatRoom[\s\S]*background-color: #101418;/);
  assert.match(patched, /InputBarStyle-Chat[\s\S]*-ios-button-normal-background-color: #000000;/);
  assert.match(patched, /InputBarStyle-Chat[\s\S]*-ios-button-normal-background-alpha: 0\.04;/);
  assert.match(patched, /MessageCellStyle-Send[\s\S]*-ios-text-color: #111111;/);
  assert.match(patched, /MessageCellStyle-Send[\s\S]*-ios-selected-text-color: #111111;/);
  assert.match(patched, /MessageCellStyle-Send[\s\S]*-ios-unread-text-color: #FFE066;/);
  assert.match(patched, /MessageCellStyle-Receive[\s\S]*-ios-text-color: #F6F6F6;/);
  assert.match(patched, /MessageCellStyle-Receive[\s\S]*-ios-selected-text-color: #F6F6F6;/);
  assert.match(patched, /MessageCellStyle-Receive[\s\S]*-ios-unread-text-color: #FFE066;/);
  assert.match(patched, /MessageCellStyle-Send[\s\S]*-ios-title-edgeinsets: 10px 10px 10px 10px;/);
  assert.match(patched, /MessageCellStyle-Send[\s\S]*-ios-group-title-edgeinsets: 10px 10px 10px 10px;/);
  assert.match(patched, /MessageCellStyle-Receive[\s\S]*-ios-title-edgeinsets: 10px 10px 10px 10px;/);
  assert.match(patched, /MessageCellStyle-Receive[\s\S]*-ios-group-title-edgeinsets: 10px 10px 10px 10px;/);
});

test("patchAndroidBuildGradle updates namespace and applicationId from theme segment", () => {
  const gradle = `
namespace = "com.kakao.talk.theme.apeach"
applicationId = "com.kakao.talk.theme.template"
versionName = "1.0.0"
`;

  const patched = patchAndroidBuildGradle(gradle, { themeIdSegment: "reha", version: "10.3.5" });

  assert.match(patched, /namespace = "com.reha.kakaotalk.theme"/);
  assert.match(patched, /applicationId = "com.reha.kakaotalk.theme"/);
  assert.match(patched, /versionName = "10.3.5"/);
});

test("patchAndroidManifestXml updates the package from theme segment", () => {
  const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.kakao.talk.theme.apeach"></manifest>`;

  const patched = patchAndroidManifestXml(manifest, { themeIdSegment: "reha" });

  assert.match(patched, /package="com.reha.kakaotalk.theme"/);
});

test("patchAndroidColorsXml updates named color resources", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="theme_header_color">#664242</color>
    <color name="theme_background_color">#FFDEDE</color>
    <color name="theme_header_cell_color">#FFDEDE</color>
    <color name="theme_body_cell_color">#00FFDEDE</color>
    <color name="theme_body_secondary_cell_color">#FFDEDE</color>
    <color name="theme_maintab_cell_color">#00FFFFFF</color>
    <color name="theme_tab_lightbannerbadge_background_color">#664242</color>
    <color name="theme_tab_bannerbadge_background_color">#664242</color>
    <color name="theme_chatroom_background_color">#FFDEDE</color>
    <color name="theme_chatroom_bubble_me_color">#FFFFFF</color>
    <color name="theme_chatroom_bubble_you_color">#4D4D4D</color>
    <color name="theme_chatroom_unread_count_color">#FF7F7F</color>
    <color name="theme_chatroom_input_bar_menu_button_color">#0A000000</color>
</resources>`;

  const patched = patchAndroidColorsXml(xml, {
    colors: {
      headerText: "#233142",
      mainBackground: "#FAFAF7",
      tabBackground: "#D2EFE9",
      chatBackground: "#DDE9EA",
      sendText: "#111111",
      receiveText: "#333333",
      unreadCount: "#F95D5D",
    },
  });

  assert.match(patched, /name="theme_header_color">#233142</);
  assert.match(patched, /name="theme_background_color">#FAFAF7</);
  assert.match(patched, /name="theme_header_cell_color">#FAFAF7</);
  assert.match(patched, /name="theme_body_cell_color">#FAFAF7</);
  assert.match(patched, /name="theme_body_secondary_cell_color">#FAFAF7</);
  assert.match(patched, /name="theme_maintab_cell_color">#D2EFE9</);
  assert.match(patched, /name="theme_tab_lightbannerbadge_background_color">#FAFAF7</);
  assert.match(patched, /name="theme_tab_bannerbadge_background_color">#FAFAF7</);
  assert.match(patched, /name="theme_chatroom_background_color">#FAFAF7</);
  assert.match(patched, /name="theme_chatroom_bubble_me_color">#111111</);
  assert.match(patched, /name="theme_chatroom_bubble_you_color">#333333</);
  assert.match(patched, /name="theme_chatroom_unread_count_color">#F95D5D</);
  assert.match(patched, /name="theme_chatroom_input_bar_menu_button_color">#0A000000</);
});

test("patchAndroidStringsXml updates app and theme labels", () => {
  const xml = `<resources>
    <string name="theme_title">Apeach</string>
    <string name="app_name">Apeach</string>
</resources>`;

  const patched = patchAndroidStringsXml(xml, { appName: "Ocean Talk" });

  assert.match(patched, /<string name="theme_title">Ocean Talk<\/string>/);
  assert.match(patched, /<string name="app_name">Ocean Talk<\/string>/);
});
