import { buildAndroidEntries, buildIosEntries, getSkippedAndroidUploads } from "./theme-builder.js";
import { SHOW_FRIEND_AD_CAPTION } from "./env-config.js";
import { applyPasscodeAction } from "./passcode-preview.js";
import { getNextPreviewIndex, getPreviewColorKeys, getPreviewImageKeys, PREVIEW_PAGES } from "./preview-pages.js";
import {
  ADDITIONAL_IMAGE_KEYS,
  CHAT_BUBBLE_IMAGE_KEYS,
  TAB_ICON_IMAGE_KEYS,
  VISIBLE_TAB_ICON_IMAGE_KEYS,
  cloneDefaultThemeState,
  defaultThemeState,
  getActiveColors,
  IMAGE_TARGETS,
  isValidThemeVersion,
  normalizeThemeVersion,
  sanitizeThemeIdSegment,
  setActiveColor,
} from "./theme-model.js";
import {
  applyPreviewDefaultImages,
  getPreviewDefaultCssUrl,
  getPreviewDefaultCssVariableValue,
  getPreviewDefaultImagePath,
  PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY,
  PREVIEW_IMAGE_FOLDERS,
} from "./preview-assets.js";
import { createStoredZip } from "./zip-utils.js";
import { formatKoreanDate, formatKoreanTime } from "./date-format.js";
import { normalizeTintColor, tintImageDataPixels } from "./image-tint.js";
import { getDefaultGroupAvatarItemIndexes } from "./group-avatar-profiles.js";

const colorControls = [
  ["mainBackground", "배경 색"],
  ["tabBackground", "하단 탭 배경 색"],
  ["chatBackground", "채팅방 배경"],
  ["headerText", "메인 글자 색"],
  ["titleText", "메뉴 글자 색"],
  ["descriptionText", "설명 텍스트"],
  ["paragraphText", "서브 글자색"],
  ["sectionTitle", "섹션 타이틀"],
  ["bodyPressed", "선택 메뉴 배경 색"],
  ["titlePressed", "선택 메뉴 글자 색"],
  ["sendText", "나의 글자 색"],
  ["receiveText", "상대 글자 색"],
  ["unreadCount", "레드닷 알림 색"],
  ["inputBarBackground", "입력창 배경"],
  ["inputBarText", "입력창 텍스트"],
  ["inputMenu", "입력창 메뉴"],
  ["sendButton", "전송 버튼"],
  ["sendButtonText", "전송 텍스트"],
  ["passcodeBackground", "암호 화면 배경"],
  ["passcodeText", "암호 텍스트"],
  ["passcodeKeypadBackground", "암호 키패드 배경"],
  ["notificationBackground", "알림 배경"],
];

const hiddenUploadKeys = new Set([
  "addFriendButton",
  "addFriendButtonPressed",
  "profileFullImage",
]);

const visibleAdditionalImageKeys = ADDITIONAL_IMAGE_KEYS.filter((key) => !hiddenUploadKeys.has(key));

const uploadKeys = [
  "mainBackground",
  "chatBackground",
  "tabBackground",
  ...VISIBLE_TAB_ICON_IMAGE_KEYS,
  "profileImage",
  "themeIcon",
  ...visibleAdditionalImageKeys,
  "splashImage",
  ...CHAT_BUBBLE_IMAGE_KEYS,
  "passcodeBackgroundImage",
  "passcodeDot",
  "passcodeDotSelected",
];

const previewImageVariables = PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY;

const bubbleUploadKeys = new Set(CHAT_BUBBLE_IMAGE_KEYS);
const tabIconUploadKeys = new Set(TAB_ICON_IMAGE_KEYS);
const tintableUploadKeys = new Set(VISIBLE_TAB_ICON_IMAGE_KEYS);
const clearableBackgroundImageKeys = new Set(["mainBackground", "chatBackground", "tabBackground", "passcodeBackgroundImage"]);
const defaultClearedImageUploadKeys = new Set(["mainBackground", "chatBackground", "tabBackground", "passcodeBackgroundImage"]);
const defaultUploadTintColor = "#000000";
const backgroundImageColorKeys = {
  mainBackground: "mainBackground",
  chatBackground: "chatBackground",
  tabBackground: "tabBackground",
  passcodeBackgroundImage: "passcodeBackground",
};
const tabIconUploadLabels = {
  tabFriendIcon: "친구1",
  tabFriendIconSelected: "친구2",
  tabChatIcon: "대화1",
  tabChatIconSelected: "대화2",
  tabOpenChatIcon: "지금1",
  tabOpenChatIconSelected: "지금2",
  tabShoppingIcon: "쇼핑1",
  tabShoppingIconSelected: "쇼핑2",
  tabMoreIcon: "더보기1",
  tabMoreIconSelected: "더보기2",
};

const uploadDisplaySizePlatforms = [
  ["ios", "IOS"],
  ["android", "Android"],
];

const previewBubbleSources = {
  "--preview-send-image": ["sendBubbleNormal"],
  "--preview-receive-image": ["receiveBubbleNormal"],
  "--preview-send-additional-image": ["sendBubbleTailless"],
  "--preview-receive-additional-image": ["receiveBubbleTailless"],
};

const phoneStatusWidget = {
  time: "9:41",
  network: "LTE",
  battery: "100%",
};

const friendProfileImages = [
  "./assets/preview/profile-images/profileImage_01.png",
  "./assets/preview/profile-images/profileImage_02.png",
  "./assets/preview/profile-images/profileImage_03.png",
  "./assets/preview/profile-images/profileImage_04.png",
  "./assets/preview/profile-images/profileImage_05.png",
  "./assets/preview/profile-images/profileImage_06.png",
  "./assets/preview/profile-images/profileImage_07.png",
];

const shoppingPreviewImages = [
  "./assets/preview/shopping-images/shoppingImage_01.png",
  "./assets/preview/shopping-images/shoppingImage_02.png",
  "./assets/preview/shopping-images/shoppingImage_03.png",
  "./assets/preview/shopping-images/shoppingImage_04.png",
];

const groupAvatarImages = [
  "./assets/preview/group-avatar-images/groupAvatar_01.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_02.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_03.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_04.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_05.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_06.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_07.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_08.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_09.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_10.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_11.jpg",
  "./assets/preview/group-avatar-images/groupAvatar_12.jpg",
];

