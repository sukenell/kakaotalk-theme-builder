import assert from "node:assert/strict";
import test from "node:test";

import { createStoredZip } from "../src/zip-utils.js";

function listCentralDirectoryNames(zipBytes) {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  let offset = zipBytes.length - 22;
  while (offset >= 0 && view.getUint32(offset, true) !== 0x06054b50) {
    offset -= 1;
  }
  assert.ok(offset >= 0, "end of central directory is present");

  const entryCount = view.getUint16(offset + 10, true);
  let directoryOffset = view.getUint32(offset + 16, true);
  const decoder = new TextDecoder();
  const names = [];

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(view.getUint32(directoryOffset, true), 0x02014b50);
    const nameLength = view.getUint16(directoryOffset + 28, true);
    const extraLength = view.getUint16(directoryOffset + 30, true);
    const commentLength = view.getUint16(directoryOffset + 32, true);
    const nameStart = directoryOffset + 46;
    names.push(decoder.decode(zipBytes.slice(nameStart, nameStart + nameLength)));
    directoryOffset = nameStart + nameLength + extraLength + commentLength;
  }

  return names;
}

test("createStoredZip writes central directory entries with UTF-8 names", () => {
  const zip = createStoredZip([
    { name: "KakaoTalkTheme.css", data: "body { color: #111111; }" },
    { name: "Images/채팅.png", data: new Uint8Array([1, 2, 3, 4]) },
  ]);

  assert.deepEqual(listCentralDirectoryNames(zip), [
    "KakaoTalkTheme.css",
    "Images/채팅.png",
  ]);
});
