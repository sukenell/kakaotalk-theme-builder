import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildAndroidEntries, buildIosEntries } from "../src/theme-builder.js";
import { cloneDefaultThemeState } from "../src/theme-model.js";
import { createStoredZip } from "../src/zip-utils.js";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "assets", "template-manifest.json"), "utf8"));
const outputDirectory = path.join(root, "tmp");

async function readTemplateEntries(kind) {
  return Promise.all(
    manifest[kind].map(async (entry) => ({
      name: entry.name,
      data: new Uint8Array(await readFile(path.join(root, entry.url))),
    })),
  );
}

const state = cloneDefaultThemeState();
state.appName = "Smoke Test Theme";
state.themeId = "com.example.smoketest";
state.colors.chatBackground = "#DDEEFF";
state.colors.headerText = "#233142";

await mkdir(outputDirectory, { recursive: true });

const iosEntries = buildIosEntries(await readTemplateEntries("ios"), { state });
const androidEntries = buildAndroidEntries(await readTemplateEntries("android"), { state });

await writeFile(path.join(outputDirectory, "smoke-ios.ktheme"), createStoredZip(iosEntries));
await writeFile(
  path.join(outputDirectory, "smoke-android-source.zip"),
  createStoredZip(androidEntries),
);

console.log("Wrote tmp/smoke-ios.ktheme");
console.log("Wrote tmp/smoke-android-source.zip");
