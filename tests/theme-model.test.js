import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_BUBBLE_IMAGE_KEYS,
  cloneDefaultThemeState,
  defaultThemeState,
  getAuthorName,
  getActiveColors,
  getThemeId,
  IMAGE_TARGETS,
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
  ]);
  assert.deepEqual(IMAGE_TARGETS.tabFriendIcon.ios, [
    "Images/maintabIcoFriends@2x.png",
    "Images/maintabIcoFriends@3x.png",
  ]);
  assert.deepEqual(IMAGE_TARGETS.tabFriendIconSelected.ios, [
    "Images/maintabIcoFriendsSelected@2x.png",
    "Images/maintabIcoFriendsSelected@3x.png",
  ]);
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
  assert.deepEqual(IMAGE_TARGETS.tabChatIconSelected.ios, [
    "Images/maintabIcoChatsSelected@2x.png",
    "Images/maintabIcoChatsSelected@3x.png",
  ]);
  assert.ok(IMAGE_TARGETS.tabChatIcon.android.includes("src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_image.png"));
  assert.ok(
    IMAGE_TARGETS.tabChatIconSelected.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_focused_image.png",
    ),
  );
  assert.ok(IMAGE_TARGETS.tabOpenChatIcon.android.includes("src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_image.png"));
  assert.ok(
    IMAGE_TARGETS.tabOpenChatIconSelected.android.includes(
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_focused_image.png",
    ),
  );
  assert.ok(IMAGE_TARGETS.tabShoppingIcon.ios.includes("Images/maintabIcoShopping@3x.png"));
  assert.ok(IMAGE_TARGETS.tabShoppingIconSelected.ios.includes("Images/maintabIcoShoppingSelected@3x.png"));
  assert.ok(
    IMAGE_TARGETS.tabMoreIconSelected.android.includes(
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_more_focused_image.png",
    ),
  );
});

test("IMAGE_TARGETS maps the Android splash loading image upload", () => {
  assert.deepEqual(IMAGE_TARGETS.splashImage.android, [
    "src/main/theme/drawable-xxhdpi/theme_splash_image.png",
    "src/main/theme/drawable-xhdpi/theme_splash_image.png",
    "src/main/theme/drawable-sw600dp/theme_splash_image.png",
    "src/main/theme/drawable-land-xxhdpi/theme_splash_image.png",
    "src/main/theme/drawable-land-xhdpi/theme_splash_image.png",
    "src/main/theme/drawable-sw600dp-land/theme_splash_image.png",
  ]);
  assert.equal(
    IMAGE_TARGETS.splashImage.previewPath,
    "assets/templates/android-source/src/main/theme/drawable-xxhdpi/theme_splash_image.png",
  );
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
  assert.match(patchedCss, /BackgroundStyle-ChatRoom[\s\S]*background-color: #FFFFFF;/);
  assert.doesNotMatch(patchedCss, /-kakaotalk-theme-style/);
  assert.match(patchAndroidColorsXml(xml, state), /name="theme_chatroom_background_color">#FFFFFF</);
});

test("patchIosThemeCss updates manifest and core preview colors", () => {
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
MainViewStyle-Primary
{
    background-color: #FFDEDE;
    -ios-text-color: #664242;
    -ios-description-text-color: #805959;
    -ios-paragraph-text-color: #805959;
}
BackgroundStyle-ChatRoom
{
    background-color: #FFDEDE;
}
MessageCellStyle-Send
{
    -ios-text-color: #FFFFFF;
    -ios-unread-text-color: #FF7F7F;
}
MessageCellStyle-Receive
{
    -ios-text-color: #4D4D4D;
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
  assert.match(patched, /MainViewStyle-Primary[\s\S]*background-color: #101418;/);
  assert.match(patched, /BackgroundStyle-ChatRoom[\s\S]*background-color: #202830;/);
  assert.match(patched, /MessageCellStyle-Send[\s\S]*-ios-unread-text-color: #FFE066;/);
});

test("patchAndroidBuildGradle updates namespace and applicationId from theme segment", () => {
  const gradle = `
namespace = "com.kakao.talk.theme.apeach"
applicationId = "com.kakao.talk.theme.template"
`;

  const patched = patchAndroidBuildGradle(gradle, { themeIdSegment: "reha" });

  assert.match(patched, /namespace = "com.reha.kakaotalk.theme"/);
  assert.match(patched, /applicationId = "com.reha.kakaotalk.theme"/);
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
    <color name="theme_chatroom_background_color">#FFDEDE</color>
    <color name="theme_chatroom_bubble_me_color">#FFFFFF</color>
    <color name="theme_chatroom_bubble_you_color">#4D4D4D</color>
    <color name="theme_chatroom_unread_count_color">#FF7F7F</color>
</resources>`;

  const patched = patchAndroidColorsXml(xml, {
    colors: {
      headerText: "#233142",
      mainBackground: "#FAFAF7",
      chatBackground: "#DDE9EA",
      sendText: "#111111",
      receiveText: "#333333",
      unreadCount: "#F95D5D",
    },
  });

  assert.match(patched, /name="theme_header_color">#233142</);
  assert.match(patched, /name="theme_background_color">#FAFAF7</);
  assert.match(patched, /name="theme_chatroom_background_color">#DDE9EA</);
  assert.match(patched, /name="theme_chatroom_unread_count_color">#F95D5D</);
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
