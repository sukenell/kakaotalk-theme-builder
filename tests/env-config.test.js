import assert from "node:assert/strict";
import test from "node:test";

import {
  generateRuntimeEnvConfig,
  normalizeFriendAdCaptionFlag,
  parseDotEnv,
} from "../scripts/env-config.mjs";

test("dotenv parser reads SHOW_FRIEND_AD_CAPTION values", () => {
  assert.deepEqual(parseDotEnv("SHOW_FRIEND_AD_CAPTION=0\n# ignored\nOTHER=value"), {
    SHOW_FRIEND_AD_CAPTION: "0",
    OTHER: "value",
  });
});

test("friend ad caption flag supports only 0 or 1", () => {
  assert.equal(normalizeFriendAdCaptionFlag("0"), 0);
  assert.equal(normalizeFriendAdCaptionFlag("1"), 1);
  assert.equal(normalizeFriendAdCaptionFlag(undefined), 1);
  assert.throws(() => normalizeFriendAdCaptionFlag("2"), /SHOW_FRIEND_AD_CAPTION/);
});

test("runtime env config exports the friend ad caption flag", () => {
  assert.match(generateRuntimeEnvConfig("SHOW_FRIEND_AD_CAPTION=0"), /SHOW_FRIEND_AD_CAPTION = 0;/);
  assert.match(generateRuntimeEnvConfig("SHOW_FRIEND_AD_CAPTION=1"), /SHOW_FRIEND_AD_CAPTION = 1;/);
});
