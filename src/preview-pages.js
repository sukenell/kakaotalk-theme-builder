import { ADDITIONAL_IMAGE_KEYS, CHAT_BUBBLE_IMAGE_KEYS, VISIBLE_TAB_ICON_IMAGE_KEYS } from "./theme-model.js";

export { ADDITIONAL_IMAGE_KEYS, CHAT_BUBBLE_IMAGE_KEYS, VISIBLE_TAB_ICON_IMAGE_KEYS };

const mainTabColorKeys = [
  "mainBackground",
  "tabBackground",
  "headerText",
  "titleText",
  "paragraphText",
  "sectionTitle",
  "bodyPressed",
  "titlePressed",
];

const mainTabImageKeys = [
  "mainBackground",
  "tabBackground",
  ...VISIBLE_TAB_ICON_IMAGE_KEYS,
  "profileImage",
];

const iosImage = (name) => `./assets/template-images/ios/Images/${name}`;
const headerIcon = (name) => `./assets/preview/header-icons/${name}`;
const pageIcon = (name) => `./assets/preview/page-icons/${name}`;

export const PREVIEW_PAGES = [
  {
    id: "home",
    label: "메인",
    iconUrl: iosImage("maintabIcoFriends@3x.png"),
    colorKeys: [
      "mainBackground",
      "tabBackground",
      "headerText",
      "titleText",
      "paragraphText",
      "sectionTitle",
      "bodyPressed",
      "titlePressed",
    ],
    imageKeys: [
      "mainBackground",
      "tabBackground",
      ...VISIBLE_TAB_ICON_IMAGE_KEYS,
      "profileImage",
      "profileFullImage",
      "addFriendButton",
      "addFriendButtonPressed",
    ],
  },
  {
    id: "chat-list",
    label: "대화 목록",
    iconUrl: iosImage("maintabIcoChats@3x.png"),
    colorKeys: ["mainBackground", "tabBackground", "headerText", "titleText", "paragraphText", "sectionTitle"],
    imageKeys: [
      "mainBackground",
      "tabBackground",
      ...VISIBLE_TAB_ICON_IMAGE_KEYS,
      "profileImage",
      "profileFullImage",
      "addFriendButton",
      "addFriendButtonPressed",
    ],
  },
  {
    id: "open-chat",
    label: "지금",
    iconUrl: iosImage("maintabIcoNow@3x.png"),
    colorKeys: mainTabColorKeys,
    imageKeys: mainTabImageKeys,
  },
  {
    id: "shopping",
    label: "쇼핑",
    iconUrl: iosImage("maintabIcoShopping@3x.png"),
    colorKeys: mainTabColorKeys,
    imageKeys: mainTabImageKeys,
  },
  {
    id: "more",
    label: "더보기",
    iconUrl: iosImage("maintabIcoMore@3x.png"),
    colorKeys: mainTabColorKeys,
    imageKeys: mainTabImageKeys,
  },
  {
    id: "chat",
    label: "채팅방",
    iconUrl: headerIcon("headerCompose.png"),
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
    imageKeys: ["chatBackground", "profileImage", ...CHAT_BUBBLE_IMAGE_KEYS],
  },
  {
    id: "passcode",
    label: "잠금화면",
    iconUrl: pageIcon("lock.svg"),
    colorKeys: ["passcodeBackground", "passcodeText", "passcodeKeypadBackground"],
    imageKeys: ["passcodeBackgroundImage", "passcodeDot", "passcodeDotSelected"],
  },
  {
    id: "splash",
    label: "로딩화면",
    iconUrl: pageIcon("loading.svg"),
    colorKeys: [],
    imageKeys: ["splashImage"],
  },
  {
    id: "theme-list",
    label: "테마 목록",
    iconUrl: pageIcon("brush.svg"),
    colorKeys: ["mainBackground", "headerText", "titleText", "paragraphText", "sectionTitle"],
    imageKeys: ["themeIcon", ...ADDITIONAL_IMAGE_KEYS.filter((key) => key.startsWith("themeIcon"))],
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
