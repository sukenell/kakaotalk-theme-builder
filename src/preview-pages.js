export const PREVIEW_PAGES = [
  {
    id: "home",
    label: "메인",
    iconUrl: "https://cdn-icons-png.flaticon.com/512/25/25694.png",
    colorKeys: ["mainBackground", "headerText", "titleText", "paragraphText", "sectionTitle"],
    imageKeys: ["mainBackground", "tabBackground", "profileImage"],
  },
  {
    id: "chat",
    label: "채팅방",
    iconUrl: "https://cdn-icons-png.flaticon.com/512/2076/2076218.png",
    colorKeys: [
      "mainBackground",
      "chatBackground",
      "headerText",
      "descriptionText",
      "sendText",
      "receiveText",
      "inputBarBackground",
      "inputBarText",
      "inputMenu",
      "sendButton",
      "sendButtonText",
    ],
    imageKeys: ["chatBackground", "tabBackground", "profileImage", "sendBubble", "receiveBubble"],
  },
  {
    id: "passcode",
    label: "잠금화면",
    iconUrl: "https://cdn-icons-png.flaticon.com/512/483/483408.png",
    colorKeys: ["passcodeBackground", "passcodeText", "passcodeKeypadBackground"],
    imageKeys: ["passcodeDot", "passcodeDotSelected"],
  },
  {
    id: "theme-list",
    label: "테마 목록",
    iconUrl: "https://cdn-icons-png.flaticon.com/512/6919/6919181.png",
    colorKeys: ["mainBackground", "headerText", "titleText", "paragraphText", "sectionTitle"],
    imageKeys: ["themeIcon"],
  },
];

export function getNextPreviewIndex(currentIndex, direction) {
  const step = direction === "previous" ? -1 : 1;
  return (currentIndex + step + PREVIEW_PAGES.length) % PREVIEW_PAGES.length;
}

export function getPreviewColorKeys(pageId) {
  return PREVIEW_PAGES.find((page) => page.id === pageId)?.colorKeys ?? [];
}

export function getPreviewImageKeys(pageId) {
  return PREVIEW_PAGES.find((page) => page.id === pageId)?.imageKeys ?? [];
}

export function getPreviewIconUrl(pageId) {
  return PREVIEW_PAGES.find((page) => page.id === pageId)?.iconUrl ?? "";
}
