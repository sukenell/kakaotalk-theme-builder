import assert from "node:assert/strict";
import test from "node:test";

import { buildAndroidEntries, buildIosEntries, getSkippedAndroidUploads } from "../src/theme-builder.js";

const transparentPngBytes = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0,
  0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 15, 4, 0, 9, 251, 3,
  253, 160, 172, 220, 170, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

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

test("buildIosEntries applies generated 2x and 3x variants from one bubble upload", () => {
  const entries = [
    { name: "Images/chatroomBubbleSend01@2x.png", data: new Uint8Array([1]) },
    { name: "Images/chatroomBubbleSend01@3x.png", data: new Uint8Array([2]) },
  ];
  const rawUpload = new Uint8Array([9, 9, 9]);
  const twoXVariant = new Uint8Array([2, 2]);
  const threeXVariant = new Uint8Array([3, 3, 3]);

  const result = buildIosEntries(entries, {
    state: {},
    uploads: {
      sendBubbleNormal: {
        data: rawUpload,
        variants: {
          "Images/chatroomBubbleSend01@2x.png": twoXVariant,
          "Images/chatroomBubbleSend01@3x.png": threeXVariant,
        },
      },
    },
  });

  assert.deepEqual(
    result.find((entry) => entry.name === "Images/chatroomBubbleSend01@2x.png").data,
    twoXVariant,
  );
  assert.deepEqual(
    result.find((entry) => entry.name === "Images/chatroomBubbleSend01@3x.png").data,
    threeXVariant,
  );
});

test("buildIosEntries appends uploaded iOS assets that are not in the base template", () => {
  const rawUpload = new Uint8Array([9, 9, 9]);
  const twoXVariant = new Uint8Array([2, 2]);
  const threeXVariant = new Uint8Array([3, 3, 3]);

  const result = buildIosEntries([], {
    state: {},
    uploads: {
      tabPiccomaIcon: {
        data: rawUpload,
        variants: {
          "Images/maintabIcoPiccoma@2x.png": twoXVariant,
          "Images/maintabIcoPiccoma@3x.png": threeXVariant,
        },
      },
    },
  });

  assert.deepEqual(
    result.find((entry) => entry.name === "Images/maintabIcoPiccoma@2x.png").data,
    twoXVariant,
  );
  assert.deepEqual(
    result.find((entry) => entry.name === "Images/maintabIcoPiccoma@3x.png").data,
    threeXVariant,
  );
});

test("build entries replace cleared background image uploads with a transparent image", () => {
  const iosEntries = [
    { name: "Images/passcodeBgImage@3x.png", data: new Uint8Array([1, 1, 1]) },
    { name: "KakaoTalkTheme.css", data: "BackgroundStyle-Passcode { background-color: #FFDEDE; }" },
  ];
  const androidTarget = "src/main/theme/drawable-xxhdpi/theme_passcode_background_image.png";
  const androidEntries = [
    { name: androidTarget, data: new Uint8Array([2, 2, 2]) },
    { name: "src/main/theme/values/colors.xml", data: `<resources></resources>` },
  ];

  const iosResult = buildIosEntries(iosEntries, {
    state: {},
    uploads: { passcodeBackgroundImage: { cleared: true } },
  });
  const androidResult = buildAndroidEntries(androidEntries, {
    state: {},
    uploads: { passcodeBackgroundImage: { cleared: true } },
  });

  assert.deepEqual(iosResult.find((entry) => entry.name === "Images/passcodeBgImage@3x.png").data, transparentPngBytes);
  assert.deepEqual(androidResult.find((entry) => entry.name === androidTarget).data, transparentPngBytes);
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
      sendBubbleNormal: new Uint8Array([9, 8, 7]),
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

test("buildAndroidEntries applies generated 9-patch variants for bubble uploads", () => {
  const bubbleTarget = "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_01_image.9.png";
  const entries = [
    { name: bubbleTarget, data: new Uint8Array([1, 1, 1]) },
    { name: "src/main/theme/drawable-xxhdpi/theme_maintab_cell_image.9.png", data: new Uint8Array([2, 2, 2]) },
  ];
  const generatedNinePatch = new Uint8Array([9, 9, 9]);

  const result = buildAndroidEntries(entries, {
    state: {},
    uploads: {
      sendBubbleNormal: {
        data: new Uint8Array([8, 8, 8]),
        variants: {
          [bubbleTarget]: generatedNinePatch,
        },
      },
      tabBackground: new Uint8Array([7, 7, 7]),
    },
  });

  assert.deepEqual(result.find((entry) => entry.name === bubbleTarget).data, generatedNinePatch);
  assert.deepEqual(
    result.find((entry) => entry.name === "src/main/theme/drawable-xxhdpi/theme_maintab_cell_image.9.png").data,
    new Uint8Array([2, 2, 2]),
  );
  assert.deepEqual(
    getSkippedAndroidUploads({
      sendBubbleNormal: {
        variants: {
          [bubbleTarget]: generatedNinePatch,
        },
      },
      receiveBubbleTailless: new Uint8Array([6, 6, 6]),
      tabBackground: new Uint8Array([7, 7, 7]),
    }),
    ["상대 말풍선 - 추가", "탭 배경"],
  );
});

test("buildAndroidEntries appends extended tab images and selectors when both states are uploaded", () => {
  const normal = new Uint8Array([1, 2, 3]);
  const selected = new Uint8Array([4, 5, 6]);

  const result = buildAndroidEntries([], {
    state: {},
    uploads: {
      tabFindIcon: normal,
      tabFindIconSelected: selected,
    },
  });

  assert.deepEqual(
    result.find((entry) => entry.name === "src/main/theme/drawable-xxhdpi/theme_maintab_ico_find_image.png").data,
    normal,
  );
  assert.deepEqual(
    result.find((entry) => entry.name === "src/main/theme/drawable-xxhdpi/theme_maintab_ico_find_focused_image.png").data,
    selected,
  );

  const selector = result.find((entry) => entry.name === "src/main/theme-adv/drawable/theme_tab_find_icon.xml");
  const selectorXml = new TextDecoder().decode(selector.data);
  assert.match(selectorXml, /theme_maintab_ico_find_focused_image/);
  assert.match(selectorXml, /theme_maintab_ico_find_image/);
});
