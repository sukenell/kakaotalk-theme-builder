import {
  IMAGE_TARGETS,
  patchAndroidBuildGradle,
  patchAndroidColorsXml,
  patchAndroidManifestXml,
  patchAndroidStringsXml,
  patchIosThemeCss,
} from "./theme-model.js";

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const transparentPngBytes = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0,
  0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 15, 4, 0, 9, 251, 3,
  253, 160, 172, 220, 170, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

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
    return transparentPngBytes;
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

export function buildIosEntries(templateEntries, { state, uploads = {} }) {
  const replacements = buildReplacementMap(uploads, "ios");

  return templateEntries.map((entry) => {
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
}

export function buildAndroidEntries(templateEntries, { state, uploads = {} }) {
  const replacements = buildReplacementMap(uploads, "android");

  return templateEntries.map((entry) => {
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
        data: encoder.encode(patchAndroidColorsXml(asText(entry.data), state)),
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
}

export function getSkippedAndroidUploads(uploads) {
  return Object.keys(uploads || {})
    .filter((key) => {
      const target = IMAGE_TARGETS[key];
      if (!target?.androidRequiresNinePatch) {
        return false;
      }

      return !target.android?.some((name) => getUploadDataForTarget(uploads[key], name, { allowFallback: false }));
    })
    .map((key) => IMAGE_TARGETS[key].label);
}