const iosImageSizes = {
  "Images/maintabIcoFriends@2x.png": [76, 76],
  "Images/maintabIcoFriends@3x.png": [114, 114],
  "Images/maintabIcoFriendsSelected@2x.png": [76, 76],
  "Images/maintabIcoFriendsSelected@3x.png": [114, 114],
  "Images/maintabIcoChats@2x.png": [76, 76],
  "Images/maintabIcoChats@3x.png": [114, 114],
  "Images/maintabIcoChatsSelected@2x.png": [76, 76],
  "Images/maintabIcoChatsSelected@3x.png": [114, 114],
  "Images/maintabIcoNow@2x.png": [76, 76],
  "Images/maintabIcoNow@3x.png": [114, 114],
  "Images/maintabIcoNowSelected@2x.png": [76, 76],
  "Images/maintabIcoNowSelected@3x.png": [114, 114],
  "Images/maintabIcoShopping@2x.png": [76, 76],
  "Images/maintabIcoShopping@3x.png": [114, 114],
  "Images/maintabIcoShoppingSelected@2x.png": [76, 76],
  "Images/maintabIcoShoppingSelected@3x.png": [114, 114],
  "Images/maintabIcoMore@2x.png": [76, 76],
  "Images/maintabIcoMore@3x.png": [114, 114],
  "Images/maintabIcoMoreSelected@2x.png": [76, 76],
  "Images/maintabIcoMoreSelected@3x.png": [114, 114],
  "Images/maintabIcoCall@2x.png": [76, 76],
  "Images/maintabIcoCall@3x.png": [114, 114],
  "Images/maintabIcoCallSelected@2x.png": [76, 76],
  "Images/maintabIcoCallSelected@3x.png": [114, 114],
  "Images/maintabIcoPiccoma@2x.png": [76, 76],
  "Images/maintabIcoPiccoma@3x.png": [114, 114],
  "Images/maintabIcoPiccomaSelected@2x.png": [76, 76],
  "Images/maintabIcoPiccomaSelected@3x.png": [114, 114],
  "Images/findBtnAddFriend@2x.png": [84, 68],
  "Images/findBtnAddFriend@3x.png": [126, 102],
  "Images/chatroomBubbleSend01@2x.png": [80, 70],
  "Images/chatroomBubbleSend01@3x.png": [120, 105],
  "Images/chatroomBubbleSend01Selected@2x.png": [80, 70],
  "Images/chatroomBubbleSend01Selected@3x.png": [120, 105],
  "Images/chatroomBubbleSend02@2x.png": [80, 70],
  "Images/chatroomBubbleSend02@3x.png": [120, 105],
  "Images/chatroomBubbleSend02Selected@2x.png": [80, 70],
  "Images/chatroomBubbleSend02Selected@3x.png": [120, 105],
  "Images/chatroomBubbleReceive01@2x.png": [80, 70],
  "Images/chatroomBubbleReceive01@3x.png": [120, 105],
  "Images/chatroomBubbleReceive01Selected@2x.png": [80, 70],
  "Images/chatroomBubbleReceive01Selected@3x.png": [121, 105],
  "Images/chatroomBubbleReceive02@2x.png": [80, 70],
  "Images/chatroomBubbleReceive02@3x.png": [120, 105],
  "Images/chatroomBubbleReceive02Selected@2x.png": [80, 70],
  "Images/chatroomBubbleReceive02Selected@3x.png": [121, 105],
};

const androidNinePatchImageSizes = {
  "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_01_image.9.png": [124, 114],
  "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_02_image.9.png": [124, 114],
  "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_you_01_image.9.png": [124, 114],
  "src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_you_02_image.9.png": [124, 114],
};

const androidSplashImageSizes = {
  "src/main/theme/drawable-xxhdpi/theme_splash_image.png": [1440, 2560],
  "src/main/theme/drawable-xhdpi/theme_splash_image.png": [720, 1280],
  "src/main/theme/drawable-sw600dp/theme_splash_image.png": [1440, 2560],
  "src/main/theme/drawable-land-xxhdpi/theme_splash_image.png": [2560, 1440],
  "src/main/theme/drawable-land-xhdpi/theme_splash_image.png": [1280, 720],
  "src/main/theme/drawable-sw600dp-land/theme_splash_image.png": [2560, 1440],
};

const androidNinePatchMarkers = {
  stretchX: [41, 81],
  stretchY: [38, 75],
  paddingX: [41, 81],
  paddingY: [38, 75],
};

const state = cloneDefaultThemeState();
const uploads = Object.fromEntries([...defaultClearedImageUploadKeys].map((key) => [key, { cleared: true }]));
const previews = {};
const uploadTints = {};
const uploadRenderVersions = {};
const templateCache = new Map();
let currentPreviewIndex = 1;
let currentPreviewDevice = "phone";
let passcodeCount = 0;
let isDownloadBusy = false;

const settingsForm = document.querySelector("#settings-form");
const colorControlRoot = document.querySelector("#color-controls");
const uploadControlRoot = document.querySelector("#upload-controls");
const statusText = document.querySelector("#status-text");
const downloadTitle = document.querySelector("#download-title");
const downloadIosButton = document.querySelector("#download-ios");
const downloadAndroidButton = document.querySelector("#download-android");
const versionInput = document.querySelector("#version");
const chatScreen = document.querySelector("#chat-screen");
const previewTrack = document.querySelector("#preview-track");
const previewTabs = document.querySelector("#preview-tabs");
const previewFrame = document.querySelector("#preview-frame");
const previewPreviousButton = document.querySelector("#preview-previous");
const previewNextButton = document.querySelector("#preview-next");
const previewDeviceButtons = document.querySelectorAll("[data-preview-device]");
const passcodeScreen = document.querySelector(".passcode-screen");
const previewDateElements = document.querySelectorAll("[data-preview-date]");
const previewTimeElements = document.querySelectorAll("[data-preview-time]");
const documentRoot = document.documentElement;

applyPreviewDefaultImages(documentRoot);
applyFriendProfileImages();
applyShoppingPreviewImages();
applyGroupAvatarImages();
enableHorizontalDragScroll(".shopping-pick-carousel");
renderPhoneStatusWidgets();
applyFriendAdCaptionVisibility();

