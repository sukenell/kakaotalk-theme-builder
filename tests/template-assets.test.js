import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import zlib from "node:zlib";

function readUInt32(data, offset) {
  return data.readUInt32BE(offset);
}

function unfilterPngScanlines(raw, width, height) {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    const rowStart = y * stride;
    const previousRowStart = rowStart - stride;

    for (let x = 0; x < stride; x += 1) {
      const rawValue = raw[sourceOffset + x];
      const left = x >= bytesPerPixel ? pixels[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[previousRowStart + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[previousRowStart + x - bytesPerPixel] : 0;
      let value = rawValue;

      if (filter === 1) {
        value += left;
      } else if (filter === 2) {
        value += up;
      } else if (filter === 3) {
        value += Math.floor((left + up) / 2);
      } else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }

      pixels[rowStart + x] = value & 0xff;
    }

    sourceOffset += stride;
  }

  return pixels;
}

async function readRgbaPng(path) {
  const data = await readFile(new URL(path, import.meta.url));
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < data.length) {
    const length = readUInt32(data, offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    const chunk = data.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = readUInt32(chunk, 0);
      height = readUInt32(chunk, 4);
      assert.equal(chunk[8], 8, "Only 8-bit PNGs are supported in this asset test");
      colorType = chunk[9];
      assert.equal(chunk[12], 0, "Interlaced PNGs are not supported in this asset test");
    } else if (type === "IDAT") {
      idatChunks.push(chunk);
    } else if (type === "IEND") {
      break;
    }

    offset += length + 12;
  }

  assert.equal(colorType, 6, "Only RGBA PNGs are supported in this asset test");

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  return { width, height, pixels: unfilterPngScanlines(raw, width, height) };
}

function alphaAt(image, x, y) {
  return image.pixels[(y * image.width + x) * 4 + 3];
}

test("additional chat bubble template images do not include a visible tail", async () => {
  const sendAdditional = await readRgbaPng("../assets/templates/ios/Images/chatroomBubbleSend02@3x.png");
  const sendAdditional2x = await readRgbaPng("../assets/templates/ios/Images/chatroomBubbleSend02@2x.png");
  const sendAdditionalSelected = await readRgbaPng("../assets/templates/ios/Images/chatroomBubbleSend02Selected@3x.png");
  const sendAdditionalSelected2x = await readRgbaPng("../assets/templates/ios/Images/chatroomBubbleSend02Selected@2x.png");
  const receiveAdditional = await readRgbaPng("../assets/templates/ios/Images/chatroomBubbleReceive02@3x.png");
  const receiveAdditional2x = await readRgbaPng("../assets/templates/ios/Images/chatroomBubbleReceive02@2x.png");
  const receiveAdditionalSelected = await readRgbaPng("../assets/templates/ios/Images/chatroomBubbleReceive02Selected@3x.png");
  const receiveAdditionalSelected2x = await readRgbaPng("../assets/templates/ios/Images/chatroomBubbleReceive02Selected@2x.png");
  const androidSendAdditional = await readRgbaPng(
    "../assets/templates/android-source/src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_02_image.9.png",
  );
  const androidReceiveAdditional = await readRgbaPng(
    "../assets/templates/android-source/src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_you_02_image.9.png",
  );

  assert.equal(alphaAt(sendAdditional, 116, 98), 0);
  assert.equal(alphaAt(sendAdditional2x, 77, 65), 0);
  assert.equal(alphaAt(sendAdditionalSelected, 116, 98), 0);
  assert.equal(alphaAt(sendAdditionalSelected2x, 77, 65), 0);
  assert.equal(alphaAt(receiveAdditional, 4, 98), 0);
  assert.equal(alphaAt(receiveAdditional2x, 3, 65), 0);
  assert.equal(alphaAt(receiveAdditionalSelected, 4, 98), 0);
  assert.equal(alphaAt(receiveAdditionalSelected2x, 3, 65), 0);
  assert.equal(alphaAt(androidSendAdditional, 119, 106), 0);
  assert.equal(alphaAt(androidReceiveAdditional, 5, 106), 0);
});
