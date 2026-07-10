import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";

import { buildAndroidEntries, buildIosEntries, getSkippedAndroidUploads } from "../src/theme-builder.js";

function readUInt32(data, offset) {
  return data.readUInt32BE(offset);
}

function readRgbaPngBytes(data) {
  const buffer = Buffer.from(data);
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = readUInt32(buffer, offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = readUInt32(chunk, 0);
      height = readUInt32(chunk, 4);
      assert.equal(chunk[8], 8);
      colorType = chunk[9];
      assert.equal(chunk[12], 0);
    } else if (type === "IDAT") {
      idatChunks.push(chunk);
    } else if (type === "IEND") {
      break;
    }

    offset += length + 12;
  }

  assert.equal(colorType, 6);
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    assert.equal(filter, 0);
    raw.copy(pixels, y * stride, sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
  }

  return { width, height, pixels };
}

function rgbaAt(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return Array.from(image.pixels.subarray(offset, offset + 4));
}

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

test("buildIosEntries applies bubble detail padding to iOS edge insets", () => {
  const entries = [
    {
      name: "KakaoTalkTheme.css",
      data: `
MessageCellStyle-Send {
  -ios-title-edgeinsets: 10px 10px 10px 10px;
  -ios-group-title-edgeinsets: 10px 10px 10px 10px;
}
MessageCellStyle-Receive {
  -ios-title-edgeinsets: 10px 10px 10px 10px;
  -ios-group-title-edgeinsets: 10px 10px 10px 10px;
}
`,
    },
  ];

  const result = buildIosEntries(entries, {
    state: {},
    uploads: {
      sendBubbleNormal: {
        data: new Uint8Array([1]),
        bubbleLayout: {
          paddingX: [21, 101],
          paddingY: [11, 91],
        },
      },
      receiveBubbleNormal: {
        data: new Uint8Array([2]),
        bubbleLayout: {
          paddingX: [51, 91],
          paddingY: [31, 75],
        },
      },
    },
  });

  const css = new TextDecoder().decode(result.find((entry) => entry.name === "KakaoTalkTheme.css").data);

  assert.match(css, /MessageCellStyle-Send[\s\S]*-ios-title-edgeinsets: 3px 5px 6px 5px;/);
  assert.match(css, /MessageCellStyle-Send[\s\S]*-ios-group-title-edgeinsets: 3px 5px 6px 5px;/);
  assert.match(css, /MessageCellStyle-Receive[\s\S]*-ios-title-edgeinsets: 8px 8px 10px 13px;/);
  assert.match(css, /MessageCellStyle-Receive[\s\S]*-ios-group-title-edgeinsets: 8px 8px 10px 13px;/);
});

test("buildIosEntries uses uploaded bubble reference size for centered edge insets", () => {
  const entries = [
    {
      name: "KakaoTalkTheme.css",
      data: `
MessageCellStyle-Send {
  -ios-title-edgeinsets: 10px 10px 10px 10px;
  -ios-group-title-edgeinsets: 10px 10px 10px 10px;
}
`,
    },
  ];

  const result = buildIosEntries(entries, {
    state: {},
    uploads: {
      sendBubbleNormal: {
        data: new Uint8Array([1]),
        bubbleLayout: {
          paddingX: [108, 148],
          paddingY: [27, 64],
          referenceSize: { width: 257, height: 93 },
        },
      },
    },
  });

  const css = new TextDecoder().decode(result.find((entry) => entry.name === "KakaoTalkTheme.css").data);

  assert.match(css, /MessageCellStyle-Send[\s\S]*-ios-title-edgeinsets: 7px 26px 7px 27px;/);
  assert.match(css, /MessageCellStyle-Send[\s\S]*-ios-group-title-edgeinsets: 7px 26px 7px 27px;/);
});

test("build entries preserve bundled default tab icons when no icon is uploaded", () => {
  const iosIcon = new Uint8Array([1, 2, 3]);
  const androidIcon = new Uint8Array([4, 5, 6]);
  const iosResult = buildIosEntries(
    [
      { name: "Images/maintabIcoChats@3x.png", data: iosIcon },
      { name: "KakaoTalkTheme.css", data: "ManifestStyle { -kakaotalk-theme-name: 'Apeach'; }" },
    ],
    { state: {}, uploads: {} },
  );
  const androidResult = buildAndroidEntries(
    [
      { name: "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_image.png", data: androidIcon },
      { name: "src/main/theme/values/colors.xml", data: `<resources></resources>` },
    ],
    { state: {}, uploads: {} },
  );

  assert.deepEqual(iosResult.find((entry) => entry.name === "Images/maintabIcoChats@3x.png").data, iosIcon);
  assert.deepEqual(
    androidResult.find((entry) => entry.name === "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_image.png")
      .data,
    androidIcon,
  );
});