function setStatus(message) {
  statusText.textContent = message;
}

function createPhoneStatusWidget() {
  const time = document.createElement("span");
  time.textContent = phoneStatusWidget.time;

  const system = document.createElement("span");
  system.textContent = `${phoneStatusWidget.network} ${phoneStatusWidget.battery}`;

  return [time, system];
}

function renderPhoneStatusWidgets() {
  document.querySelectorAll("[data-phone-status]").forEach((status) => {
    status.replaceChildren(...createPhoneStatusWidget());
  });
}

function applyFriendAdCaptionVisibility() {
  const isVisible = Number(SHOW_FRIEND_AD_CAPTION) === 1;

  document.querySelectorAll("[data-friend-ad-caption]").forEach((caption) => {
    caption.hidden = !isVisible;
  });
}

function applyFriendProfileImages() {
  document.querySelectorAll("[data-profile-image-index]").forEach((avatar) => {
    const imageIndex = Number(avatar.dataset.profileImageIndex);
    const imagePath = friendProfileImages[imageIndex];

    if (imagePath) {
      avatar.style.setProperty("--friend-profile-image", `url("${imagePath}")`);
    }
  });
}

function applyShoppingPreviewImages() {
  document.querySelectorAll("[data-shopping-image-index]").forEach((thumbnail) => {
    const imageIndex = Number(thumbnail.dataset.shoppingImageIndex);
    const imagePath = shoppingPreviewImages[imageIndex];

    if (imagePath) {
      thumbnail.style.setProperty("--shopping-preview-image", `url("${imagePath}")`);
    }
  });
}

function enableHorizontalDragScroll(selector) {
  document.querySelectorAll(selector).forEach((scroller) => {
    let startX = 0;
    let startScrollLeft = 0;
    let activePointerId = null;

    scroller.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      activePointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = scroller.scrollLeft;
      scroller.classList.add("is-dragging");
      scroller.setPointerCapture(event.pointerId);
    });

    scroller.addEventListener("pointermove", (event) => {
      if (activePointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - startX;
      scroller.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    });

    const stopDrag = (event) => {
      if (activePointerId !== event.pointerId) {
        return;
      }

      activePointerId = null;
      scroller.classList.remove("is-dragging");
      if (scroller.hasPointerCapture(event.pointerId)) {
        scroller.releasePointerCapture(event.pointerId);
      }
    };

    scroller.addEventListener("pointerup", stopDrag);
    scroller.addEventListener("pointercancel", stopDrag);
  });
}

function applyGroupAvatarImages() {
  const items = Array.from(document.querySelectorAll(".avatar.group-avatar .group-avatar-item"));
  const defaultProfileIndexes = getDefaultGroupAvatarItemIndexes(items.length);

  items.forEach((item, index) => {
    const imagePath = groupAvatarImages[index % groupAvatarImages.length];

    if (defaultProfileIndexes.has(index)) {
      item.classList.add("is-default-profile");
      item.style.removeProperty("--group-avatar-image");
      return;
    }

    item.classList.remove("is-default-profile");

    if (imagePath) {
      item.style.setProperty("--group-avatar-image", `url("${imagePath}")`);
    }
  });
}

function setBusy(isBusy) {
  isDownloadBusy = isBusy;
  updateDownloadButtons();
}

function updateDownloadButtons() {
  const isVersionValid = isValidThemeVersion(state.version);
  const isDownloadDisabled = isDownloadBusy || !isVersionValid;
  const invalidVersionMessage = "버전은 숫자.숫자.숫자 형식으로 입력해주세요";

  downloadIosButton.disabled = isDownloadDisabled;
  downloadAndroidButton.disabled = isDownloadDisabled;
  downloadIosButton.title = isVersionValid ? "" : invalidVersionMessage;
  downloadAndroidButton.title = isVersionValid ? "" : invalidVersionMessage;

  if (versionInput) {
    versionInput.setAttribute("aria-invalid", String(!isVersionValid));
    versionInput.setCustomValidity(isVersionValid ? "" : invalidVersionMessage);
  }
}

function canDownloadTheme() {
  if (isValidThemeVersion(state.version)) {
    return true;
  }

  setStatus("버전은 숫자.숫자.숫자 형식으로 입력해주세요");
  updateDownloadButtons();
  return false;
}

