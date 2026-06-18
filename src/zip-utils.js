const encoder = new TextEncoder();

let crcTable;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[index] = value >>> 0;
  }

  return crcTable;
}

export function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

export function toUint8Array(data) {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return encoder.encode(String(data));
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function pushUint16(chunks, value) {
  chunks.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushUint32(chunks, value) {
  chunks.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function concat(parts, totalLength) {
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function bytesFromNumbers(numbers) {
  return new Uint8Array(numbers);
}

export function createStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  let totalLength = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = toUint8Array(entry.data);
    const checksum = crc32(dataBytes);

    const localHeaderNumbers = [];
    pushUint32(localHeaderNumbers, 0x04034b50);
    pushUint16(localHeaderNumbers, 20);
    pushUint16(localHeaderNumbers, 0x0800);
    pushUint16(localHeaderNumbers, 0);
    pushUint16(localHeaderNumbers, dosTime);
    pushUint16(localHeaderNumbers, dosDate);
    pushUint32(localHeaderNumbers, checksum);
    pushUint32(localHeaderNumbers, dataBytes.length);
    pushUint32(localHeaderNumbers, dataBytes.length);
    pushUint16(localHeaderNumbers, nameBytes.length);
    pushUint16(localHeaderNumbers, 0);

    const localHeader = bytesFromNumbers(localHeaderNumbers);
    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeaderNumbers = [];
    pushUint32(centralHeaderNumbers, 0x02014b50);
    pushUint16(centralHeaderNumbers, 20);
    pushUint16(centralHeaderNumbers, 20);
    pushUint16(centralHeaderNumbers, 0x0800);
    pushUint16(centralHeaderNumbers, 0);
    pushUint16(centralHeaderNumbers, dosTime);
    pushUint16(centralHeaderNumbers, dosDate);
    pushUint32(centralHeaderNumbers, checksum);
    pushUint32(centralHeaderNumbers, dataBytes.length);
    pushUint32(centralHeaderNumbers, dataBytes.length);
    pushUint16(centralHeaderNumbers, nameBytes.length);
    pushUint16(centralHeaderNumbers, 0);
    pushUint16(centralHeaderNumbers, 0);
    pushUint16(centralHeaderNumbers, 0);
    pushUint16(centralHeaderNumbers, 0);
    pushUint32(centralHeaderNumbers, entry.name.endsWith("/") ? 0x10 : 0);
    pushUint32(centralHeaderNumbers, localOffset);

    const centralHeader = bytesFromNumbers(centralHeaderNumbers);
    centralParts.push(centralHeader, nameBytes);

    const localEntryLength = localHeader.length + nameBytes.length + dataBytes.length;
    localOffset += localEntryLength;
    totalLength += localEntryLength + centralHeader.length + nameBytes.length;
  }

  const centralDirectoryOffset = localOffset;
  const centralDirectoryLength = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endNumbers = [];
  pushUint32(endNumbers, 0x06054b50);
  pushUint16(endNumbers, 0);
  pushUint16(endNumbers, 0);
  pushUint16(endNumbers, entries.length);
  pushUint16(endNumbers, entries.length);
  pushUint32(endNumbers, centralDirectoryLength);
  pushUint32(endNumbers, centralDirectoryOffset);
  pushUint16(endNumbers, 0);

  const end = bytesFromNumbers(endNumbers);
  totalLength += end.length;

  return concat([...localParts, ...centralParts, end], totalLength);
}
