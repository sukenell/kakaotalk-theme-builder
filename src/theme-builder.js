import {
  IMAGE_TARGETS,
  TAB_ICON_IMAGE_KEYS,
  defaultThemeState,
  patchAndroidBuildGradle,
  patchAndroidColorsXml,
  patchAndroidManifestXml,
  patchAndroidStringsXml,
  patchIosThemeCss,
} from "./theme-model.js";
import { crc32 } from "./zip-utils.js";

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const clearedBackgroundImageColorKeys = {
  mainBackground: "mainBackground",
  chatBackground: "mainBackground",
  tabBackground: "tabBackground",
  passcodeBackgroundImage: "mainBackground",
};
const iosBubbleLayoutKeys = {
  "MessageCellStyle-Send": [
    "sendBubbleNormal",
    "sendBubbleSelected",
    "sendBubbleTailless",
    "sendBubbleTaillessSelected",
  ],
  "MessageCellStyle-Receive": [
    "receiveBubbleNormal",
    "receiveBubbleSelected",
    "receiveBubbleTailless",
    "receiveBubbleTaillessSelected",
  ],
};
const bubbleNinePatchReferenceSize = {
  width: 124,
  height: 114,
};
const defaultBubbleNinePatchPadding = {
  paddingX: [41, 81],
  paddingY: [38, 75],
};
const defaultIosBubbleInsetPx = 10;

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function writeUint32BE(output, offset, value) {
  output[offset] = (value >>> 24) & 0xff;
  output[offset + 1] = (value >>> 16) & 0xff;
  output[offset + 2] = (value >>> 8) & 0xff;
  output[offset + 3] = value & 0xff;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;

  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }

  return ((b << 16) | a) >>> 0;
}

function createStoredZlibStream(bytes) {
  const parts = [new Uint8Array([0x78, 0x01])];
  let offset = 0;

  do {
    const remaining = bytes.length - offset;
    const length = Math.min(remaining, 65535);
    const isFinalBlock = offset + length >= bytes.length;
    const blockHeader = new Uint8Array(5);
    const inverseLength = (~length) & 0xffff;

    blockHeader[0] = isFinalBlock ? 1 : 0;
    blockHeader[1] = length & 0xff;
    blockHeader[2] = (length >>> 8) & 0xff;
    blockHeader[3] = inverseLength & 0xff;
    blockHeader[4] = (inverseLength >>> 8) & 0xff;
    parts.push(blockHeader, bytes.subarray(offset, offset + length));
    offset += length;
  } while (offset < bytes.length);

  const checksum = new Uint8Array(4);
  writeUint32BE(checksum, 0, adler32(bytes));
  parts.push(checksum);

  return concatBytes(parts);
}

function pngChunk(type, data) {
  const typeBytes = encoder.encode(type);
  const output = new Uint8Array(12 + data.length);
  writeUint32BE(output, 0, data.length);
  output.set(typeBytes, 4);
  output.set(data, 8);
  writeUint32BE(output, 8 + data.length, crc32(concatBytes([typeBytes, data])));

  return output;
}