function sanitizeFileName(value) {
  return String(value || "kakaotalk-theme")
    .trim()
    .replace(/[^a-z0-9가-힣._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "kakaotalk-theme";
}

function renderColorControls() {
  const page = PREVIEW_PAGES[currentPreviewIndex];
  const activeColorKeys = getPreviewColorKeys(page.id);
  const visibleControls = colorControls.filter(([key]) => activeColorKeys.includes(key));
  const colors = getActiveColors(state);

  colorControlRoot.replaceChildren(
    ...visibleControls.map(([key, label]) => {
      const row = document.createElement("div");
      row.className = "color-row";

      const text = document.createElement("label");
      text.htmlFor = `color-hex-${key}`;
      text.textContent = label;

      const input = document.createElement("input");
      input.id = `color-${key}`;
      input.type = "color";
      input.className = "color-native-input";
      input.ariaLabel = `${label} 색상 선택`;
      input.value = normalizeColorPickerValue(colors[key]);

      const picker = document.createElement("button");
      picker.type = "button";
      picker.className = "color-picker-control";
      picker.setAttribute("aria-expanded", "false");
      picker.setAttribute("aria-controls", `color-popover-${key}`);

      const swatch = document.createElement("span");
      swatch.className = "color-picker-swatch";

      const valueText = document.createElement("span");
      valueText.className = "color-picker-value";

      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "color-reset-button";
      resetButton.textContent = "초기화";

      const colorPopover = document.createElement("div");
      colorPopover.id = `color-popover-${key}`;
      colorPopover.className = "color-picker-popover";
      colorPopover.hidden = true;

      const hexInput = document.createElement("input");
      hexInput.id = `color-hex-${key}`;
      hexInput.type = "text";
      hexInput.className = "color-hex-input";
      hexInput.inputMode = "text";
      hexInput.spellcheck = false;
      hexInput.autocapitalize = "characters";
      hexInput.ariaLabel = `${label} HEX 컬러 코드`;
      hexInput.placeholder = "#RRGGBB";

      const syncResetState = (value) => {
        resetButton.disabled = normalizeHexColorInput(value) === normalizeHexColorInput(defaultThemeState.colors[key]);
      };

      const syncPickerState = (value) => {
        const normalizedValue = normalizeHexColorInput(value) || normalizeHexColorInput(defaultThemeState.colors[key]);
        valueText.textContent = normalizedValue;
        hexInput.value = normalizedValue;
        input.value = normalizeColorPickerValue(normalizedValue);
        picker.style.setProperty("--color-picker-swatch", toPreviewCssColor(normalizedValue));
        syncResetState(normalizedValue);
      };

      const applyColorValue = (value) => {
        const normalizedValue = normalizeHexColorInput(value);
        if (!normalizedValue) {
          return false;
        }

        setActiveColor(state, key, normalizedValue);
        syncPickerState(normalizedValue);
        updatePreview();
        return true;
      };

      const closeColorPopover = () => {
        colorPopover.hidden = true;
        picker.setAttribute("aria-expanded", "false");
      };

      picker.addEventListener("click", () => {
        const shouldOpen = colorPopover.hidden;
        colorControlRoot.querySelectorAll(".color-picker-popover").forEach((popover) => {
          if (popover !== colorPopover) {
            popover.hidden = true;
          }
        });
        colorControlRoot.querySelectorAll(".color-picker-control").forEach((control) => {
          if (control !== picker) {
            control.setAttribute("aria-expanded", "false");
          }
        });

        colorPopover.hidden = !shouldOpen;
        picker.setAttribute("aria-expanded", String(shouldOpen));
        if (shouldOpen) {
          requestAnimationFrame(() => {
            hexInput.focus();
            hexInput.select();
          });
        }
      });
      row.addEventListener("focusout", (event) => {
        if (!row.contains(event.relatedTarget)) {
          closeColorPopover();
        }
      });
      hexInput.addEventListener("input", () => {
        applyColorValue(hexInput.value);
      });
      hexInput.addEventListener("change", () => {
        const colors = getActiveColors(state);
        syncPickerState(colors[key]);
      });
      hexInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeColorPopover();
          picker.focus();
        }
        if (event.key === "Enter" && applyColorValue(hexInput.value)) {
          closeColorPopover();
          picker.focus();
        }
      });
      input.addEventListener("input", () => {
        applyColorValue(input.value);
      });
      resetButton.addEventListener("click", () => {
        applyColorValue(defaultThemeState.colors[key]);
      });

      syncPickerState(colors[key]);
      picker.append(swatch, valueText);
      colorPopover.append(hexInput, input);

      const inputs = document.createElement("div");
      inputs.className = "color-inputs";
      inputs.append(picker, resetButton, colorPopover);

      row.append(text, inputs);
      return row;
    }),
  );
}

function renderUploadControls() {
  const page = PREVIEW_PAGES[currentPreviewIndex];
  const activeImageKeys = getPreviewImageKeys(page.id);
  const visibleUploadKeys = uploadKeys.filter((key) => activeImageKeys.includes(key));

  uploadControlRoot.replaceChildren(
    ...visibleUploadKeys.map((key) => {
      const target = IMAGE_TARGETS[key];
      const item = document.createElement("div");
      item.className = "upload-item";

      const thumb = document.createElement("div");
      thumb.className = "upload-thumb";
      thumb.dataset.uploadThumb = key;
      applyUploadThumb(thumb, key);

      const label = document.createElement("div");
      label.className = "upload-label";
      appendUploadLabel(label, target, key);
      const metaText = getUploadMeta(key, target);
      if (metaText) {
        const meta = document.createElement("span");
        meta.textContent = metaText;
        label.append(meta);
      }

      const button = document.createElement("label");
      button.className = "file-button";
      button.textContent = "업로드";
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.addEventListener("change", () => handleUpload(key, input.files?.[0]));
      button.append(input);

      const actions = document.createElement("div");
      actions.className = "upload-actions";
      if (tintableUploadKeys.has(key)) {
        actions.append(createUploadTintControl(key, target));
      }
      actions.append(button);
      if (clearableBackgroundImageKeys.has(key)) {
        const clearButton = document.createElement("button");
        clearButton.className = "clear-upload-button";
        clearButton.type = "button";
        clearButton.dataset.uploadClear = key;
        clearButton.textContent = "삭제";
        clearButton.disabled = isClearedImageUpload(key);
        clearButton.addEventListener("click", () => handleClearUpload(key));
        actions.append(clearButton);
      }

      item.append(thumb, label, actions);
      return item;
    }),
  );
}

function appendUploadLabel(label, target, key) {
  const title = document.createElement("strong");
  title.textContent = tabIconUploadLabels[key] ?? target.label;
  label.append(title);

  const sizeLines = formatUploadSizeLines(target);
  if (!sizeLines.length) {
    return;
  }

  const sizeList = document.createElement("span");
  sizeList.className = "upload-size-lines";
  sizeList.append(
    ...sizeLines.map((sizeLineText) => {
      const sizeLine = document.createElement("span");
      sizeLine.className = "upload-size-line";
      sizeLine.textContent = sizeLineText;
      return sizeLine;
    }),
  );
  label.append(sizeList);
}

function formatUploadSizeLines(target) {
  if (target.displaySizes) {
    return uploadDisplaySizePlatforms.flatMap(([platformKey, platform]) => {
      const size = target.displaySizes[platformKey];
      if (!size) {
        return [];
      }

      const [width, height] = size;
      return `${platform} ${width}x${height}px`;
    });
  }

  if (!target.displaySize) {
    return [];
  }

  const [width, height] = target.displaySize;
  return [`${width}x${height}px`];
}

function getUploadMeta(key, target) {
  if (bubbleUploadKeys.has(key)) {
    return "";
  }

  if (!target.ios?.length && target.android?.length) {
    return "Android 적용";
  }

  return target.androidRequiresNinePatch ? "iOS 자동 적용" : "iOS / Android 적용";
}

