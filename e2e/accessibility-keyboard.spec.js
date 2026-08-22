import { expect, test } from "./support/a11y-fixture.js";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const shoppingTabContract = [
  ["app-name", "테마 이름"],
  ["theme-id-segment", "테마 ID"],
  ["version", "버전"],
  ["additional-author-name", "제작자"],
  ["preview-tab-shopping", "쇼핑"],
  ["color:mainBackground", "배경 색 #FFDEDE"],
  ["color:tabBackground", "하단 탭 배경 색 #FFFFFF"],
  ["color:headerText", "메인 글자 색 #664242"],
  ["color:titleText", "메뉴 글자 색 #664242"],
  ["color:paragraphText", "서브 글자색 #805959"],
  ["color:sectionTitle", "섹션 타이틀 #9B3F49"],
  ["color:titlePressed", "선택 메뉴 글자 색 #664242"],
  ["color:bodyPressed", "선택 메뉴 배경 색 #FFB3B3"],
  ["contrast-current-results", "현재 화면 대비 결과"],
  ["original-image-download", "공식 가이드 파일 다운로드"],
  ["upload-input-mainBackground", "메인 배경 업로드"],
  ["upload-input-tabBackground", "탭 배경 업로드"],
  ["upload-tint-enabled-tabFriendIcon", "친구 탭 아이콘 - 기본 색상 적용"],
  ["upload-input-tabFriendIcon", "친구 탭 아이콘 - 기본 업로드"],
  ["upload-tint-enabled-tabFriendIconSelected", "친구 탭 아이콘 - 선택 색상 적용"],
  ["upload-input-tabFriendIconSelected", "친구 탭 아이콘 - 선택 업로드"],
  ["upload-tint-enabled-tabChatIcon", "대화 탭 아이콘 - 기본 색상 적용"],
  ["upload-input-tabChatIcon", "대화 탭 아이콘 - 기본 업로드"],
  ["upload-tint-enabled-tabChatIconSelected", "대화 탭 아이콘 - 선택 색상 적용"],
  ["upload-input-tabChatIconSelected", "대화 탭 아이콘 - 선택 업로드"],
  ["upload-tint-enabled-tabOpenChatIcon", "오픈채팅 탭 아이콘 - 기본 색상 적용"],
  ["upload-input-tabOpenChatIcon", "오픈채팅 탭 아이콘 - 기본 업로드"],
  ["upload-tint-enabled-tabOpenChatIconSelected", "오픈채팅 탭 아이콘 - 선택 색상 적용"],
  ["upload-input-tabOpenChatIconSelected", "오픈채팅 탭 아이콘 - 선택 업로드"],
  ["upload-tint-enabled-tabShoppingIcon", "쇼핑 탭 아이콘 - 기본 색상 적용"],
  ["upload-input-tabShoppingIcon", "쇼핑 탭 아이콘 - 기본 업로드"],
  ["upload-tint-enabled-tabShoppingIconSelected", "쇼핑 탭 아이콘 - 선택 색상 적용"],
  ["upload-input-tabShoppingIconSelected", "쇼핑 탭 아이콘 - 선택 업로드"],
  ["upload-tint-enabled-tabMoreIcon", "더보기 탭 아이콘 - 기본 색상 적용"],
  ["upload-input-tabMoreIcon", "더보기 탭 아이콘 - 기본 업로드"],
  ["upload-tint-enabled-tabMoreIconSelected", "더보기 탭 아이콘 - 선택 색상 적용"],
  ["upload-input-tabMoreIconSelected", "더보기 탭 아이콘 - 선택 업로드"],
  ["upload-input-profileImage", "기본 프로필 업로드"],
  ["device:phone", "스마트폰"],
  ["device:tablet", "태블릿"],
  ["preview-previous", "이전 프리뷰"],
  ["preview-next", "다음 프리뷰"],
  ["shopping-summary", "쇼핑 요약"],
  ["shopping-carousel-previous", "이전 상품"],
  ["shopping-carousel-next", "다음 상품"],
  ["shopping-pick-carousel", "오늘의 PICK 상품 캐러셀"],
  ["download-ios", "iOS 테마 다운로드"],
  ["download-android", "Android 소스 다운로드"],
];

function accessibleNameFromSnapshot(snapshot) {
  return snapshot.split("\n", 1)[0].match(/"([^"]+)"/)?.[1] ?? "";
}

async function resetSequentialFocusStart(page) {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute("tabindex");
    window.__task10KeyboardNodeIds = new WeakMap();
    window.__task10KeyboardNextNodeId = 1;
  });
}