function parseAndroidColor(value, fallback = "#FFFFFF") {
  const color = String(value || fallback)
    .trim()
    .replace(/^#/, "")
    .toUpperCase();
  const hex = /^[0-9A-F]{6}$/.test(color) || /^[0-9A-F]{8}$/.test(color) ? color : fallback.replace(/^#/, "");

  if (hex.length === 8) {
    return [
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
      Number.parseInt(hex.slice(6, 8), 16),
      Number.parseInt(hex.slice(0, 2), 16),
    ];
  }

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    0xff,
  ];
}

function createSolidPngBytes(colorValue) {
  const raw = new Uint8Array(5);
  raw[0] = 0;
  raw.set(parseAndroidColor(colorValue, "#00000000"), 1);

  const ihdr = new Uint8Array(13);
  writeUint32BE(ihdr, 0, 1);
  writeUint32BE(ihdr, 4, 1);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return concatBytes([
    pngSignature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", createStoredZlibStream(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

function createSolidNinePatchPngBytes(colorValue) {
  const width = 4;
  const height = 4;
  const stride = width * 4;
  const raw = new Uint8Array(height * (stride + 1));
  const color = parseAndroidColor(colorValue);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    raw[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const offset = rowOffset + 1 + x * 4;
      const isStretchMarker =
        (y === 0 && x > 0 && x < width - 1) ||
        (x === 0 && y > 0 && y < height - 1) ||
        (y === height - 1 && x > 0 && x < width - 1) ||
        (x === width - 1 && y > 0 && y < height - 1);
      const isContent = x > 0 && x < width - 1 && y > 0 && y < height - 1;
      const pixel = isStretchMarker ? [0, 0, 0, 0xff] : isContent ? color : [0, 0, 0, 0];

      raw.set(pixel, offset);
    }
  }

  const ihdr = new Uint8Array(13);
  writeUint32BE(ihdr, 0, width);
  writeUint32BE(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return concatBytes([
    pngSignature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", createStoredZlibStream(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

const transparentPngBytes = createSolidPngBytes("#00000000");

const androidGeneratedTabSelectors = [
  {
    normalKey: "tabOpenChatIcon",
    selectedKey: "tabOpenChatIconSelected",
    name: "src/main/theme-adv/drawable/theme_tab_open_chat_icon.xml",
    normalDrawable: "theme_maintab_ico_openchat_image",
    selectedDrawable: "theme_maintab_ico_openchat_focused_image",
  },
  {
    normalKey: "tabFindIcon",
    selectedKey: "tabFindIconSelected",
    name: "src/main/theme-adv/drawable/theme_tab_find_icon.xml",
    normalDrawable: "theme_maintab_ico_find_image",
    selectedDrawable: "theme_maintab_ico_find_focused_image",
  },
  {
    normalKey: "tabGameIcon",
    selectedKey: "tabGameIconSelected",
    name: "src/main/theme-adv/drawable/theme_tab_game_icon.xml",
    normalDrawable: "theme_maintab_ico_game_image",
    selectedDrawable: "theme_maintab_ico_game_focused_image",
  },
];

function asText(data) {
  return typeof data === "string" ? data : decoder.decode(data);
}

function asBytes(data) {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return encoder.encode(String(data));
}

function getClearedUploadDataForTarget(uploadKey, name, state, { allowFallback = true } = {}) {
  const colorKey = clearedBackgroundImageColorKeys[uploadKey];
  if (colorKey) {
    const color = colorForKey(state, colorKey);
    return name.endsWith(".9.png") ? createSolidNinePatchPngBytes(color) : createSolidPngBytes(color);
  }

  return allowFallback ? transparentPngBytes : undefined;
}

function getUploadDataForTarget(uploadKey, upload, name, state, { allowFallback = true } = {}) {
  if (upload?.cleared) {
    return getClearedUploadDataForTarget(uploadKey, name, state, { allowFallback });
  }

  if (!upload || upload instanceof Uint8Array || upload instanceof ArrayBuffer) {
    return allowFallback ? upload : undefined;
  }

  return upload.variants?.[name] ?? (allowFallback ? upload.data ?? upload.bytes : undefined);
}

function buildReplacementMap(uploads, platform, state) {
  const replacements = new Map();

  for (const [uploadKey, upload] of Object.entries(uploads || {})) {
    const target = IMAGE_TARGETS[uploadKey];
    if (!target || !upload) {
      continue;
    }

    for (const name of target[platform] || []) {
      const data = getUploadDataForTarget(uploadKey, upload, name, state, {
        allowFallback: !(platform === "android" && target.androidRequiresNinePatch),
      });
      if (data) {
        replacements.set(name, data);
      }
    }
  }

  return replacements;
}

function appendMissingEntries(entries, additions) {
  const names = new Set(entries.map((entry) => entry.name));
  const result = [...entries];

  for (const [name, data] of additions) {
    if (names.has(name)) {
      continue;
    }
    names.add(name);
    result.push({ name, data: asBytes(data) });
  }

  return result;
}

function buildAndroidSelectorXml({ normalDrawable, selectedDrawable }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:state_selected="true" android:drawable="@drawable/${selectedDrawable}"/>
    <item android:drawable="@drawable/${normalDrawable}"/>
</selector>
`;
}

function hasUpload(uploads, key) {
  const upload = uploads?.[key];
  return Boolean(upload && !upload.cleared);
}

function hasTabIconUpload(uploads) {
  return TAB_ICON_IMAGE_KEYS.some((key) => hasUpload(uploads, key));
}

function colorForKey(state, key) {
  return state?.colors?.[key] ?? defaultThemeState.colors[key];
}

function buildGeneratedAndroidSelectors(uploads) {
  return new Map(
    androidGeneratedTabSelectors
      .filter((selector) => hasUpload(uploads, selector.normalKey) && hasUpload(uploads, selector.selectedKey))
      .map((selector) => [selector.name, encoder.encode(buildAndroidSelectorXml(selector))]),
  );
}

function buildIosBubbleEdgeInsets(uploads) {
  return Object.fromEntries(
    Object.entries(iosBubbleLayoutKeys).flatMap(([styleName, keys]) => {
      const layout = keys.map((key) => uploads?.[key]?.bubbleLayout).find(Boolean);
      const edgeInsets = layout ? convertBubbleLayoutToIosEdgeInsets(layout) : "";
      return edgeInsets ? [[styleName, edgeInsets]] : [];
    }),
  );
}

function convertBubbleLayoutToIosEdgeInsets(layout) {
  const insets = getBubbleLayoutInsets(layout);
  const defaultInsets = getBubbleLayoutInsets(defaultBubbleNinePatchPadding);

  return [
    scaleIosBubbleInset(insets.top, defaultInsets.top),
    scaleIosBubbleInset(insets.right, defaultInsets.right),
    scaleIosBubbleInset(insets.bottom, defaultInsets.bottom),
    scaleIosBubbleInset(insets.left, defaultInsets.left),
  ].join(" ");
}

function getBubbleLayoutInsets(layout) {
  const paddingX = normalizeNinePatchPair(layout?.paddingX, defaultBubbleNinePatchPadding.paddingX);
  const paddingY = normalizeNinePatchPair(layout?.paddingY, defaultBubbleNinePatchPadding.paddingY);
  const innerWidth = bubbleNinePatchReferenceSize.width - 2;
  const innerHeight = bubbleNinePatchReferenceSize.height - 2;

  return {
    top: Math.max(1, paddingY[0] - 1),
    right: Math.max(1, innerWidth - paddingX[1]),
    bottom: Math.max(1, innerHeight - paddingY[1]),
    left: Math.max(1, paddingX[0] - 1),
  };
}

function normalizeNinePatchPair(value, fallback) {
  if (!Array.isArray(value) || value.length < 2) {
    return [...fallback];
  }

  const first = Number(value[0]);
  const second = Number(value[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return [...fallback];
  }

  return [Math.round(first), Math.round(second)];
}

function scaleIosBubbleInset(value, defaultValue) {
  const scaledValue = Math.round((value / defaultValue) * defaultIosBubbleInsetPx);
  return `${Math.max(1, scaledValue)}px`;
}

export function buildIosEntries(templateEntries, { state, uploads = {} }) {
  const replacements = buildReplacementMap(uploads, "ios", state);
  const bubbleEdgeInsets = buildIosBubbleEdgeInsets(uploads);

  const entries = templateEntries.map((entry) => {
    if (entry.name === "KakaoTalkTheme.css") {
      return {
        name: entry.name,
        data: encoder.encode(patchIosThemeCss(asText(entry.data), state, { bubbleEdgeInsets })),
      };
    }

    if (replacements.has(entry.name)) {
      return {
        name: entry.name,
        data: asBytes(replacements.get(entry.name)),
      };
    }

    return {
      name: entry.name,
      data: asBytes(entry.data),
    };
  });

  return appendMissingEntries(entries, replacements);
}

export function buildAndroidEntries(templateEntries, { state, uploads = {} }) {
  const replacements = buildReplacementMap(uploads, "android", state);
  const generatedSelectors = buildGeneratedAndroidSelectors(uploads);

  const entries = templateEntries.map((entry) => {
    if (entry.name === "build.gradle.kts") {
      return {
        name: entry.name,
        data: encoder.encode(patchAndroidBuildGradle(asText(entry.data), state)),
      };
    }

    if (entry.name === "src/main/AndroidManifest.xml") {
      return {
        name: entry.name,
        data: encoder.encode(patchAndroidManifestXml(asText(entry.data), state)),
      };
    }

    if (entry.name === "src/main/theme/values/colors.xml") {
      return {
        name: entry.name,
        data: encoder.encode(
          patchAndroidColorsXml(asText(entry.data), state, {
            transparentMainBackgroundCells: hasUpload(uploads, "mainBackground"),
            transparentTabIconColors: hasTabIconUpload(uploads),
          }),
        ),
      };
    }

    if (
      entry.name === "src/main/theme/values/strings.xml" ||
      entry.name === "src/main/res/values/strings.xml" ||
      entry.name === "src/main/theme/values-ko/strings.xml" ||
      entry.name === "src/main/theme/values-ja/strings.xml" ||
      entry.name === "src/main/res/values-ko/strings.xml" ||
      entry.name === "src/main/res/values-ja/strings.xml"
    ) {
      return {
        name: entry.name,
        data: encoder.encode(patchAndroidStringsXml(asText(entry.data), state)),
      };
    }

    if (replacements.has(entry.name)) {
      return {
        name: entry.name,
        data: asBytes(replacements.get(entry.name)),
      };
    }

    return {
      name: entry.name,
      data: asBytes(entry.data),
    };
  });

  return appendMissingEntries(appendMissingEntries(entries, replacements), generatedSelectors);
}

export function getSkippedAndroidUploads(uploads) {
  return Object.keys(uploads || {})
    .filter((key) => {
      const target = IMAGE_TARGETS[key];
      if (uploads[key]?.cleared) {
        return false;
      }

      if (!target?.androidRequiresNinePatch) {
        return false;
      }

      return !target.android?.some((name) =>
        getUploadDataForTarget(key, uploads[key], name, undefined, { allowFallback: false }),
      );
    })
    .map((key) => IMAGE_TARGETS[key].label);
}
