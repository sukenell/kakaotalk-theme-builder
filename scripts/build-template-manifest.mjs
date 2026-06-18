import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const templateRoot = path.join(root, "assets", "templates");
const outputPath = path.join(root, "assets", "template-manifest.json");

const groups = {
  ios: "ios",
  android: "android-source",
};

async function walk(directory, baseDirectory) {
  const entries = [];
  const children = await readdir(directory, { withFileTypes: true });

  for (const child of children) {
    if (child.name.startsWith(".") || child.name === "__MACOSX") {
      continue;
    }

    const fullPath = path.join(directory, child.name);
    const relativePath = path.relative(baseDirectory, fullPath).split(path.sep).join("/");

    if (child.isDirectory()) {
      entries.push(...(await walk(fullPath, baseDirectory)));
      continue;
    }

    const fileStat = await stat(fullPath);
    entries.push({
      name: relativePath,
      url: `assets/templates/${path.relative(templateRoot, fullPath).split(path.sep).join("/")}`,
      size: fileStat.size,
    });
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

const manifest = {};

for (const [key, directoryName] of Object.entries(groups)) {
  manifest[key] = await walk(path.join(templateRoot, directoryName), path.join(templateRoot, directoryName));
}

await writeFile(`${outputPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wrote ${outputPath}`);
console.log(`iOS files: ${manifest.ios.length}`);
console.log(`Android files: ${manifest.android.length}`);