test("buildAndroidEntries makes tab icon colors transparent when an uploaded tab image exists", () => {
  const chatIconTarget = "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_image.png";
  const uploadedChatIcon = new Uint8Array([9, 9, 9]);
  const result = buildAndroidEntries(
    [
      { name: chatIconTarget, data: new Uint8Array([1, 1, 1]) },
      {
        name: "src/main/theme/values/colors.xml",
        data: `<resources>
    <color name="theme_feature_browse_tab_color">#D49B9B</color>
    <color name="theme_feature_browse_tab_focused_color">#664242</color>
</resources>`,
      },
    ],
    {
      state: {
        colors: {
          titleText: "#102030",
          titlePressed: "#A1B2C3",
        },
      },
      uploads: {
        tabChatIcon: uploadedChatIcon,
      },
    },
  );

  const colors = new TextDecoder().decode(result.find((entry) => entry.name === "src/main/theme/values/colors.xml").data);

  assert.deepEqual(result.find((entry) => entry.name === chatIconTarget).data, uploadedChatIcon);
  assert.match(colors, /name="theme_feature_browse_tab_color">#00102030</);
  assert.match(colors, /name="theme_feature_browse_tab_focused_color">#00A1B2C3</);
});

test("build entries reuse one uploaded tab icon for its selected and normal pair", () => {
  const normalIosTarget = "Images/maintabIcoChats@3x.png";
  const selectedIosTarget = "Images/maintabIcoChatsSelected@3x.png";
  const normalAndroidTarget = "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_image.png";
  const selectedAndroidTarget = "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_focused_image.png";
  const normalIosVariant = new Uint8Array([3, 3, 3]);
  const normalUpload = new Uint8Array([9, 9, 9]);

  const iosResult = buildIosEntries(
    [
      { name: normalIosTarget, data: new Uint8Array([1]) },
      { name: selectedIosTarget, data: new Uint8Array([2]) },
    ],
    {
      state: {},
      uploads: {
        tabChatIcon: {
          data: normalUpload,
          variants: {
            [normalIosTarget]: normalIosVariant,
          },
        },
      },
    },
  );
  const androidResult = buildAndroidEntries(
    [
      { name: normalAndroidTarget, data: new Uint8Array([1]) },
      { name: selectedAndroidTarget, data: new Uint8Array([2]) },
      { name: "src/main/theme/values/colors.xml", data: `<resources></resources>` },
    ],
    {
      state: {},
      uploads: {
        tabChatIcon: normalUpload,
      },
    },
  );

  assert.deepEqual(iosResult.find((entry) => entry.name === normalIosTarget).data, normalIosVariant);
  assert.deepEqual(iosResult.find((entry) => entry.name === selectedIosTarget).data, normalIosVariant);
  assert.deepEqual(androidResult.find((entry) => entry.name === normalAndroidTarget).data, normalUpload);
  assert.deepEqual(androidResult.find((entry) => entry.name === selectedAndroidTarget).data, normalUpload);
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

test("build entries replace cleared passcode background image uploads with the main background color", () => {
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

  const iosImage = readRgbaPngBytes(iosResult.find((entry) => entry.name === "Images/passcodeBgImage@3x.png").data);
  const androidImage = readRgbaPngBytes(androidResult.find((entry) => entry.name === androidTarget).data);

  assert.deepEqual(rgbaAt(iosImage, 0, 0), [0xff, 0xde, 0xde, 0xff]);
  assert.deepEqual(rgbaAt(androidImage, 0, 0), [0xff, 0xde, 0xde, 0xff]);
});

test("cleared color-backed background image uploads export solid user colors", () => {
  const entries = [
    { name: "Images/mainBgImage@3x.png", data: new Uint8Array([1]) },
    { name: "Images/chatroomBgImage@3x.png", data: new Uint8Array([2]) },
    { name: "Images/passcodeBgImage@3x.png", data: new Uint8Array([3]) },
    { name: "Images/maintabBgImage@3x.png", data: new Uint8Array([4]) },
    { name: "KakaoTalkTheme.css", data: "MainViewStyle-Primary { background-color: #FFDEDE; }" },
  ];
  const state = { colors: { mainBackground: "#123456", tabBackground: "#ABCDEF" } };
  const result = buildIosEntries(entries, {
    state,
    uploads: {
      mainBackground: { cleared: true },
      chatBackground: { cleared: true },
      passcodeBackgroundImage: { cleared: true },
      tabBackground: { cleared: true },
    },
  });

  for (const name of ["Images/mainBgImage@3x.png", "Images/chatroomBgImage@3x.png", "Images/passcodeBgImage@3x.png"]) {
    const image = readRgbaPngBytes(result.find((entry) => entry.name === name).data);

    assert.deepEqual(rgbaAt(image, 0, 0), [0x12, 0x34, 0x56, 0xff]);
  }

  const tabImage = readRgbaPngBytes(result.find((entry) => entry.name === "Images/maintabBgImage@3x.png").data);

  assert.deepEqual(rgbaAt(tabImage, 0, 0), [0xab, 0xcd, 0xef, 0xff]);
});

test("cleared Android background image uploads export solid user colors", () => {
  const backgroundTargets = [
    "src/main/theme/drawable-xxhdpi/theme_background_image.png",
    "src/main/theme/drawable-sw600dp/theme_background_image.png",
    "src/main/theme/drawable-xxhdpi/theme_chatroom_background_image.png",
    "src/main/theme/drawable-sw600dp/theme_chatroom_background_image.png",
    "src/main/theme/drawable-xxhdpi/theme_passcode_background_image.png",
    "src/main/theme/drawable-sw600dp/theme_passcode_background_image.png",
  ];
  const result = buildAndroidEntries(
    [
      ...backgroundTargets.map((name, index) => ({ name, data: new Uint8Array([index + 1]) })),
      { name: "src/main/theme/values/colors.xml", data: `<resources></resources>` },
    ],
    {
      state: { colors: { mainBackground: "#123456" } },
      uploads: {
        mainBackground: { cleared: true },
        chatBackground: { cleared: true },
        passcodeBackgroundImage: { cleared: true },
      },
    },
  );

  for (const name of backgroundTargets) {
    const image = readRgbaPngBytes(result.find((entry) => entry.name === name).data);

    assert.deepEqual(rgbaAt(image, 0, 0), [0x12, 0x34, 0x56, 0xff]);
  }
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
      colors: { mainBackground: "#DDEEFF" },
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

test("buildAndroidEntries applies main background color and image across main tab surfaces", () => {
  const phoneBackgroundTarget = "src/main/theme/drawable-xxhdpi/theme_background_image.png";
  const tabletBackgroundTarget = "src/main/theme/drawable-sw600dp/theme_background_image.png";
  const uploadBytes = new Uint8Array([9, 8, 7]);
  const result = buildAndroidEntries(
    [
      {
        name: "src/main/theme/values/colors.xml",
        data: `<resources>
          <color name="theme_background_color">#FFDEDE</color>
          <color name="theme_header_cell_color">#FFDEDE</color>
          <color name="theme_body_cell_color">#00FFDEDE</color>
          <color name="theme_body_secondary_cell_color">#FFDEDE</color>
        </resources>`,
      },
      { name: phoneBackgroundTarget, data: new Uint8Array([1, 1, 1]) },
      { name: tabletBackgroundTarget, data: new Uint8Array([2, 2, 2]) },
    ],
    {
      state: { colors: { mainBackground: "#123456" } },
      uploads: { mainBackground: uploadBytes },
    },
  );
  const colorsXml = new TextDecoder().decode(
    result.find((entry) => entry.name === "src/main/theme/values/colors.xml").data,
  );

  assert.match(colorsXml, /name="theme_background_color">#123456</);
  assert.match(colorsXml, /name="theme_header_cell_color">#00123456</);
  assert.match(colorsXml, /name="theme_body_cell_color">#00123456</);
  assert.match(colorsXml, /name="theme_body_secondary_cell_color">#00123456</);
  assert.deepEqual(result.find((entry) => entry.name === phoneBackgroundTarget).data, uploadBytes);
  assert.deepEqual(result.find((entry) => entry.name === tabletBackgroundTarget).data, uploadBytes);
});

test("buildIosEntries makes the tab color transparent when a tab background image is uploaded", () => {
  const result = buildIosEntries(
    [
      {
        name: "KakaoTalkTheme.css",
        data: `TabBarStyle-Main
{
    background-color: #FFFFFF;
}`,
      },
      { name: "Images/maintabBgImage@2x.png", data: new Uint8Array([1, 1, 1]) },
      { name: "Images/maintabBgImage@3x.png", data: new Uint8Array([2, 2, 2]) },
    ],
    {
      state: { colors: { tabBackground: "#ABCDEF" } },
      uploads: {
        tabBackground: {
          data: new Uint8Array([3, 3, 3]),
          variants: {
            "Images/maintabBgImage@2x.png": new Uint8Array([4, 4, 4]),
            "Images/maintabBgImage@3x.png": new Uint8Array([5, 5, 5]),
          },
        },
      },
    },
  );
  const patchedCss = new TextDecoder().decode(result.find((entry) => entry.name === "KakaoTalkTheme.css").data);

  assert.match(patchedCss, /TabBarStyle-Main[\s\S]*background-color: transparent;/);
  assert.deepEqual(result.find((entry) => entry.name === "Images/maintabBgImage@2x.png").data, new Uint8Array([4, 4, 4]));
  assert.deepEqual(result.find((entry) => entry.name === "Images/maintabBgImage@3x.png").data, new Uint8Array([5, 5, 5]));
});

test("buildAndroidEntries makes the tab color transparent when a tab background image is uploaded", () => {
  const tabTarget = "src/main/theme/drawable-xxhdpi/theme_maintab_cell_image.9.png";
  const generatedNinePatch = new Uint8Array([9, 9, 9]);
  const result = buildAndroidEntries(
    [
      {
        name: "src/main/theme/values/colors.xml",
        data: `<resources>
    <color name="theme_maintab_cell_color">#FFFFFF</color>
</resources>`,
      },
      { name: tabTarget, data: new Uint8Array([2, 2, 2]) },
    ],
    {
      state: { colors: { tabBackground: "#ABCDEF" } },
      uploads: {
        tabBackground: {
          data: new Uint8Array([3, 3, 3]),
          variants: {
            [tabTarget]: generatedNinePatch,
          },
        },
      },
    },
  );
  const colorsXml = new TextDecoder().decode(
    result.find((entry) => entry.name === "src/main/theme/values/colors.xml").data,
  );

  assert.match(colorsXml, /name="theme_maintab_cell_color">#00ABCDEF</);
  assert.deepEqual(result.find((entry) => entry.name === tabTarget).data, generatedNinePatch);
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

test("cleared Android tab background uploads export a solid 9-patch from the tab color", () => {
  const phoneTabTarget = "src/main/theme/drawable-xxhdpi/theme_maintab_cell_image.9.png";
  const tabletTabTarget = "src/main/theme/drawable-sw600dp/theme_maintab_cell_image.9.png";
  const templateNinePatch = new Uint8Array([2, 2, 2]);
  const result = buildAndroidEntries(
    [
      { name: phoneTabTarget, data: templateNinePatch },
      { name: tabletTabTarget, data: templateNinePatch },
    ],
    {
      state: { colors: { tabBackground: "#ABCDEF" } },
      uploads: {
        tabBackground: { cleared: true },
      },
    },
  );

  for (const target of [phoneTabTarget, tabletTabTarget]) {
    const image = readRgbaPngBytes(result.find((entry) => entry.name === target).data);

    assert.deepEqual(rgbaAt(image, 1, 1), [0xab, 0xcd, 0xef, 0xff]);
    assert.deepEqual(rgbaAt(image, 1, 0), [0, 0, 0, 0xff]);
    assert.deepEqual(rgbaAt(image, 0, 1), [0, 0, 0, 0xff]);
    assert.notDeepEqual(result.find((entry) => entry.name === target).data, templateNinePatch);
  }
  assert.deepEqual(getSkippedAndroidUploads({ tabBackground: { cleared: true } }), []);
});

test("cleared Android tab background uploads use opaque white by default", () => {
  const tabTarget = "src/main/theme/drawable-xxhdpi/theme_maintab_cell_image.9.png";
  const result = buildAndroidEntries([{ name: tabTarget, data: new Uint8Array([2, 2, 2]) }], {
    state: {},
    uploads: {
      tabBackground: { cleared: true },
    },
  });

  const image = readRgbaPngBytes(result.find((entry) => entry.name === tabTarget).data);

  assert.deepEqual(rgbaAt(image, 1, 1), [0xff, 0xff, 0xff, 0xff]);
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
