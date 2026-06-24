import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_GROUP_AVATAR_PROFILE_COUNT,
  getDefaultGroupAvatarItemIndexes,
} from "../src/group-avatar-profiles.js";

test("group avatar default profile selection uses three no-profile tiles", () => {
  const selectedIndexes = getDefaultGroupAvatarItemIndexes(54, () => 0);

  assert.equal(DEFAULT_GROUP_AVATAR_PROFILE_COUNT, 3);
  assert.deepEqual(selectedIndexes, new Set([0, 1, 2]));
});

test("group avatar default profile selection clamps to available profile tiles", () => {
  assert.deepEqual(getDefaultGroupAvatarItemIndexes(2, () => 0), new Set([0, 1]));
  assert.deepEqual(getDefaultGroupAvatarItemIndexes(0, () => 0), new Set());
});

test("group avatar tiles can render the default no-profile image", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const previewAssets = await readFile(new URL("../src/preview-assets.js", import.meta.url), "utf8");

  assert.match(app, /from "\.\/group-avatar-profiles\.js"/);
  assert.match(app, /getDefaultGroupAvatarItemIndexes\(items\.length\)/);
  assert.match(app, /classList\.add\("is-default-profile"\)/);
  assert.match(app, /style\.removeProperty\("--group-avatar-image"\)/);
  assert.match(css, /\.avatar\.default-profile,\s*\.avatar\.group-avatar \.group-avatar-item\.is-default-profile\s*\{/);
  assert.match(css, /--preview-default-profile-image/);
  assert.match(previewAssets, /"--preview-default-profile-image": cssUrl\(PREVIEW_DEFAULT_IMAGE_PATHS\.profileImage\)/);
});