async function focusedDomState(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    const ids = window.__task10KeyboardNodeIds;
    let nodeId = ids.get(element);
    if (!nodeId) {
      nodeId = window.__task10KeyboardNextNodeId;
      window.__task10KeyboardNextNodeId += 1;
      ids.set(element, nodeId);
    }

    const labelledBy = element.getAttribute("aria-labelledby") ?? "";
    const colorKey = labelledBy.match(/(?:^|\s)color-label-([^\s]+)/)?.[1];
    const inactive = element.closest('[aria-hidden="true"], [inert]');
    let key = element.id;
    if (!key && colorKey) {
      key = `color:${colorKey}`;
    } else if (!key && element.dataset.previewDevice) {
      key = `device:${element.dataset.previewDevice}`;
    } else if (!key && element.hasAttribute("data-shopping-carousel-previous")) {
      key = "shopping-carousel-previous";
    } else if (!key && element.hasAttribute("data-shopping-carousel-next")) {
      key = "shopping-carousel-next";
    } else if (!key && element.classList.contains("shopping-summary-track")) {
      key = "shopping-summary";
    }

    return {
      inactive: inactive ? inactive.id || inactive.className || inactive.tagName : null,
      key: key || `${element.tagName}:${element.getAttribute("aria-label") ?? "unnamed"}`,
      nodeId,
      rootFocus: element === document.body || element === document.documentElement,
    };
  });
}

async function activatePreviewTabWithKeyboard(page, name) {
  const tab = page.getByRole("tab", { name, exact: true });
  await tab.focus();
  await page.keyboard.press("Enter");
  await expect(tab).toBeFocused();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  return tab;
}

async function expectActivePreview(page, id) {
  const tab = page.locator(`#preview-tab-${id}`);
  const panel = page.locator(`#preview-panel-${id}`);
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(tab).toHaveAttribute("tabindex", "0");
  await expect(panel).not.toHaveAttribute("aria-hidden", "true");
  await expect(panel).not.toHaveAttribute("inert", "");
  await expect(page.locator('[role="tabpanel"][aria-hidden="true"]:not([inert])')).toHaveCount(0);
}

async function replaceFocusedText(page, locator, value) {
  await locator.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(value);
}

async function holdManifestRequest(page) {
  const requests = [];
  await page.route("**/assets/template-manifest.json", async (route) => {
    await new Promise((release) => requests.push({ release, route }));
  });
  return requests;
}

test("@task10-keyboard reaches only Android after the complete named Tab sequence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "쇼핑", exact: true }).click();
  await expectActivePreview(page, "shopping");
  await resetSequentialFocusStart(page);

  const records = [];
  const visitedNodeIds = new Set();
  for (let tabCount = 1; tabCount <= 200; tabCount += 1) {
    await page.keyboard.press("Tab");
    const state = await focusedDomState(page);
    const focused = page.locator(":focus");
    const snapshot = await focused.ariaSnapshot();
    const accessibleName = accessibleNameFromSnapshot(snapshot);

    expect(state.rootFocus, `Tab ${tabCount} must not terminate on the document root`).toBe(false);
    expect(state.inactive, `Tab ${tabCount} focused inactive panel ${state.inactive ?? ""}`).toBeNull();
    expect(visitedNodeIds.has(state.nodeId), `Tab cycle repeated ${state.key} before Android`).toBe(false);
    expect(accessibleName, `Tab ${tabCount} ${state.key} has a required accessible name`).not.toBe("");

    visitedNodeIds.add(state.nodeId);
    records.push({ ...state, accessibleName, snapshot });
    if (state.key === "download-android") {
      break;
    }
  }

  expect(records.length, "Android must be reached within the 200 Tab ceiling").toBeLessThanOrEqual(200);
  expect(records.at(-1)?.key, "the sole accepted traversal terminal is Android").toBe("download-android");
  expect(records.map(({ key, accessibleName }) => [key, accessibleName])).toEqual(shoppingTabContract);
  expect(records.every(({ snapshot }) => snapshot.startsWith("- ")), "each visit retains its locator aria snapshot").toBe(true);
  expect(records.map(({ key }) => key)).toEqual([...new Set(records.map(({ key }) => key))]);
});

