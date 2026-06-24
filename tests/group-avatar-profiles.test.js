import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_GROUP_AVATAR_PROFILE_RATE,
  getDefaultGroupAvatarItemIndex,
  shouldUseDefaultGroupAvatarProfile,
} from "../src/group-avatar-profiles.js";

test("group avatar default profile selection stays occasional", () => {
  assert.equal(DEFAULT_GROUP_AVATAR_PROFILE_RATE > 0, true);
  assert.equal(DEFAULT_GROUP_AVATAR_PROFILE_RATE < 0.5, true);
  assert.equal(shouldUseDefaultGroupAvatarProfile(() => DEFAULT_GROUP_AVATAR_PROFILE_RATE - 0.001), true);
  assert.equal(shouldUseDefaultGroupAvatarProfile(() => DEFAULT_GROUP_AVATAR_PROFILE_RATE), false);
});

test("group avatar default profile selection chooses a valid profile tile", () => {
  assert.equal(getDefaultGroupAvatarItemIndex(2, () => 0), 0);
  assert.equal(getDefaultGroupAvatarItemIndex(4, () => 0.999), 3);
  assert.equal(getDefaultGroupAvatarItemIndex(0, () => 0), -1);
});

test("group avatar tiles can render the default no-profile image", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const previewAssets = await readFile(new URL("../src/preview-assets.js", import.meta.url), "utf8");

  assert.match(app, /from "\.\/group-avatar-profiles\.js"/);
  assert.match(app, /classList\.add\("is-default-profile"\)/);
  assert.match(app, /style\.removeProperty\("--group-avatar-image"\)/);
  assert.match(css, /\.avatar\.default-profile,\s*\.avatar\.group-avatar \.group-avatar-item\.is-default-profile\s*\{/);
  assert.match(css, /--preview-default-profile-image/);
  assert.match(previewAssets, /"--preview-default-profile-image": cssUrl\(PREVIEW_DEFAULT_IMAGE_PATHS\.profileImage\)/);
});
