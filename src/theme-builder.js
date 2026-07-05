import {
  IMAGE_TARGETS,
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
const transparentPngBytes = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0,
  0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 15, 4, 0, 9, 251, 3,
  253, 160, 172, 220, 170, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);
const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

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

function getUploadDataForTarget(upload, name, { allowFallback = true } = {}) {
  if (upload?.cleared) {
    return allowFallback ? transparentPngBytes : undefined;
  }

  if (!upload || upload instanceof Uint8Array || upload instanceof ArrayBuffer) {
    return allowFallback ? upload : undefined;
  }

  return upload.variants?.[name] ?? (allowFallback ? upload.data ?? upload.bytes : undefined);
}

function buildReplacementMap(uploads, platform) {
  const replacements = new Map();

  for (const [uploadKey, upload] of Object.entries(uploads || {})) {
    const target = IMAGE_TARGETS[uploadKey];
    if (!target || !upload) {
      continue;
    }

    for (const name of target[platform] || []) {
      const data = getUploadDataForTarget(upload, name, {
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

function colorForKey(state, key) {
  return state?.colors?.[key] ?? defaultThemeState.colors[key];
}

function addClearedAndroidTabBackgroundReplacement(replacements, state, uploads) {
  if (uploads?.tabBackground?.cleared !== true) {
    return;
  }

  const tabBackground = createSolidNinePatchPngBytes(colorForKey(state, "tabBackground"));
  for (const name of IMAGE_TARGETS.tabBackground.android || []) {
    replacements.set(name, tabBackground);
  }
}

function buildGeneratedAndroidSelectors(uploads) {
  return new Map(
    androidGeneratedTabSelectors
      .filter((selector) => hasUpload(uploads, selector.normalKey) && hasUpload(uploads, selector.selectedKey))
      .map((selector) => [selector.name, encoder.encode(buildAndroidSelectorXml(selector))]),
  );
}

export function buildIosEntries(templateEntries, { state, uploads = {} }) {
  const replacements = buildReplacementMap(uploads, "ios");

  const entries = templateEntries.map((entry) => {
    if (entry.name === "KakaoTalkTheme.css") {
      return {
        name: entry.name,
        data: encoder.encode(patchIosThemeCss(asText(entry.data), state)),
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
  const replacements = buildReplacementMap(uploads, "android");
  addClearedAndroidTabBackgroundReplacement(replacements, state, uploads);
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

      return !target.android?.some((name) => getUploadDataForTarget(uploads[key], name, { allowFallback: false }));
    })
    .map((key) => IMAGE_TARGETS[key].label);
}