test("@task10-keyboard preview tabs support Arrow, Home, End, and wrap with focus", async ({ page }) => {
  await page.goto("/");
  const tabs = page.locator('#preview-tabs > [role="tab"]');

  await tabs.nth(1).focus();
  await page.keyboard.press("ArrowRight");
  await expectActivePreview(page, "open-chat");
  await expect(tabs.nth(2)).toBeFocused();

  await page.keyboard.press("Home");
  await expectActivePreview(page, "home");
  await expect(tabs.nth(0)).toBeFocused();

  await page.keyboard.press("ArrowLeft");
  await expectActivePreview(page, "theme-list");
  await expect(tabs.nth(9)).toBeFocused();

  await page.keyboard.press("End");
  await expectActivePreview(page, "theme-list");
  await expect(tabs.nth(9)).toBeFocused();
});

test("@task10-keyboard color popover validates drafts and Escape restores picker focus", async ({ page }) => {
  await page.goto("/");
  const row = page.locator(".color-row").filter({ has: page.locator("#color-label-mainBackground") });
  const picker = row.locator(".color-picker-control");
  const popover = row.locator("#color-popover-mainBackground");
  const hex = row.locator("#color-hex-mainBackground");

  await picker.focus();
  await page.keyboard.press("Enter");
  await expect(popover).toBeVisible();
  await expect(hex).toBeFocused();
  await replaceFocusedText(page, hex, "#12GG");
  await page.keyboard.press("Enter");
  await expect(hex).toHaveAttribute("aria-invalid", "true");

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  await expect(picker).toBeFocused();

  await page.keyboard.press("Enter");
  await replaceFocusedText(page, hex, "#123456");
  await expect(row.locator("#color-value-mainBackground")).toHaveText("#123456");
  await expect(hex).not.toHaveAttribute("aria-invalid");
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(picker).toBeFocused();
});

test("@task10-keyboard opens bubble detail and operates its radio and range controls", async ({ page }) => {
  await page.goto("/");
  await activatePreviewTabWithKeyboard(page, "채팅방");
  const detail = page.getByRole("button", { name: "나의 말풍선 - 기본 상세", exact: true });
  await detail.focus();
  await page.keyboard.press("Enter");
  await expectActivePreview(page, "bubble-detail");
  await expect(page.getByRole("heading", { name: "나의 말풍선 - 기본 상세", level: 3, exact: true })).toBeFocused();

  const cover = page.getByRole("radio", { name: "채우기", exact: true });
  await cover.focus();
  await page.keyboard.press("Space");
  await expect(cover).toBeChecked();
  await expect(cover).toBeFocused();

  const slider = page.getByRole("slider", { name: "나의 말풍선 - 기본 가로 늘림 시작", exact: true });
  const sliderNode = await slider.elementHandle();
  const before = Number(await slider.inputValue());
  const minimum = Number(await slider.getAttribute("min"));
  const key = before > minimum ? "ArrowLeft" : "ArrowRight";
  await slider.focus();
  await page.keyboard.press(key);
  expect(Number(await slider.inputValue())).not.toBe(before);
  await expect(slider).toHaveAttribute("aria-valuetext", `${await slider.inputValue()}픽셀`);
  await expect(slider).toBeFocused();
  expect(await slider.evaluate((element, original) => element === original, sliderNode)).toBe(true);
});

test("@task10-keyboard passcode input, delete, shortcuts, and cancel remain scoped", async ({ page }) => {
  await page.goto("/");
  await activatePreviewTabWithKeyboard(page, "잠금화면");
  const status = page.locator("#passcode-status");
  const selected = page.locator(".passcode-dot.is-selected");
  const digit = page.locator('[data-passcode-digit="8"]');
  const deleteButton = page.getByRole("button", { name: "한 자리 지우기", exact: true });
  const cancelButton = page.getByRole("button", { name: "취소", exact: true });

  await digit.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("4자리 중 1자리 입력됨");
  await expect(selected).toHaveCount(1);

  await deleteButton.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("4자리 중 0자리 입력됨");

  await digit.focus();
  await page.keyboard.press("8");
  await expect(status).toHaveText("4자리 중 1자리 입력됨");
  await page.keyboard.press("Backspace");
  await expect(status).toHaveText("4자리 중 0자리 입력됨");

  await page.keyboard.press("8");
  await expect(status).toHaveText("4자리 중 1자리 입력됨");
  await cancelButton.focus();
  await page.keyboard.press("Space");
  await expect(status).toHaveText("4자리 중 0자리 입력됨");
  await expect(selected).toHaveCount(0);
  await expect(cancelButton).toBeFocused();
  await expectActivePreview(page, "passcode");
});

