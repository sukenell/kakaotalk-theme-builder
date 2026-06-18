import assert from "node:assert/strict";
import test from "node:test";

import {
  cloneDefaultThemeState,
  getAuthorName,
  getActiveColors,
  getThemeId,
  IMAGE_TARGETS,
  patchAndroidBuildGradle,
  patchAndroidColorsXml,
  patchAndroidManifestXml,
  patchAndroidStringsXml,
  patchIosThemeCss,
  sanitizeThemeIdSegment,
  setActiveColor,
} from "../src/theme-model.js";

test("getThemeId only accepts the middle package segment from user input", () => {
  assert.equal(getThemeId({ themeIdSegment: "reha" }), "com.reha.kakaotalk.theme");
  assert.equal(getThemeId({ themeIdSegment: "Reha Lab!" }), "com.rehalab.kakaotalk.theme");
  assert.equal(getThemeId({ themeIdSegment: "테마_Reha123!" }), "com.reha.kakaotalk.theme");
  assert.equal(getThemeId({ themeIdSegment: "123" }), "com.example.kakaotalk.theme");
  assert.equal(sanitizeThemeIdSegment(""), "example");
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

test("IMAGE_TARGETS maps five bottom tab icon uploads", () => {
  assert.deepEqual(IMAGE_TARGETS.tabFriendIcon.ios, [
    "Images/maintabIcoFriends@2x.png",
    "Images/maintabIcoFriends@3x.png",
    "Images/maintabIcoFriendsSelected@2x.png",
    "Images/maintabIcoFriendsSelected@3x.png",
  ]);
  assert.ok(IMAGE_TARGETS.tabChatIcon.android.includes("src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_focused_image.png"));
  assert.ok(IMAGE_TARGETS.tabOpenChatIcon.android.includes("src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_image.png"));
  assert.ok(IMAGE_TARGETS.tabShoppingIcon.ios.includes("Images/maintabIcoShoppingSelected@3x.png"));
  assert.ok(IMAGE_TARGETS.tabMoreIcon.android.includes("src/main/theme/drawable-sw600dp/theme_maintab_ico_more_focused_image.png"));
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
