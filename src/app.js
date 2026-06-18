import { buildAndroidEntries, buildIosEntries, getSkippedAndroidUploads } from "./theme-builder.js";
import { applyPasscodeAction } from "./passcode-preview.js";
import { getNextPreviewIndex, getPreviewColorKeys, getPreviewImageKeys, PREVIEW_PAGES } from "./preview-pages.js";
import {
  cloneDefaultThemeState,
  getActiveColors,
  IMAGE_TARGETS,
  sanitizeThemeIdSegment,
  setActiveColor,
} from "./theme-model.js";
import { createStoredZip } from "./zip-utils.js";

const colorControls = [
  ["mainBackground", "메인 배경"],
  ["chatBackground", "채팅방 배경"],
  ["headerText", "헤더 텍스트"],
  ["titleText", "타이틀"],
  ["descriptionText", "설명 텍스트"],
  ["paragraphText", "본문 텍스트"],
  ["sectionTitle", "섹션 타이틀"],
  ["sendText", "보낸 말풍선 텍스트"],
  ["receiveText", "받은 말풍선 텍스트"],
  ["unreadCount", "읽지 않음 숫자"],
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

const uploadKeys = [
  "mainBackground",
  "chatBackground",
  "tabBackground",
  "profileImage",
  "themeIcon",
  "sendBubble",
  "receiveBubble",
  "passcodeDot",
  "passcodeDotSelected",
];

const state = cloneDefaultThemeState();
const uploads = {};
const previews = {};
const templateCache = new Map();
let currentPreviewIndex = 1;
let passcodeCount = 0;

const settingsForm = document.querySelector("#settings-form");
const colorControlRoot = document.querySelector("#color-controls");
const uploadControlRoot = document.querySelector("#upload-controls");
const statusText = document.querySelector("#status-text");
const downloadTitle = document.querySelector("#download-title");
const downloadIosButton = document.querySelector("#download-ios");
const downloadAndroidButton = document.querySelector("#download-android");
const chatScreen = document.querySelector("#chat-screen");
const previewTrack = document.querySelector("#preview-track");
const previewTabs = document.querySelector("#preview-tabs");
const previewPreviousButton = document.querySelector("#preview-previous");
const previewNextButton = document.querySelector("#preview-next");
const passcodeScreen = document.querySelector(".passcode-screen");
const documentRoot = document.documentElement;

function setStatus(message) {
  statusText.textContent = message;
}

function setBusy(isBusy) {
  downloadIosButton.disabled = isBusy;
  downloadAndroidButton.disabled = isBusy;
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
      text.htmlFor = `color-${key}`;
      text.textContent = label;

      const input = document.createElement("input");
      input.id = `color-${key}`;
      input.type = "color";
      input.value = normalizeColorInput(colors[key]);
      input.addEventListener("input", () => {
        setActiveColor(state, key, input.value);
        updatePreview();
      });

      row.append(text, input);
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
      const title = document.createElement("strong");
      title.textContent = target.label;
      const meta = document.createElement("span");
      meta.textContent = target.androidRequiresNinePatch ? "iOS 자동 적용" : "iOS / Android 적용";
      label.append(title, meta);

      const button = document.createElement("label");
      button.className = "file-button";
      button.textContent = "업로드";
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.addEventListener("change", () => handleUpload(key, input.files?.[0]));
      button.append(input);

      item.append(thumb, label, button);
      return item;
    }),
  );
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
      const icon = document.createElement("img");
      icon.className = "page-icon";
      icon.src = page.iconUrl;
      icon.alt = "";
      icon.width = 24;
      icon.height = 24;
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

function applyUploadThumb(element, key) {
  if (previews[key]) {
    element.style.backgroundImage = `url("${previews[key]}")`;
    return;
  }

  const iosTarget = IMAGE_TARGETS[key]?.ios?.[0];
  if (iosTarget) {
    element.style.backgroundImage = `url("./assets/templates/ios/${iosTarget}")`;
  }
}

async function handleUpload(key, file) {
  if (!file) {
    return;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  uploads[key] = bytes;

  if (previews[key]) {
    URL.revokeObjectURL(previews[key]);
  }
  previews[key] = URL.createObjectURL(file);

  const thumb = document.querySelector(`[data-upload-thumb="${key}"]`);
  if (thumb) {
    thumb.style.backgroundImage = `url("${previews[key]}")`;
  }

  updatePreview();
  setStatus(`${IMAGE_TARGETS[key].label} 반영`);
}

function normalizeColorInput(value) {
  const color = String(value || "#000000");
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color;
  }

  if (/^#[0-9a-f]{8}$/i.test(color)) {
    return `#${color.slice(3)}`;
  }

  return "#000000";
}