test("@task10-keyboard carousel keyboard and buttons preserve focus and preview state", async ({ page }) => {
  await page.goto("/");
  await activatePreviewTabWithKeyboard(page, "쇼핑");
  const carousel = page.getByRole("region", { name: "오늘의 PICK 상품 캐러셀", exact: true });
  const previous = page.getByRole("button", { name: "이전 상품", exact: true });
  const next = page.getByRole("button", { name: "다음 상품", exact: true });
  const status = page.locator("#shopping-carousel-status");

  await carousel.focus();
  await page.keyboard.press("ArrowRight");
  await expect(status).toHaveText("2/4, 스탠딩 이미지 작업");
  await expect(carousel).toBeFocused();
  await page.keyboard.press("Home");
  await expect(status).toHaveText("1/4, 손 커미션(2인)");

  await next.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("2/4, 스탠딩 이미지 작업");
  await expect(next).toBeFocused();

  await previous.focus();
  await page.keyboard.press("Space");
  await expect(status).toHaveText("1/4, 손 커미션(2인)");
  await expect(previous).toBeFocused();
  await expectActivePreview(page, "shopping");
});

test("@task10-keyboard invalid metadata blocks downloads and valid recovery reenables them", async ({ page }) => {
  await page.goto("/");
  const themeId = page.locator("#theme-id-segment");
  const version = page.locator("#version");
  const downloads = page.locator("#download-ios, #download-android");

  await replaceFocusedText(page, themeId, "Theme1");
  await expect(themeId).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#theme-id-error")).toBeVisible();
  for (const button of await downloads.all()) {
    await expect(button).toBeDisabled();
  }

  await replaceFocusedText(page, themeId, "Theme");
  await replaceFocusedText(page, version, "1.2");
  await expect(themeId).not.toHaveAttribute("aria-invalid");
  await expect(version).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#version-error")).toBeVisible();

  await replaceFocusedText(page, version, "2.0.0");
  await expect(version).not.toHaveAttribute("aria-invalid");
  for (const button of await downloads.all()) {
    await expect(button).toBeEnabled();
  }
  await expect(version).toBeFocused();
});

test("@task10-keyboard upload success and decode failure retain state and file focus", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#upload-input-mainBackground");
  const description = page.locator("#upload-description-mainBackground");
  const alert = page.locator("#error-status");

  await input.focus();
  await input.setInputFiles({ name: "keyboard-good.png", mimeType: "image/png", buffer: onePixelPng });
  await expect(page.locator("#status-text")).toHaveText("메인 배경 반영");
  await expect(description).toContainText("선택한 파일: keyboard-good.png");
  await expect(input).toBeFocused();

  await input.setInputFiles({ name: "keyboard-broken.png", mimeType: "image/png", buffer: Buffer.from("broken") });
  await expect(alert).toHaveText(
    "메인 배경 이미지를 읽을 수 없습니다. PNG, JPEG 또는 WebP 파일을 다시 선택해 주세요.",
  );
  await expect(description).toContainText("선택한 파일: keyboard-good.png");
  await expect(input).toBeFocused();
  expect(await input.evaluate((element) => element.files.length)).toBe(0);
});

test("@task10-keyboard download announces deterministic start and success from Enter", async ({ page }) => {
  const held = await holdManifestRequest(page);
  await page.goto("/");
  const button = page.locator("#download-ios");
  const downloadPromise = page.waitForEvent("download");

  await button.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => held.length).toBe(1);
  await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#status-text")).toHaveText("iOS 생성 중");

  await held[0].route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ios: [], android: [] }),
  });
  held[0].release();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("나의-테마.ktheme");
  await expect(page.locator("#status-text")).toHaveText("iOS 다운로드 준비 완료");
  await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#error-status")).toBeEmpty();
  await expect(button).toBeFocused();
});

test("@task10-keyboard download announces deterministic start and failure from Space", async ({ page }) => {
  const held = await holdManifestRequest(page);
  let downloadCount = 0;
  page.on("download", () => {
    downloadCount += 1;
  });
  await page.goto("/");
  const button = page.locator("#download-android");

  await button.focus();
  await page.keyboard.press("Space");
  await expect.poll(() => held.length).toBe(1);
  await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#status-text")).toHaveText("Android 생성 중");

  await held[0].route.fulfill({ status: 200, contentType: "application/json", body: "{" });
  held[0].release();

  await expect(page.locator("#status-text")).toHaveText("Android 생성 실패");
  await expect(page.locator("#error-status")).toHaveText(
    "Android 소스를 생성하지 못했습니다. 다시 시도해 주세요.",
  );
  await expect(page.locator(".download-actions")).toHaveAttribute("aria-busy", "false");
  await expect(button).toBeFocused();
  expect(downloadCount).toBe(0);
});
