import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const configFileName = "src/env-config.js";

export function parseDotEnv(source) {
  const values = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim();
    values[key] = stripWrappingQuotes(value);
  }

  return values;
}

export function normalizeFriendAdCaptionFlag(value) {
  if (value === undefined || value === "") {
    return 1;
  }

  const normalizedValue = String(value).trim();

  if (normalizedValue === "0") {
    return 0;
  }

  if (normalizedValue === "1") {
    return 1;
  }

  throw new Error("SHOW_FRIEND_AD_CAPTION must be 0 or 1.");
}

export function generateRuntimeEnvConfig(dotEnvSource) {
  const envValues = parseDotEnv(dotEnvSource);
  const showFriendAdCaption = normalizeFriendAdCaptionFlag(envValues.SHOW_FRIEND_AD_CAPTION);

  return `// This file is generated from .env by scripts/env-config.mjs.
export const SHOW_FRIEND_AD_CAPTION = ${showFriendAdCaption};
`;
}

export async function writeRuntimeEnvConfig({ rootDirectory = process.cwd() } = {}) {
  const dotEnvPath = path.join(rootDirectory, ".env");
  const configPath = path.join(rootDirectory, configFileName);
  let dotEnvSource = "";

  try {
    dotEnvSource = await readFile(dotEnvPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await writeFile(configPath, generateRuntimeEnvConfig(dotEnvSource), "utf8");
}

function stripWrappingQuotes(value) {
  const firstCharacter = value.at(0);
  const lastCharacter = value.at(-1);

  if ((firstCharacter === '"' || firstCharacter === "'") && firstCharacter === lastCharacter) {
    return value.slice(1, -1);
  }

  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeRuntimeEnvConfig();
}