function createUploadTintControl(key, target) {
  const control = document.createElement("label");
  control.className = "upload-tint-control";
  control.title = "아이콘 색상 적용";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(uploadTints[key]);
  checkbox.ariaLabel = `${target.label} 색상 적용`;

  const input = document.createElement("input");
  input.type = "color";
  input.className = "upload-tint-color";
  input.value = normalizeTintColor(uploadTints[key]) || defaultUploadTintColor;
  input.disabled = !checkbox.checked;
  input.ariaLabel = `${target.label} 색상`;

  checkbox.addEventListener("change", async () => {
    if (checkbox.checked) {
      uploadTints[key] = input.value;
      input.disabled = false;
    } else {
      delete uploadTints[key];
      input.disabled = true;
    }

    await refreshUploadImage(key);
  });

  input.addEventListener("input", async () => {
    uploadTints[key] = input.value;
    checkbox.checked = true;
    input.disabled = false;

    await refreshUploadImage(key);
  });

  control.append(checkbox, input);
  return control;
}

function renderPreviewTabs() {
  previewTabs.replaceChildren(
    ...PREVIEW_PAGES.map((page, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.role = "tab";
      button.dataset.previewIndex = String(index);
      button.ariaLabel = page.label;
      button.title = page.label;
      const icon = document.createElement("span");
      icon.className = "page-icon";
      icon.style.setProperty("--page-icon-mask", `url("${page.iconUrl}")`);
      button.append(icon);
      button.addEventListener("click", () => setPreviewIndex(index));
      return button;
    }),
  );
}

