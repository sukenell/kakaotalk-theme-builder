export function normalizeTintColor(value) {
  const color = String(value || "").trim();
  const longHex = color.match(/^#([0-9a-f]{6})$/i);

  if (longHex) {
    return `#${longHex[1].toUpperCase()}`;
  }

  const shortHex = color.match(/^#([0-9a-f]{3})$/i);
  if (!shortHex) {
    return "";
  }

  return `#${shortHex[1]
    .split("")
    .map((part) => `${part}${part}`)
    .join("")
    .toUpperCase()}`;
}

function tintColorToRgb(color) {
  const normalized = normalizeTintColor(color);
  if (!normalized) {
    return undefined;
  }

  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function tintImageDataPixels(imageData, color) {
  const rgb = tintColorToRgb(color);
  if (!rgb) {
    return imageData;
  }

  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue;
    }

    data[index] = rgb.red;
    data[index + 1] = rgb.green;
    data[index + 2] = rgb.blue;
  }

  return imageData;
}
