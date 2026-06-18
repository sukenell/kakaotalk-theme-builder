import assert from "node:assert/strict";
import test from "node:test";

import { buildAndroidEntries, buildIosEntries } from "../src/theme-builder.js";

test("buildIosEntries patches CSS and replaces mapped uploaded images", () => {
  const entries = [
    {
      name: "KakaoTalkTheme.css",
      data: "ManifestStyle { -kakaotalk-theme-name: 'Apeach'; } BackgroundStyle-ChatRoom { background-color: #FFDEDE; }",
    },
    { name: "Images/chatroomBgImage@3x.png", data: new Uint8Array([1, 1, 1]) },
  ];
  const uploadBytes = new Uint8Array([9, 8, 7]);

  const result = buildIosEntries(entries, {
    state: {
      appName: "Mint Talk",
      colors: { chatBackground: "#DDEEFF" },
    },
    uploads: {
      chatBackground: uploadBytes,
    },
  });

  const cssEntry = result.find((entry) => entry.name === "KakaoTalkTheme.css");
  const imageEntry = result.find((entry) => entry.name === "Images/chatroomBgImage@3x.png");

  assert.match(new TextDecoder().decode(cssEntry.data), /Mint Talk/);
  assert.deepEqual(imageEntry.data, uploadBytes);
});

test("buildIosEntries prefers per-target upload variants for bubble assets", () => {
  const entries = [
    { name: "Images/chatroomBubbleSend01@2x.png", data: new Uint8Array([1]) },
    { name: "Images/chatroomBubbleSend01@3x.png", data: new Uint8Array([2]) },
  ];
  const rawUpload = new Uint8Array([9, 9, 9]);
  const smallVariant = new Uint8Array([3, 3]);

  const result = buildIosEntries(entries, {
    state: {},
    uploads: {
      sendBubble: {
        data: rawUpload,
        variants: {
          "Images/chatroomBubbleSend01@2x.png": smallVariant,
        },
      },
    },
  });

  assert.deepEqual(
    result.find((entry) => entry.name === "Images/chatroomBubbleSend01@2x.png").data,
    smallVariant,
  );
  assert.deepEqual(
    result.find((entry) => entry.name === "Images/chatroomBubbleSend01@3x.png").data,
    rawUpload,
  );
});

test("buildAndroidEntries patches XML and skips raw uploads for 9-patch resources", () => {
  const entries = [
    {
      name: "build.gradle.kts",
      data: `namespace = "com.kakao.talk.theme.apeach"\napplicationId = "com.kakao.talk.theme.template"`,
    },
    {
      name: "src/main/AndroidManifest.xml",
      data: `<manifest package="com.kakao.talk.theme.apeach"></manifest>`,
    },
    {
      name: "src/main/theme/values/colors.xml",
      data: `<resources><color name="theme_chatroom_background_color">#FFDEDE</color></resources>`,
    },
    {
      name: "src/main/theme/values/strings.xml",
      data: `<resources><string name="theme_title">Apeach</string></resources>`,
    },
    {
      name: "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_01_image.9.png",
      data: new Uint8Array([1, 1, 1]),
    },
  ];

  const result = buildAndroidEntries(entries, {
    state: {
      appName: "Mint Talk",
      themeIdSegment: "mint",
      colors: { chatBackground: "#DDEEFF" },
    },
    uploads: {
      sendBubble: new Uint8Array([9, 8, 7]),
    },
  });

  const colorsEntry = result.find((entry) => entry.name === "src/main/theme/values/colors.xml");
  const stringsEntry = result.find((entry) => entry.name === "src/main/theme/values/strings.xml");
  const gradleEntry = result.find((entry) => entry.name === "build.gradle.kts");
  const manifestEntry = result.find((entry) => entry.name === "src/main/AndroidManifest.xml");
  const bubbleEntry = result.find((entry) =>
    entry.name.endsWith("theme_chatroom_bubble_me_01_image.9.png"),
  );

  assert.match(new TextDecoder().decode(colorsEntry.data), /#DDEEFF/);
  assert.match(new TextDecoder().decode(stringsEntry.data), /Mint Talk/);
  assert.match(new TextDecoder().decode(gradleEntry.data), /com.mint.kakaotalk.theme/);
  assert.match(new TextDecoder().decode(manifestEntry.data), /com.mint.kakaotalk.theme/);
  assert.deepEqual(bubbleEntry.data, new Uint8Array([1, 1, 1]));
});