function setPreviewIndex(index) {
  currentPreviewIndex = (index + PREVIEW_PAGES.length) % PREVIEW_PAGES.length;
  const page = PREVIEW_PAGES[currentPreviewIndex];

  previewTrack.style.transform = `translateX(-${currentPreviewIndex * 100}%)`;
  previewTabs.querySelectorAll("button").forEach((button, buttonIndex) => {
    const isActive = buttonIndex === currentPreviewIndex;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
  renderColorControls();
  renderUploadControls();
}

function movePreview(direction) {
  setPreviewIndex(getNextPreviewIndex(currentPreviewIndex, direction));
}

function setPreviewDevice(device) {
  currentPreviewDevice = device === "tablet" ? "tablet" : "phone";
  previewFrame.classList.toggle("is-tablet", currentPreviewDevice === "tablet");
  previewDeviceButtons.forEach((button) => {
    const isActive = button.dataset.previewDevice === currentPreviewDevice;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applyUploadThumb(element, key) {
  element.style.backgroundColor = "";
  element.style.backgroundImage = "";
  element.classList.toggle("is-tab-icon-thumb", tabIconUploadKeys.has(key));

  if (isClearedImageUpload(key)) {
    const colorKey = backgroundImageColorKeys[key];
    const colors = getActiveColors(state);
    element.style.backgroundColor = toPreviewCssColor(colors[colorKey]);
    element.style.backgroundImage = "none";
    return;
  }

  if (previews[key]) {
    element.style.backgroundImage = `url("${previews[key]}")`;
    return;
  }

  const previewImage = getPreviewDefaultCssUrl(key);
  if (previewImage) {
    element.style.backgroundImage = previewImage;
  }
}

async function handleUpload(key, file) {
  if (!file) {
    return;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  uploads[key] = await createUploadRecord(key, file, bytes, file.type);

  if (previews[key]) {
    URL.revokeObjectURL(previews[key]);
  }
  previews[key] = createPreviewUrlForUpload(key, uploads[key], file);

  const thumb = document.querySelector(`[data-upload-thumb="${key}"]`);
  if (thumb) {
    thumb.style.backgroundImage = `url("${previews[key]}")`;
  }

  updatePreview();
  updateUploadControlsState();
  setStatus(`${IMAGE_TARGETS[key].label} 반영`);
}

async function refreshUploadImage(key) {
  const tintColor = tintableUploadKeys.has(key) ? normalizeTintColor(uploadTints[key]) : "";
  const upload = uploads[key];
  if (isClearedImageUpload(key) || (!upload && !tintColor)) {
    return;
  }

  if (upload && getUploadSourceKind(upload) === "default" && !tintColor) {
    clearGeneratedTintUpload(key);
    return;
  }

  const renderVersion = (uploadRenderVersions[key] ?? 0) + 1;
  uploadRenderVersions[key] = renderVersion;
  let sourceData = getUploadSourceData(upload);
  let sourceType = getUploadSourceType(upload);
  let sourceKind = getUploadSourceKind(upload) || "upload";

  if (!sourceData && tintColor) {
    const defaultSource = await getDefaultUploadSource(key);
    if (!defaultSource) {
      return;
    }

    sourceData = defaultSource.data;
    sourceType = defaultSource.type;
    sourceKind = "default";
  }

  if (!sourceData) {
    return;
  }

  const sourceBlob = new Blob([sourceData], { type: sourceType || "image/png" });
  const nextUpload = await createUploadRecord(key, sourceBlob, sourceData, sourceType, { sourceKind });

  if (uploadRenderVersions[key] !== renderVersion) {
    return;
  }

  uploads[key] = nextUpload;
  if (previews[key]) {
    URL.revokeObjectURL(previews[key]);
  }
  previews[key] = createPreviewUrlForUpload(key, uploads[key]);

  const thumb = document.querySelector(`[data-upload-thumb="${key}"]`);
  if (thumb) {
    thumb.style.backgroundImage = `url("${previews[key]}")`;
  }

  updatePreview();
  updateUploadControlsState();
}

function clearGeneratedTintUpload(key) {
  if (previews[key]) {
    URL.revokeObjectURL(previews[key]);
  }

  delete previews[key];
  delete uploads[key];
  updatePreview();
  updateUploadControlsState();
}

function handleClearUpload(key) {
  if (!clearableBackgroundImageKeys.has(key)) {
    return;
  }

  if (previews[key]) {
    URL.revokeObjectURL(previews[key]);
  }
  delete previews[key];
  uploads[key] = { cleared: true };

  updatePreview();
  updateUploadControlsState();
  setStatus(`${IMAGE_TARGETS[key].label} 삭제`);
}

function isClearedImageUpload(key) {
  return uploads[key]?.cleared === true;
}

function updateUploadControlsState() {
  document.querySelectorAll("[data-upload-thumb]").forEach((thumb) => {
    applyUploadThumb(thumb, thumb.dataset.uploadThumb);
  });
  document.querySelectorAll("[data-upload-clear]").forEach((button) => {
    button.disabled = isClearedImageUpload(button.dataset.uploadClear);
  });
}

function getPreviewBytesForUpload(key, bytes, variants) {
  const previewIos = IMAGE_TARGETS[key]?.previewIos ?? IMAGE_TARGETS[key]?.ios?.[0];
  return previewIos ? variants?.[previewIos] ?? bytes : bytes;
}

function createPreviewUrlForUpload(key, upload, sourceFile) {
  const data = getUploadData(upload);
  const variants = upload?.variants;

  if (variants) {
    return createPreviewUrlFromBytes(getPreviewBytesForUpload(key, data, variants), "image/png");
  }

  return createPreviewUrlFromBytes(data, getUploadSourceType(upload) || sourceFile?.type || "image/png");
}

function createPreviewUrlFromBytes(bytes, type = "image/png") {
  return URL.createObjectURL(new Blob([bytes], { type }));
}

function getUploadData(upload) {
  if (upload instanceof Uint8Array || upload instanceof ArrayBuffer) {
    return upload;
  }

  return upload?.data ?? upload?.bytes;
}

function getUploadSourceData(upload) {
  if (upload instanceof Uint8Array || upload instanceof ArrayBuffer) {
    return upload;
  }

  return upload?.sourceData ?? getUploadData(upload);
}

function getUploadSourceType(upload) {
  return typeof upload?.sourceType === "string" ? upload.sourceType : "";
}

function getUploadSourceKind(upload) {
  return typeof upload?.sourceKind === "string" ? upload.sourceKind : "";
}

async function getDefaultUploadSource(key) {
  const path = getDefaultUploadSourcePath(key);
  if (!path) {
    return undefined;
  }

  const response = await fetch(`./${path}`);
  if (!response.ok) {
    return undefined;
  }

  return {
    data: new Uint8Array(await response.arrayBuffer()),
    type: getDefaultUploadSourceType(path),
  };
}

function getDefaultUploadSourcePath(key) {
  const previewPath = getPreviewDefaultImagePath(key);
  if (previewPath) {
    return previewPath;
  }

  const target = IMAGE_TARGETS[key];
  const iosPath = target?.previewIos ?? target?.ios?.find((name) => name.endsWith("@3x.png")) ?? target?.ios?.[0];
  if (iosPath) {
    return `${PREVIEW_IMAGE_FOLDERS.iosImages}/${iosPath.replace(/^Images\//, "")}`;
  }

  const androidPath = target?.android?.[0];
  return androidPath ? `assets/template-images/android-source/${androidPath}` : "";
}

function getDefaultUploadSourceType(path) {
  if (/\.jpe?g$/i.test(path)) {
    return "image/jpeg";
  }

  if (/\.webp$/i.test(path)) {
    return "image/webp";
  }

  return "image/png";
}

async function createUploadRecord(
  key,
  source,
  sourceBytes,
  sourceType = "",
  { sourceKind = "upload", splashBackgroundColor = "" } = {},
) {
  const tintColor = tintableUploadKeys.has(key) ? normalizeTintColor(uploadTints[key]) : "";
  if (!shouldGenerateUploadVariants(key) && !tintColor) {
    return sourceBytes;
  }

  const image = await loadImage(source);
  try {
    const variants = shouldGenerateUploadVariants(key)
      ? await createUploadImageVariants(key, image, { tintColor, splashBackgroundColor })
      : undefined;
    const data = tintColor
      ? await renderImageToPngBytes(image, image.width, image.height, { tintColor })
      : sourceBytes;

    return {
      data,
      sourceData: sourceBytes,
      sourceType,
      sourceKind,
      variants,
    };
  } finally {
    releaseLoadedImage(image);
  }
}

function shouldGenerateUploadVariants(key) {
  const target = IMAGE_TARGETS[key];
  return (
    bubbleUploadKeys.has(key) ||
    tabIconUploadKeys.has(key) ||
    target?.ios?.some((name) => iosImageSizes[name]) ||
    target?.android?.some((name) => androidSplashImageSizes[name]) ||
    target?.android?.some((name) => androidNinePatchImageSizes[name])
  );
}

async function createUploadImageVariants(key, image, { tintColor = "", splashBackgroundColor = "" } = {}) {
  const target = IMAGE_TARGETS[key];
  const variants = {};

  for (const name of target.android || []) {
    const size = androidSplashImageSizes[name];
    if (!size) {
      continue;
    }
    variants[name] = await renderSplashImageToPngBytes(image, size[0], size[1], { backgroundColor: splashBackgroundColor });
  }

  for (const name of target.ios || []) {
    const size = iosImageSizes[name];
    if (!size) {
      continue;
    }
    variants[name] = await renderImageToPngBytes(image, size[0], size[1], { tintColor });
  }

  for (const name of target.android || []) {
    const size = androidNinePatchImageSizes[name];
    if (!size) {
      continue;
    }
    variants[name] = await renderImageToNinePatchPngBytes(image, size[0], size[1], { tintColor });
  }

  return variants;
}

async function loadImage(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  image.dataset.objectUrl = url;
  return image;
}

function releaseLoadedImage(image) {
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    image.close();
    return;
  }

  if (image.dataset?.objectUrl) {
    URL.revokeObjectURL(image.dataset.objectUrl);
  }
}

function drawImageCoverRect(context, image, targetX, targetY, width, height) {
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const cropX = (sourceWidth - cropWidth) / 2;
  const cropY = (sourceHeight - cropHeight) / 2;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, targetX, targetY, width, height);
}

function drawImageCover(context, image, width, height) {
  context.clearRect(0, 0, width, height);
  drawImageCoverRect(context, image, 0, 0, width, height);
}

function drawImageContainRect(context, image, targetX, targetY, width, height) {
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = targetX + (width - drawWidth) / 2;
  const drawY = targetY + (height - drawHeight) / 2;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

async function renderImageToPngBytes(image, width, height, { tintColor = "" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  drawImageCover(context, image, width, height);
  applyCanvasTint(context, tintColor, width, height);

  return canvasToPngBytes(canvas);
}

async function renderSplashImageToPngBytes(image, width, height, { backgroundColor = "" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const iconSize = Math.round(Math.min(width, height) * 0.16);

  context.fillStyle = backgroundColor || defaultThemeState.colors.mainBackground;
  context.fillRect(0, 0, width, height);
  drawImageContainRect(context, image, (width - iconSize) / 2, (height - iconSize) / 2, iconSize, iconSize);

  return canvasToPngBytes(canvas);
}

async function renderImageToNinePatchPngBytes(image, width, height, { tintColor = "" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, width, height);
  drawImageCoverRect(context, image, 1, 1, width - 2, height - 2);
  applyCanvasTint(context, tintColor, width, height);
  drawNinePatchMarkers(context, width, height);

  return canvasToPngBytes(canvas);
}

function applyCanvasTint(context, tintColor, width, height) {
  if (!normalizeTintColor(tintColor)) {
    return;
  }

  const imageData = context.getImageData(0, 0, width, height);
  tintImageDataPixels(imageData, tintColor);
  context.putImageData(imageData, 0, 0);
}

function drawNinePatchMarkers(context, width, height) {
  const { stretchX, stretchY, paddingX, paddingY } = androidNinePatchMarkers;
  context.fillStyle = "#000000";
  context.fillRect(stretchX[0], 0, stretchX[1] - stretchX[0] + 1, 1);
  context.fillRect(0, stretchY[0], 1, stretchY[1] - stretchY[0] + 1);
  context.fillRect(paddingX[0], height - 1, paddingX[1] - paddingX[0] + 1, 1);
  context.fillRect(width - 1, paddingY[0], 1, paddingY[1] - paddingY[0] + 1);
}

async function canvasToPngBytes(canvas) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("image conversion failed"));
      }
    }, "image/png");
  });

  return new Uint8Array(await blob.arrayBuffer());
}