function updatePreview() {
  const colors = getActiveColors(state);
  downloadTitle.textContent = state.appName;

  documentRoot.style.setProperty("--preview-main-bg", colors.mainBackground);
  documentRoot.style.setProperty("--preview-chat-bg", colors.chatBackground);
  documentRoot.style.setProperty("--preview-header", colors.headerText);
  documentRoot.style.setProperty("--preview-description", colors.descriptionText);
  documentRoot.style.setProperty("--preview-send-text", colors.sendText);
  documentRoot.style.setProperty("--preview-receive-text", colors.receiveText);
  documentRoot.style.setProperty("--preview-input-bg", colors.inputBarBackground);
  documentRoot.style.setProperty("--preview-input-text", colors.inputBarText);
  documentRoot.style.setProperty("--preview-input-menu", colors.inputMenu);
  documentRoot.style.setProperty("--preview-send-button", colors.sendButton);
  documentRoot.style.setProperty("--preview-send-button-text", colors.sendButtonText);
  documentRoot.style.setProperty("--preview-send-fill", colors.sendButton);
  documentRoot.style.setProperty("--preview-passcode-bg", colors.passcodeBackground);
  documentRoot.style.setProperty("--preview-passcode-text", colors.passcodeText);
  documentRoot.style.setProperty("--preview-passcode-keypad-bg", colors.passcodeKeypadBackground);
  documentRoot.style.setProperty("--preview-section-title", colors.sectionTitle);
  documentRoot.style.setProperty("--preview-paragraph", colors.paragraphText);

  setOptionalImage("--preview-main-image", previews.mainBackground);
  setOptionalImage("--preview-chat-image", previews.chatBackground);
  setOptionalImage("--preview-tab-image", previews.tabBackground);
  setOptionalImage("--preview-profile-image", previews.profileImage);
  setOptionalImage("--preview-theme-icon", previews.themeIcon);
  setOptionalImage("--preview-send-image", previews.sendBubble);
  setOptionalImage("--preview-receive-image", previews.receiveBubble);

  if (previews.mainBackground && !previews.chatBackground) {
    chatScreen.style.backgroundImage = `url("${previews.mainBackground}")`;
  } else {
    chatScreen.style.backgroundImage = "";
  }

  document.querySelectorAll("[data-preview-theme-name]").forEach((element) => {
    element.textContent = state.appName;
  });
  updatePasscodePreview();
}

function setOptionalImage(variableName, url) {
  if (url) {
    documentRoot.style.setProperty(variableName, `url("${url}")`);
  } else {
    documentRoot.style.removeProperty(variableName);
  }
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
    state[target.name] = target.value;
    updatePreview();
  }
}

function updatePasscodePreview() {
  document.querySelectorAll(".passcode-dot").forEach((dot, index) => {
    const isSelected = index < passcodeCount;
    const targetKey = isSelected ? "passcodeDotSelected" : "passcodeDot";
    const fallbackPath = IMAGE_TARGETS[targetKey].ios[index];
    const imageUrl = previews[targetKey] || `./assets/templates/ios/${fallbackPath}`;
    dot.classList.toggle("is-selected", isSelected);
    dot.style.backgroundImage = `url("${imageUrl}")`;
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
  setBusy(true);
  setStatus("iOS 테마 생성 중");

  try {
    const entries = await getTemplateEntries("ios");
    const patchedEntries = buildIosEntries(entries, { state, uploads });
    const zip = createStoredZip(patchedEntries);
    downloadBytes(zip, `${sanitizeFileName(state.appName)}.ktheme`, "application/zip");
    setStatus("iOS .ktheme 다운로드 준비 완료");
  } catch (error) {
    console.error(error);
    setStatus("iOS 생성 실패");
  } finally {
    setBusy(false);
  }
}

async function downloadAndroidSource() {
  setBusy(true);
  setStatus("Android ZIP 생성 중");

  try {
    const entries = await getTemplateEntries("android");
    const patchedEntries = buildAndroidEntries(entries, { state, uploads });
    const zip = createStoredZip(patchedEntries);
    downloadBytes(zip, `${sanitizeFileName(state.appName)}-android-source.zip`, "application/zip");

    const skipped = getSkippedAndroidUploads(uploads);
    setStatus(skipped.length ? `Android ZIP 생성 완료, 9-patch 제외: ${skipped.join(", ")}` : "Android ZIP 다운로드 준비 완료");
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
passcodeScreen.addEventListener("click", handlePasscodeClick);
document.addEventListener("keydown", handleGlobalKeydown);
downloadIosButton.addEventListener("click", downloadIosTheme);
downloadAndroidButton.addEventListener("click", downloadAndroidSource);

renderUploadControls();
renderPreviewTabs();
setPreviewIndex(currentPreviewIndex);
updatePreview();