function normalizeHexColorInput(value) {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color.toUpperCase();
  }

  if (/^#[0-9a-f]{8}$/i.test(color)) {
    return color.toUpperCase();
  }

  return "";
}

function normalizeColorPickerValue(value) {
  const color = normalizeHexColorInput(value);
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color;
  }

  if (/^#[0-9a-f]{8}$/i.test(color)) {
    return `#${color.slice(3)}`;
  }

  return "#000000";
}

function toPreviewCssColor(value) {
  const color = normalizeHexColorInput(value);
  if (/^#[0-9a-f]{8}$/i.test(color)) {
    return `#${color.slice(3)}${color.slice(1, 3)}`;
  }

  return color || "#000000";
}

function setPreviewColorVariable(variableName, value) {
  documentRoot.style.setProperty(variableName, toPreviewCssColor(value));
}

function updatePreview() {
  const colors = getActiveColors(state);
  downloadTitle.textContent = state.appName;
  previewDateElements.forEach((element) => {
    element.textContent = formatKoreanDate();
  });
  previewTimeElements.forEach((element) => {
    element.textContent = formatKoreanTime();
  });

  setPreviewColorVariable("--preview-main-bg", colors.mainBackground);
  setPreviewColorVariable("--preview-tab-bg", colors.tabBackground);
  setPreviewColorVariable("--preview-chat-bg", colors.chatBackground);
  setPreviewColorVariable("--preview-header", colors.headerText);
  setPreviewColorVariable("--preview-title", colors.titleText);
  setPreviewColorVariable("--preview-description", colors.descriptionText);
  setPreviewColorVariable("--preview-body-border", colors.bodyBorder);
  setPreviewColorVariable("--preview-send-text", colors.sendText);
  setPreviewColorVariable("--preview-receive-text", colors.receiveText);
  setPreviewColorVariable("--preview-input-bg", colors.inputBarBackground);
  setPreviewColorVariable("--preview-input-text", colors.inputBarText);
  setPreviewColorVariable("--preview-input-menu", colors.inputMenu);
  setPreviewColorVariable("--preview-input-menu-button", colors.inputMenuButton);
  setPreviewColorVariable("--preview-send-button", colors.sendButton);
  setPreviewColorVariable("--preview-send-button-text", colors.sendButtonText);
  setPreviewColorVariable("--preview-send-fill", colors.sendButton);
  setPreviewColorVariable("--preview-unread-count", colors.unreadCount);
  setPreviewColorVariable("--preview-passcode-bg", colors.passcodeBackground);
  setPreviewColorVariable("--preview-passcode-text", colors.passcodeText);
  setPreviewColorVariable("--preview-passcode-keypad-bg", colors.passcodeKeypadBackground);
  setPreviewColorVariable("--preview-section-title", colors.sectionTitle);
  setPreviewColorVariable("--preview-paragraph", colors.paragraphText);
  setPreviewColorVariable("--preview-selected-bg", colors.bodyPressed);
  setPreviewColorVariable("--preview-selected-text", colors.titlePressed);

  Object.entries(previewImageVariables).forEach(([key, variables]) => {
    variables.forEach((variableName) => setOptionalImage(variableName, key, previews[key]));
  });
  Object.entries(previewBubbleSources).forEach(([variableName, keys]) => {
    setPreviewBubbleImage(variableName, keys);
  });

  if (previews.mainBackground && !previews.chatBackground && !isClearedImageUpload("chatBackground")) {
    chatScreen.style.backgroundImage = `url("${previews.mainBackground}")`;
  } else {
    chatScreen.style.backgroundImage = "";
  }

  document.querySelectorAll("[data-preview-theme-name]").forEach((element) => {
    element.textContent = state.appName;
  });
  document.querySelectorAll("[data-preview-theme-version]").forEach((element) => {
    element.textContent = state.version;
  });
  updateDownloadButtons();
  updatePasscodePreview();
  updateUploadControlsState();
}

function setOptionalImage(variableName, key, url) {
  if (isClearedImageUpload(key)) {
    documentRoot.style.setProperty(variableName, "none");
    return;
  }

  const imageValue = url ? `url("${url}")` : getPreviewDefaultCssVariableValue(variableName);
  if (!imageValue) {
    documentRoot.style.removeProperty(variableName);
    return;
  }

  documentRoot.style.setProperty(variableName, imageValue);
}

function setPreviewBubbleImage(variableName, keys) {
  const key = keys.find((candidate) => previews[candidate]);
  if (!key) {
    const defaultImage = getPreviewDefaultCssVariableValue(variableName);
    if (defaultImage) {
      documentRoot.style.setProperty(variableName, defaultImage);
    } else {
      documentRoot.style.removeProperty(variableName);
    }
    return;
  }

  const target = IMAGE_TARGETS[key];
  const url = previews[key];
  documentRoot.style.setProperty(variableName, `image-set(url("${url}") ${target.previewScale}x)`);
}

function handleSettingsInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.name && target.name in state) {
    if (target.name === "themeIdSegment") {
      target.value = sanitizeThemeIdSegment(target.value);
    }
    if (target.name === "version") {
      target.value = normalizeThemeVersion(target.value);
    }
    state[target.name] = target.value;
    updatePreview();
    if (target.name === "version") {
      setStatus(isValidThemeVersion(state.version) ? "템플릿 준비 완료" : "버전은 숫자.숫자.숫자 형식으로 입력해주세요");
    }
  }
}

function updatePasscodePreview() {
  document.querySelectorAll(".passcode-dot").forEach((dot, index) => {
    const isSelected = index < passcodeCount;
    const targetKey = isSelected ? "passcodeDotSelected" : "passcodeDot";
    const fallbackPath = getPreviewDefaultImagePath(targetKey, index);
    const imageUrl = previews[targetKey] || (fallbackPath ? `./${fallbackPath}` : "");
    dot.classList.toggle("is-selected", isSelected);
    dot.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : "";
  });
}

function handlePasscodeAction(action) {
  passcodeCount = applyPasscodeAction(passcodeCount, action);
  updatePasscodePreview();
}

function handlePasscodeClick(event) {
  const digitButton = event.target.closest("[data-passcode-digit]");
  if (digitButton) {
    handlePasscodeAction("digit");
    return;
  }

  const actionButton = event.target.closest("[data-passcode-action]");
  if (actionButton) {
    handlePasscodeAction(actionButton.dataset.passcodeAction);
  }
}

function isEditableTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  );
}

function handleGlobalKeydown(event) {
  if (isEditableTarget(event.target)) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    movePreview("previous");
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    movePreview("next");
    return;
  }

  if (PREVIEW_PAGES[currentPreviewIndex].id !== "passcode") {
    return;
  }

  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    handlePasscodeAction("digit");
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    handlePasscodeAction("delete");
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    handlePasscodeAction("reset");
  }
}

async function getTemplateEntries(kind) {
  if (templateCache.has(kind)) {
    return templateCache.get(kind);
  }

  const manifestResponse = await fetch("./assets/template-manifest.json");
  if (!manifestResponse.ok) {
    throw new Error("template manifest fetch failed");
  }

  const manifest = await manifestResponse.json();
  const entries = await Promise.all(
    manifest[kind].map(async (entry) => {
      const response = await fetch(`./${entry.url}`);
      if (!response.ok) {
        throw new Error(`template fetch failed: ${entry.name}`);
      }
      return {
        name: entry.name,
        data: new Uint8Array(await response.arrayBuffer()),
      };
    }),
  );

  templateCache.set(kind, entries);
  return entries;
}

function downloadBytes(bytes, filename, type) {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadIosTheme() {
  if (!canDownloadTheme()) {
    return;
  }

  setBusy(true);
  setStatus("IOS 생성 중");

  try {
    const entries = await getTemplateEntries("ios");
    const patchedEntries = buildIosEntries(entries, { state, uploads });
    const zip = createStoredZip(patchedEntries);
    downloadBytes(zip, `${sanitizeFileName(state.appName)}.ktheme`, "application/zip");
    setStatus("IOS 다운로드 준비 완료");
  } catch (error) {
    console.error(error);
    setStatus("iOS 생성 실패");
  } finally {
    setBusy(false);
  }
}

async function getThemeIconUploadSource() {
  const upload = uploads.themeIcon;
  if (upload && !upload.cleared) {
    const data = getUploadSourceData(upload) ?? getUploadData(upload);

    if (data) {
      return {
        data,
        type: getUploadSourceType(upload) || "image/png",
        sourceKind: getUploadSourceKind(upload) || "upload",
      };
    }
  }

  const defaultSource = await getDefaultUploadSource("themeIcon");
  return defaultSource ? { ...defaultSource, sourceKind: "default" } : undefined;
}

async function createGeneratedSplashUpload() {
  const source = await getThemeIconUploadSource();
  if (!source?.data) {
    return undefined;
  }

  const sourceBlob = new Blob([source.data], { type: source.type || "image/png" });
  return createUploadRecord("splashImage", sourceBlob, source.data, source.type, {
    sourceKind: source.sourceKind,
    splashBackgroundColor: toPreviewCssColor(getActiveColors(state).mainBackground),
  });
}

async function downloadAndroidSource() {
  if (!canDownloadTheme()) {
    return;
  }

  setBusy(true);
  setStatus("Android 생성 중");

  try {
    const entries = await getTemplateEntries("android");
    const generatedSplashUpload = await createGeneratedSplashUpload();
    const androidUploads = generatedSplashUpload ? { ...uploads, splashImage: generatedSplashUpload } : uploads;
    const patchedEntries = buildAndroidEntries(entries, { state, uploads: androidUploads });
    const zip = createStoredZip(patchedEntries);
    downloadBytes(zip, `${sanitizeFileName(state.appName)}-android-source.zip`, "application/zip");

    const skipped = getSkippedAndroidUploads(uploads);
    setStatus(skipped.length ? `Android 생성 완료, 9-patch 제외: ${skipped.join(", ")}` : "Android 다운로드 준비 완료");
  } catch (error) {
    console.error(error);
    setStatus("Android 생성 실패");
  } finally {
    setBusy(false);
  }
}

settingsForm.addEventListener("input", handleSettingsInput);
previewPreviousButton.addEventListener("click", () => movePreview("previous"));
previewNextButton.addEventListener("click", () => movePreview("next"));
previewDeviceButtons.forEach((button) => {
  button.addEventListener("click", () => setPreviewDevice(button.dataset.previewDevice));
});
passcodeScreen.addEventListener("click", handlePasscodeClick);
document.addEventListener("keydown", handleGlobalKeydown);
downloadIosButton.addEventListener("click", downloadIosTheme);
downloadAndroidButton.addEventListener("click", downloadAndroidSource);

renderUploadControls();
renderPreviewTabs();
setPreviewDevice(currentPreviewDevice);
setPreviewIndex(currentPreviewIndex);
updatePreview();
