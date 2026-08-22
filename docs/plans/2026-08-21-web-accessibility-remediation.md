# Web Accessibility Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve the current KakaoTalk theme-building experience while removing the audited WCAG 2.2 AA/KWCAG 2.2 blockers and adding durable accessibility regression coverage.

**Architecture:** Keep the static HTML/CSS/ES-module application and existing slide transform, but centralize preview accessibility state, validation/status delivery, and color-contrast evaluation. Use Node's built-in test runner for pure logic and markup contracts, plus Playwright and `@axe-core/playwright` for real accessible names, focus, keyboard behavior, geometry, and automated WCAG checks.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Node.js built-in test runner, Playwright Test, `@axe-core/playwright`.

---

## 구현 전 결정과 작업 규칙

- 설계 근거는 `docs/plans/2026-08-21-web-accessibility-remediation-design.md`를 따른다.
- 각 작업은 `superpowers:test-driven-development`로 RED → 최소 GREEN → 전체 회귀 순서를 지킨다.
- 한 작업의 브라우저 테스트와 단위 테스트가 모두 통과하기 전 다음 작업으로 넘어가지 않는다.
- 브라우저 테스트는 `test.describe("@taskN …")` 태그를 사용한다. 같은 `--grep @taskN` 명령으로 RED와 GREEN을 확인하고, 커밋 직전에는 `npm run test:all`을 실행한다.
- 현재 기본 기능 테스트 134개를 기준선으로 보존한다.
- 비기능 휴대폰 모의 컨트롤은 실제 위젯으로 만들지 않고 의미를 제거한다. 실제 제품 동작이 필요한 항목이 발견되면 구현 전에 범위를 다시 승인받는다.
- 쇼핑 캐러셀 탐색은 기존 drag를 보존해야 하는 실제 프리뷰 탐색 기능으로 분류하고 키보드·버튼 대안을 제공한다.
- 사용자 임의 색상과 배경 이미지는 자동 보정하거나 차단하지 않는다. 앱 chrome과 기본 프리뷰는 AA로 만들고, 사용자 생성 상태는 실패 비율·화면·초기화·수동 확인 필요 상태를 제공하는 부분 준수 범위로 문서화한다.

## 감사 항목 추적표

| 감사 결함 | WCAG 2.2 | 해결 작업 | 자동 검증 | 수동 검증 |
|---|---|---:|---|---|
| 비활성 9개 프리뷰와 72개 화면 밖 포커스 | 1.3.2, 2.4.3, 2.4.7, 2.4.11, 4.1.2 | 4 | `inert`, tab 순회, ARIA snapshot | VoiceOver rotor |
| 동적 렌더 후 `<body>`로 포커스 소실 | 2.4.3 | 5 | 상세 진입·radio 변경 E2E | 확대 상태 포커스 |
| 테마 ID·업로드·색상 컨트롤 이름 누락/중복 | 1.3.1, 2.4.6, 3.3.2, 4.1.2 | 1, 2 | role/name locator | VoiceOver 폼 탐색 |
| 오류·업로드·생성 상태 미공지 | 3.3.1, 3.3.2, 4.1.3 | 3 | live/alert mutation | 실제 낭독 |
| 기본 프리뷰 텍스트 대비 미달 | 1.4.3 | 8 | 순수 대비 ledger, axe | 이미지 배경 검사 |
| 숨김 file input 포커스 미표시 | 2.4.7 | 2, 9 | 실제 Tab·computed style·스크린샷 | 키보드 탐색 |
| 불완전한 탭 키보드 모델·전역 방향키 | 2.1.1, 2.4.3, 4.1.2 | 4 | Arrow/Home/End E2E | 키보드 탐색 |
| 비기능 모의 버튼·탭 노출 | 1.3.1, 2.4.3, 4.1.2 | 6 | active panel role count, axe | rotor/Tab 탐색 |
| 9-patch·암호 상태 미노출 | 1.3.1, 2.4.6, 4.1.2, 4.1.3 | 5, 7 | radio/range/status E2E | 실제 낭독 |
| 입력·포커스·선택 상태 비텍스트 대비 | 1.4.1, 1.4.11, 2.4.7 | 9 | 토큰 테스트·computed style | 고대비 모드 |
| 드래그 전용 쇼핑 캐러셀 | 2.1.1, 2.5.7 | 6 | 버튼·키보드·pointer E2E | 키보드/터치 |
| 320px footer 겹침·확대 클리핑 | 1.4.4, 1.4.10, 1.4.12, 2.4.11 | 9 | geometry·reflow E2E | 200%/400% 확대 |
| heading·legend·부분 언어·다운로드 이름 | 1.3.1, 2.4.6, 3.1.2 | 1 | markup/role E2E | heading/landmark 탐색 |
| forced-colors 대응 | 1.4.11, 2.4.7 | 9 | media emulation | Windows High Contrast |
| reduced-motion 보완 | 2.3.3 AAA 참고 | 9 | media emulation | 감소 동작 설정 |

### Task 0: 접근성 테스트 기반과 실패 기준 고정

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `playwright.config.js`
- Create: `e2e/accessibility.spec.js`
- Modify: `scripts/serve.mjs`
- Create: `.github/workflows/accessibility.yml`

**Step 1: 기존 기준선을 다시 실행한다**

Run: `npm test`

Expected: 기존 134개 테스트가 모두 통과하고 fail이 0이다.

**Step 2: 브라우저 테스트 의존성을 설치한다**

Run: `npm install --save-dev @playwright/test @axe-core/playwright`

Run: `npx playwright install chromium`

Expected: `package.json`과 `package-lock.json`이 갱신되고 Chromium 설치가 완료된다.

**Step 3: 전용 포트의 Playwright 설정을 작성한다**

`playwright.config.js`에 다음 계약을 구현한다.

```js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:43173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:43173",
    env: { PORT: "43173", SKIP_ENV_CONFIG: "1" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

`package.json`에는 `"test:a11y": "playwright test"`와 `"test:all": "npm test && npm run test:a11y"`를 추가한다.

**Step 4: 테스트 서버가 추적 파일을 쓰지 않게 한다**

`scripts/serve.mjs`는 `SKIP_ENV_CONFIG === "1"`이면 `writeRuntimeEnvConfig`를 건너뛴다. Playwright `webServer.env`에 `SKIP_ENV_CONFIG: "1"`을 추가한다. smoke 실행 전후 `src/env-config.js` diff가 없어야 한다.

**Step 5: 통과하는 smoke test만 작성한다**

`e2e/accessibility.spec.js`의 `@task0 loads the builder`는 제목, `main`, 현재 134개 단위 테스트와 정적 asset 200 응답만 검사한다. 아직 고치지 않은 heading/inert/focus 결함 테스트는 이 작업에 넣지 않는다.

Run: `npm run test:a11y -- --grep @task0`

Expected: PASS.

**Step 6: CI에 단위·브라우저 검증을 추가한다**

`.github/workflows/accessibility.yml`은 checkout → Node setup → `npm ci` → `npx playwright install --with-deps chromium` → `npm run test:all` 순으로 실행한다.

**Step 7: 전체 GREEN을 확인하고 커밋한다**

Run: `npm run test:all`

Run: `git diff --exit-code -- src/env-config.js`

Expected: 모두 PASS하고 추적 파일 변경이 없다.

```bash
git add package.json package-lock.json playwright.config.js e2e/accessibility.spec.js scripts/serve.mjs .github/workflows/accessibility.yml
git commit -m "test: add accessibility regression harness"
```

### Task 1: 문서 구조와 영구 폼 레이블 정비

**Files:**
- Modify: `index.html:14`
- Modify: `index.html:17`
- Modify: `index.html:23`
- Modify: `index.html:52`
- Modify: `index.html:168`
- Modify: `index.html:1087`
- Modify: `styles.css:66`
- Create: `tests/accessibility-markup.test.js`
- Test: `e2e/accessibility.spec.js`
- Modify tests: `tests/upload-panel-markup.test.js`

**Step 1: 실패하는 구조 테스트를 작성한다**

다음을 요구한다.

- 프로젝트 문서 규칙으로 `h1` 정확히 1개와 설정·업로드·프리뷰의 `h2`(WCAG 자체가 h1 개수를 직접 요구한다는 뜻은 아님)
- 첫 fieldset의 실제 `legend`
- 테마 ID·제작자 `label[for]`
- `theme-id-help`, `version-help`, `theme-id-error`, `version-error`
- 고전 한문 문구의 `lang="lzh"`
- “iOS 테마 다운로드”, “Android 소스 다운로드”라는 접근 가능한 이름

Run: `node --test tests/accessibility-markup.test.js`

Expected: heading, legend, label이 없어 FAIL한다.

Run: `npm run test:a11y -- --grep @task1`

Expected: role locator/ARIA snapshot도 같은 구조 누락으로 FAIL한다.

**Step 2: 의미 구조를 최소 변경으로 구현한다**

- `main` 안에 `h1`을 하나 추가한다.
- 각 panel에 `h2`를 넣고 section의 `aria-labelledby`와 연결한다.
- 주제별 fieldset에 실제 `legend`를 사용한다.
- 테마 ID·제작자를 명시적 `label for`로 바꾼다.
- ID는 영문자만 허용한다는 도움말과 버전 형식 도움말을 항상 DOM에 둔다.
- 테마 ID는 `required pattern="[A-Za-z]+"`, 버전도 `required`로 선언하고 가시 도움말에 필수 항목임을 표시한다.
- 다운로드 버튼 이름에는 현재 보이는 `IOS`/`Android` 문자열과 목적을 함께 포함한다.
- 레이아웃을 유지해야 하는 제목·도움말에는 공용 `.visually-hidden`을 사용한다.

**Step 3: 구조 테스트와 기존 마크업 테스트를 통과시킨다**

Run: `node --test tests/accessibility-markup.test.js tests/upload-panel-markup.test.js`

Expected: PASS.

Run: `npm run test:a11y -- --grep @task1`

Expected: role locator와 ARIA snapshot에서도 heading/label/landmark가 PASS.

**Step 4: 전체 GREEN을 확인하고 커밋한다**

Run: `npm run test:all`

Expected: PASS.

```bash
git add index.html styles.css tests/accessibility-markup.test.js tests/upload-panel-markup.test.js e2e/accessibility.spec.js
git commit -m "fix: add semantic structure and persistent labels"
```

### Task 2: 동적 업로드·색상 컨트롤 이름과 file 포커스

**Files:**
- Modify: `src/app.js:462`
- Modify: `src/app.js:611`
- Modify: `src/app.js:734`
- Modify: `styles.css:195`
- Modify: `styles.css:397`
- Modify: `styles.css:479`
- Test: `tests/upload-panel-markup.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: 실패하는 이름·포커스 테스트를 작성한다**

각 활성 행에서 다음 이름이 정확히 하나씩 검색되어야 한다.

- `${자산명} 업로드`
- `${자산명} 상세`
- `${자산명} 삭제`
- `${색상명} ${현재 HEX}`
- `${색상명} 초기화`

또한 알려진 직전 컨트롤에서 실제 `Tab` 키로 file input에 도달하고, `document.activeElement`가 input이며 보이는 `.file-button`에 공용 3px focus ring이 나타나야 한다. 다음 Tab으로 빠져나갈 수 있어야 한다.

Run: `npm run test:a11y -- --grep @task2`

Expected: 중복 이름과 focus ring 누락으로 FAIL한다.

**Step 2: 업로드 행의 관계를 구현한다**

- 행 제목 `upload-title-${key}`와 설명 `upload-description-${key}`를 생성한다.
- 행을 `role="group" aria-labelledby="upload-title-${key}"`로 묶는다.
- file input id와 가시 label `for`를 연결하고, 이름은 행 제목 + “업로드”로 조합한다.
- 크기·플랫폼 정보는 `aria-describedby`로 연결한다.
- 상세·삭제 버튼도 행 제목과 가시 동작 텍스트를 조합한다.
- 썸네일은 파일명/상태를 별도 텍스트로 제공한 뒤 장식으로 숨긴다.

**Step 3: 색상 행의 관계를 구현한다**

- `color-label-${key}`, `color-value-${key}`를 만들고 picker 이름에 둘 다 포함한다.
- 초기화 버튼은 색상명 + 가시 “초기화”를 이름으로 갖는다.
- tint checkbox와 color input은 하나의 label에 동시에 의존하지 않고 각자 독립 이름을 갖게 한다.

**Step 4: 보이는 file 포커스를 구현한다**

`.file-button:focus-within`에 Task 9와 같은 공용 3px 고대비 outline을 적용한다. 1×1px input 자체의 표시에는 의존하지 않는다. 이름 검사, 실제 Tab 도달, ring 표시, 다음 Tab 이탈, 파일 선택 취소 후 포커스를 각각 독립 테스트로 둔다.

**Step 5: 테스트하고 커밋한다**

Run: `node --test tests/upload-panel-markup.test.js`

Run: `npm run test:a11y -- --grep @task2`

Expected: 모두 PASS.

Run: `npm run test:all`

Expected: 전체 PASS.

```bash
git add src/app.js styles.css tests/upload-panel-markup.test.js e2e/accessibility.spec.js
git commit -m "fix: expose contextual control names and file focus"
```

### Task 3: 입력 오류와 비동기 상태를 분리해 전달

**Files:**
- Modify: `index.html:24`
- Modify: `index.html:40`
- Modify: `index.html:1087`
- Modify: `src/theme-model.js:660`
- Modify: `src/app.js:318`
- Modify: `src/app.js:423`
- Modify: `src/app.js:529`
- Modify: `src/app.js:1147`
- Modify: `src/app.js:1789`
- Test: `tests/theme-model.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: ID 검증 단위 테스트를 RED로 만든다**

새 `isValidThemeIdSegment`는 영문자 1개 이상만 true여야 한다. 한글, 숫자, 공백, 빈 값은 false여야 한다.

Run: `node --test tests/theme-model.test.js`

Expected: 함수가 없어 FAIL한다.

**Step 2: 필드 오류 E2E를 RED로 만든다**

- theme ID에 `테마1`, version에 `1.2`를 입력해도 원문이 지워지지 않는다.
- 두 입력 모두 `aria-invalid="true"`이며 구체적 오류가 연결된다.
- 오류 상태에서는 다운로드가 비활성화된다.
- 유효값으로 고치면 오류 관계와 custom validity가 해제된다.
- 잘못된 HEX는 이전 값으로 조용히 돌아가지 않고 입력값과 오류가 유지된다.
- 빈 필수값에서도 `required`, native validity, `aria-invalid`, 보이는 오류와 다운로드 미실행이 일치한다.

Run: `npm run test:a11y -- --grep @task3`

Expected: 원문 삭제, 오류 관계 누락, 상태 미공지로 FAIL한다.

**Step 3: 입력 원문 보존과 검증을 구현한다**

- `handleSettingsInput`의 즉시 sanitize/normalize를 제거한다.
- sanitize/normalize는 내보내기 방어선으로만 유지한다.
- `getThemeValidation()` 한 곳이 theme ID와 version을 검사하고 `updateDownloadButtons`, `canDownloadTheme`, iOS/Android 진입점이 같은 결과를 재사용한다.
- 각 오류 노드와 `aria-invalid`, `aria-errormessage`, `setCustomValidity`를 동일 함수에서 갱신한다.
- 오류 노드는 유효할 때 숨고 무효일 때 시각적으로 표시되며, 도움말은 계속 유지한다.
- HEX는 input 중 파싱 가능한 값만 preview에 적용하고, blur/Enter 시 유효하지 않으면 오류를 확정한다.

**Step 4: 상태 채널을 구현한다**

- `#status-text`: `role="status" aria-live="polite" aria-atomic="true"`
- `#error-status`: `role="alert" aria-atomic="true"`
- 업로드·생성·실패 같은 이산 작업은 live region을 비운 뒤 다음 task에서 다시 써 동일 문구도 재공지한다. 색상 입력처럼 고빈도인 상태만 debounce/coalesce한다.
- `setBusy`는 다운로드 영역의 `aria-busy`를 동기화한다.
- 업로드 read/decode와 iOS/Android 생성 실패를 catch하여 구체적 alert로 변환한다.
- 필드 오류를 footer status에 중복 출력하지 않는다.
- 처리된 사용자 오류의 `console.error`는 제거한다. 실패를 의도적으로 주입한 테스트에서 브라우저가 자체 출력하는 정확한 네트워크 오류만 테스트별 allowlist로 소비하고, 그 밖의 console error·`pageerror`·unhandled rejection은 항상 실패시킨다.

**Step 5: 성공·실패 경로를 테스트한다**

Playwright의 `setInputFiles({ name, mimeType, buffer })`로 고정 1×1 PNG buffer와 image MIME이지만 decode 불가능한 text buffer를 만든다. fixture sanity assertion 후 가장 가벼운 upload key에 사용한다. 네트워크 route로 manifest 실패도 재현한다. 각 action 전 status를 비우고 action 후 정확한 text mutation, focus 불변, `aria-busy` true→false를 검사하며 고정 sleep 대신 `expect.poll`을 쓴다. 동일 업로드와 동일 실패를 두 번 반복해 두 번째도 공지되는지 확인한다.

Run: `npm run test:a11y -- --grep @task3`

Run: `npm test`

Expected: 모두 PASS, console error와 unhandled rejection 0건.

Run: `npm run test:all`

Expected: 정상 경로는 console error 0, 의도한 실패 경로는 명시한 오류만 허용되고 전체 PASS.

**Step 6: 커밋한다**

```bash
git add index.html src/theme-model.js src/app.js tests/theme-model.test.js e2e/accessibility.spec.js
git commit -m "fix: expose validation and async status"
```

### Task 4: 상위 프리뷰 tab/tabpanel과 비활성 패널 차단

**Files:**
- Modify: `index.html:59`
- Modify: `index.html:102`
- Modify: `src/preview-pages.js:152`
- Modify: `src/app.js:783`
- Modify: `src/app.js:802`
- Modify: `src/app.js:1849`
- Test: `tests/preview-pages.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: 키보드 인덱스 함수의 실패 테스트를 쓴다**

`getPreviewIndexForKey(currentIndex, key)`가 Left/Right 순환, Home=0, End=마지막, 미지원 키=`undefined`를 반환해야 한다.

Run: `node --test tests/preview-pages.test.js`

Expected: 함수가 없어 FAIL한다.

**Step 2: tab/tabpanel 관계와 inert 테스트를 RED로 만든다**

- tab 10개가 `id`와 실제 panel을 가리키는 `aria-controls`를 갖는다.
- panel 10개가 `role="tabpanel"`과 역방향 `aria-labelledby`를 갖는다.
- active panel만 `inert`/`aria-hidden`이 없으며 비활성 9개는 `inert` + `aria-hidden="true"`다. 초기 index 1 상태도 HTML과 JS가 일치한다.
- Tab을 반복해도 비활성 panel 자손에는 절대 포커스가 가지 않는다.
- `page.ariaSnapshot()` 또는 `toMatchAriaSnapshot()`에서 비활성 panel 이름·역할·자손이 사라진다.

Run: `npm run test:a11y -- --grep @task4`

Expected: tabpanel 관계와 inert가 없어 FAIL한다.

**Step 3: 상태 동기화 함수를 구현한다**

`syncPreviewPanelAccessibility(activeIndex)`를 추가해 active panel의 inert를 먼저 해제하고 나머지를 비활성화한다. panel/tab ID는 page id에서 생성해 순서 변화에도 안정적으로 유지한다.

**Step 4: 탭 전용 자동 활성화 키보드 모델을 구현한다**

- keydown은 `#preview-tabs`에서만 처리한다.
- Left/Right/Home/End에서 선택과 포커스를 함께 이동한다.
- click과 이전/다음 버튼은 현재 포커스를 유지한다.
- document 전역 Left/Right 분기는 제거한다.
- passcode 숫자 단축키도 active passcode 영역 안으로 범위를 좁힌다.
- controls 근처의 `#preview-status role="status"`는 이전/다음 버튼 경로에서 “쇼핑 프리뷰, 4/10”을 공지한다. 탭 Arrow 경로에서는 선택된 탭 자체 발표와 중복되지 않도록 생략한다.
- 초기, tab Arrow, tab click, previous, next, 0↔9 wrap 뒤마다 공용 assertion으로 selected tab 1개, `tabIndex=0` 1개, active panel 1개, 상호 ID 참조, 나머지 9개 inert/hidden을 검사한다.

**Step 5: 테스트하고 커밋한다**

Run: `node --test tests/preview-pages.test.js`

Run: `npm run test:a11y -- --grep @task4`

Expected: 10개 panel 관계가 모두 맞고 화면 밖 포커스가 0건이다.

Run: `npm run test:all`

Expected: 전체 PASS.

```bash
git add index.html src/preview-pages.js src/app.js tests/preview-pages.test.js e2e/accessibility.spec.js
git commit -m "fix: connect preview tabs and inert panels"
```

### Task 5: 9-patch 최종 시맨틱과 재렌더 포커스 보존

**Files:**
- Modify: `index.html:927`
- Modify: `src/app.js:802`
- Modify: `src/app.js:823`
- Modify: `src/app.js:839`
- Modify: `src/app.js:886`
- Modify: `styles.css:2370`
- Test: `tests/nine-patch-controls.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: 최종 DOM과 포커스 실패를 독립 테스트로 고정한다**

- `detail click focuses semantic heading`: `${말풍선명} 상세` 클릭 후 실제 `h3 tabindex="-1"`이 activeElement
- `fit radio retains focus`: “채우기/전체” native radio 변경 후 해당 radio 노드와 focus 유지
- `previous retains trigger focus`, `next retains trigger focus`: 각 버튼에 focus 유지
- “배치” fieldset/legend, radio checked 상태, 8개 slider의 말풍선명 + 한국어 속성 + 시작/끝 이름
- accessible name에 `stretchX`, `paddingY` 같은 내부 키가 없고 이름 없는 output/status도 없음

Run: `npm run test:a11y -- --grep @task5`

Expected: 현재 `<strong>`, button 상태, `replaceChildren()` 때문에 FAIL한다.

**Step 2: 포커스 의도를 명시하고 의미 있는 진입점을 만든다**

상세 제목을 heading 계층에 맞는 `h3 tabindex="-1"`로 바꾼다. `setPreviewIndex(index, { focus = "preserve" } = {})`가 active panel의 inert 해제 → 최종 컨트롤 렌더 → 요청된 heading focus 순서를 동기식으로 보장한다. 고정 timeout이나 불필요한 rAF는 사용하지 않는다.

**Step 3: 최종 native radio/range 구조를 한 번만 구현한다**

- fit은 fieldset/legend 안의 native radio로 구현하고 기존 버튼 외형은 label에 이식한다.
- range pair도 fieldset/legend로 묶고 시작/끝 label과 안정적인 id를 부여한다.
- 보이는 수치는 `span aria-hidden="true"`로 두고 slider의 `aria-valuetext="41픽셀"`을 값 변경 때 동기화한다.
- radio 변경은 상세 panel을 교체하지 않고 `syncBubbleFitControlState()`와 preview/upload 갱신만 수행한다.
- bubble key나 range 구조가 달라질 때만 전체 렌더링한다.

**Step 4: 유한한 포커스 경로를 각각 GREEN으로 만든다**

각 테스트는 하나의 action만 수행하고 activeElement, 현재 panel, checked/value 상태를 독립 검증한다. 상세 진입, 두 radio, 이전, 다음 경로 모두에서 body focus가 아니어야 한다.

Run: `node --test tests/nine-patch-controls.test.js`

Run: `npm run test:a11y -- --grep @task5`

Run: `npm run test:all`

Expected: 모두 PASS.

**Step 5: 커밋한다**

```bash
git add index.html src/app.js styles.css tests/nine-patch-controls.test.js e2e/accessibility.spec.js
git commit -m "fix: expose bubble controls and preserve focus"
```

### Task 6: 모의 컨트롤 제거와 캐러셀 대체 조작 제공

**Files:**
- Modify: `index.html:111`
- Modify: `index.html:218`
- Modify: `index.html:622`
- Modify: `index.html:667`
- Modify: `index.html:1002`
- Modify: `src/app.js:357`
- Modify: `styles.css:759`
- Modify: `styles.css:1101`
- Modify tests: `tests/upload-panel-markup.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: 모의 UI 역할 테스트를 RED로 만든다**

home/chat-list/open-chat/shopping/more/chat/theme-list의 비기능 header·내부 tab·하단 tab·send/menu 컨트롤이 button/link/tab 역할로 노출되지 않아야 한다. bubble-detail과 passcode의 실제 컨트롤은 남아야 한다.

**Step 2: 비기능 위젯을 시각 요소로 바꾼다**

- button/tab/link를 `.preview-mock-control` span/div로 교체한다.
- CSS element selector를 class selector로 바꿔 외형을 유지한다.
- 실제 외부 링크로 유지할 요소는 목적과 새 창 정보를 포함한 이름을 제공한다.
- 모의 텍스트 링크는 링크 역할을 제거한다.
- 각 페이지의 남는 샘플 콘텐츠를 명시적으로 분류한다. 접근 가능한 샘플은 heading/list/group과 “선택됨” 텍스트를 제공하고, 순수 장식 subtree는 숨긴 뒤 panel에 짧은 대체 요약을 연결한다. 말풍선·암호 같은 실제 컨트롤은 `aria-hidden` 조상 밖에 둔다.
- CSS 배경 썸네일은 인접 상품명·자산명이 같은 의미를 제공할 때만 장식으로 처리한다. 의미가 독립적이면 대체 설명을 제공한다.
- 각 active panel의 ARIA snapshot으로 장식 subtree가 사라지고 필요한 heading/요약/실제 컨트롤만 남는지 확인한다.

**Step 3: 캐러셀 대체 조작 테스트를 RED로 만든다**

- 캐러셀에 focus 후 ArrowLeft/Right와 Home/End로 scroll 위치가 변한다.
- “이전 상품”/“다음 상품” 버튼도 같은 동작을 제공한다.
- 시작·끝 경계의 disabled 상태가 scroll/resize 후 동기화된다.
- 캐러셀 방향키가 상위 preview를 바꾸지 않는다.
- `scrollWidth > clientWidth`를 사전 확인하고 실제 `mouse.down/move/up` drag 뒤 scrollLeft가 바뀌며 pointer capture가 해제되는지 검사한다.
- 끝 판정은 `Math.abs(scrollLeft - maxScrollLeft) <= 1`을 사용하고 smooth scroll은 `expect.poll`로 기다린다.
- keyboard, 각 버튼, pointer drag를 독립 테스트로 두고 모든 경로에서 상위 preview index와 trigger focus가 보존되는지 확인한다.

Run: `npm run test:a11y -- --grep @task6`

Expected: 모의 역할과 drag 전용 조작 때문에 FAIL한다.

**Step 4: pointer·keyboard·button을 한 setup 함수에 구현한다**

캐러셀에 named region과 `tabindex="0"`를 주고 native 이전/다음 버튼을 `aria-controls`로 연결한다. 각 상품은 “1/4, 손 커미션”처럼 위치·전체 개수를 포함하며 현재 보이는 항목을 polite status로 알린다. 같은 위치를 반복 공지하지 않도록 scroll settle 시점에만 갱신한다.

**Step 5: 테스트하고 커밋한다**

Run: `npm run test:a11y -- --grep @task6`

Run: `npm test`

Expected: 모의 위젯 노출 0, 세 입력 방식 모두 PASS.

Run: `npm run test:all`

Expected: 전체 PASS.

```bash
git add index.html src/app.js styles.css tests/upload-panel-markup.test.js e2e/accessibility.spec.js
git commit -m "fix: separate preview decoration from real controls"
```

### Task 7: 암호 시뮬레이션 상태 제공

**Files:**
- Modify: `index.html:960`
- Modify: `src/app.js:1810`
- Modify: `src/passcode-preview.js:1`
- Test: `tests/passcode-preview.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: 암호 상태 순수 함수와 실패 테스트를 작성한다**

`formatPasscodeStatus(count)`는 “4자리 중 0자리 입력됨”부터 4자리까지 반환해야 하며 실제 숫자 값은 포함하지 않는다.

Run: `node --test tests/passcode-preview.test.js`

Expected: 함수가 없어 FAIL한다.

Run: `npm run test:a11y -- --grep @task7`

Expected: 전용 status와 제한된 keyboard 범위가 없어 FAIL한다.

**Step 2: 암호 전용 status를 구현한다**

dot 이미지는 계속 장식으로 숨기고 `#passcode-status role="status" aria-atomic="true"`를 추가한다. 입력·삭제·취소 때 개수만 갱신한다. 삭제 버튼의 가시 이름을 “한 자리 지우기”로 명확히 한다.

숫자 단축키는 passcode panel이 active이고 focus가 passcode screen 안에 있을 때만 처리한다. 클릭과 키보드로 0→1→4(cap)→3(delete)→0(cancel)을 검사하고 status에 실제 digit가 포함되지 않음을 확인한다.

**Step 3: 테스트하고 커밋한다**

Run: `node --test tests/passcode-preview.test.js`

Run: `npm run test:a11y -- --grep @task7`

Run: `npm run test:all`

Expected: status와 키보드 범위가 모두 PASS한다.

```bash
git add index.html src/app.js src/passcode-preview.js tests/passcode-preview.test.js e2e/accessibility.spec.js
git commit -m "fix: expose passcode state accessibly"
```

### Task 8A: 색 포맷과 대비 계산 기반

**Files:**
- Create: `src/color-contrast.js`
- Create: `tests/color-contrast.test.js`

**Step 1: CSS HEX와 테마 ARGB를 구분하는 실패 테스트를 작성한다**

- `parseCssHex`: `#RRGGBB`, CSS 표준 `#RRGGBBAA`
- `parseThemeArgb`: 프로젝트 테마 포맷 `#AARRGGBB`
- 비대칭 fixture `#26664242`는 `{ r:102, g:66, b:66, a:38/255 }`, CSS 대응은 `#66424226`
- 알파 합성, 검정/흰색 21:1, 4.5 경계 전후의 반올림 전 판정, 잘못된 문자열

Run: `node --test tests/color-contrast.test.js`

Expected: 모듈이 없어 FAIL한다.

**Step 2: 공통 RGBA 정규화와 순수 계산을 구현한다**

`parseCssHex`, `parseThemeArgb`, `compositeColors`, `relativeLuminance`, `contrastRatio`, `evaluateContrastPair`를 DOM 의존성 없이 구현한다. 어떤 포맷을 받는지 함수 이름과 JSDoc에 고정하고 `{ status, ratio, required }`를 반환한다.

**Step 3: GREEN과 전체 회귀를 확인하고 커밋한다**

Run: `node --test tests/color-contrast.test.js`

Run: `npm run test:all`

Expected: PASS.

```bash
git add src/color-contrast.js tests/color-contrast.test.js
git commit -m "test: add unambiguous contrast calculations"
```

### Task 8B: 실제 렌더링 문맥과 기본 팔레트 대비

**Files:**
- Modify: `src/color-contrast.js`
- Modify: `src/theme-model.js:119`
- Modify: `src/app.js:1672`
- Modify: `styles.css:917`
- Modify: `styles.css:1210`
- Modify: `styles.css:1297`
- Modify: `styles.css:1740`
- Modify: `styles.css:1809`
- Modify: `styles.css:1876`
- Modify: `styles.css:1906`
- Modify: `styles.css:2056`
- Modify: `styles.css:2104`
- Modify: `styles.css:2610`
- Modify: `styles.css:2802`
- Modify: `styles.css:2920`
- Create: `docs/accessibility-contrast-ledger.md`
- Test: `tests/color-contrast.test.js`
- Test: `tests/theme-model.test.js`
- Test: `tests/theme-builder.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: `CONTRAST_CONTEXTS`와 정적 ledger를 RED로 만든다**

각 문맥은 `id`, `pageId`, 실제 `selector`, `foregroundKey` 또는 정적 색, `backgroundKey` 또는 정적 색, `imageKeys`, `state`, `kind`, `required`를 가진다. home부터 theme-list까지 10개 page의 default/hover/pressed/selected 상태를 전수 등록한다. 하나의 색이 여러 배경에서 쓰이면 모든 문맥을 보존한다.

다음 잘못된 단순화를 금지한다.

- 투명 keypad button을 `passcodeKeypadBackground`와 바로 비교하지 않는다. 실제 passcode screen 색/이미지 문맥을 사용한다.
- send/receive text는 실제 9-patch image key를 포함한다.
- main/tab/passcode 이미지가 색 위를 덮으면 보장된 불투명 scrim이 없는 한 `unknown`이다.

`docs/accessibility-contrast-ledger.md`에는 selector, 상태, 실제 전경, 최악 배경, image/scrim, 기준값, 자동·수동 판정과 증거를 기록한다.

Run: `node --test tests/color-contrast.test.js tests/theme-model.test.js tests/theme-builder.test.js`

Run: `npm run test:a11y -- --grep @task8-default`

Expected: 누락된 문맥과 현재 저대비 기본값 때문에 FAIL한다.

**Step 2: 공유 토큰 의미를 먼저 바로잡는다**

네이티브에서 unread text 색인 `unreadCount`를 웹 배지 배경으로 쓰지 않는다. 웹 전용 `--preview-unread-badge-background: #552020`을 추가하고 `unreadCount`는 배지 전경으로 사용한다. 프리뷰에서 사용되지 않는 `sendButtonPressed`는 이번 웹 보완 때문에 변경하지 않는다.

**Step 3: 기본 토큰과 알려진 정적 실패를 수정한다**

시작 후보는 테스트로 최종 확정한다.

- `sectionTitle: #9B3F49` — `#FFDEDE` 대비 약 5.235:1
- `titlePressed: #664242` — `#FFB3B3` 대비 약 5.098:1
- `sendButton`, `inputMenu: #B23A48` — 흰색 대비 약 5.847:1
- 정적 보조 텍스트 `#687078` — 흰색 대비 약 5.027:1
- `.date-chip` 배경 최소 `rgba(0,0,0,.55)` — 흰 배경에서도 흰 텍스트 약 4.74:1
- `.shopping-order-icon::before` 전경 `#9B3F49` — `#DEDEDE` 대비 약 4.876:1

투명 보조 텍스트는 불투명 색으로 바꾸고 위계는 크기·굵기·간격으로 유지한다. 이미지 위 상품 카드 텍스트에는 실제 텍스트 영역 전체에서 4.5:1을 수학적으로 보장하는 불투명/고정 알파 scrim을 둔다. message bubble·passcode 등 이미지 문맥은 기본 bundled image를 selector별로 측정해 ledger에 기록하고, 미달하면 text backing/scrim을 추가한다.

**Step 4: 프리뷰와 네이티브 출력 회귀를 함께 검증한다**

Run: `node --test tests/color-contrast.test.js tests/theme-model.test.js tests/theme-builder.test.js`

Run: `npm run test:a11y -- --grep @task8-default`

Expected: 모든 계산 가능한 기본 문맥이 기준을 통과하고, 이미지 문맥은 ledger의 수동 증거 또는 보장된 scrim을 가진다. iOS CSS와 Android XML의 의도한 기본값도 명시적으로 일치한다.

**Step 5: 전체 GREEN을 확인하고 커밋한다**

Run: `npm run test:all`

Expected: PASS.

```bash
git add src/color-contrast.js src/theme-model.js src/app.js styles.css docs/accessibility-contrast-ledger.md tests/color-contrast.test.js tests/theme-model.test.js tests/theme-builder.test.js e2e/accessibility.spec.js
git commit -m "fix: make the default preview contrast accessible"
```

### Task 8C: 사용자 생성 색상·이미지 대비 결과 UI

**Files:**
- Modify: `src/app.js:44`
- Modify: `src/app.js:462`
- Modify: `src/app.js:611`
- Modify: `src/app.js:1672`
- Modify: `index.html:64`
- Modify: `styles.css:195`
- Test: `tests/color-contrast.test.js`
- Test: `tests/upload-panel-markup.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: 비차단 사용자 정책과 재계산 범위를 RED로 만든다**

- 저대비 값은 state와 preview에 유지되고 다운로드도 가능하지만 비율·필요 기준·실패 화면·초기화가 텍스트로 표시된다.
- 이 의도적 사용자 생성 상태에는 axe 0건을 요구하지 않는다. 앱 chrome과 경고 UI 자체만 별도 scope로 검사한다.
- 배경색 변경은 연결된 모든 전경 문맥을, 이미지 업로드는 영향받는 문맥만 `unknown`으로, 삭제는 수치 상태로 다시 계산한다.
- 페이지 전환은 현재 화면 행/요약을 바꾸고, 전체 테마 요약은 최악 비율과 실패한 모든 화면을 유지한다.
- picker, HEX input, native color input 모두 결과 설명과 연결된다.
- 초기화하면 기본 AA 상태로 돌아온다.

Run: `npm run test:a11y -- --grep @task8-user`

Expected: 대비 결과 UI와 재계산 모델이 없어 FAIL한다.

**Step 2: 현재 화면과 전체 테마 결과 모델을 구현한다**

행별 결과에는 현재 active page의 모든 관련 문맥을 표시한다. 패널 상단의 polite status는 현재 화면 실패·unknown 개수를 디바운스해 알리고, 다운로드 영역 근처의 전체 요약은 전체 테마의 최악값·실패 화면·unknown 이미지 문맥을 제공한다.

**Step 3: 모든 변경 경로에서 재계산한다**

HEX/picker/native color 입력, reset, 배경색 변경, 이미지 upload/delete, preview page 변경에서 동일 `evaluateThemeContrast`를 호출한다. 같은 값이 반복될 때 고빈도 입력은 병합하되, reset이나 page 변경 같은 이산 작업은 다시 공지한다.

**Step 4: GREEN과 전체 회귀를 확인하고 커밋한다**

Run: `node --test tests/color-contrast.test.js tests/upload-panel-markup.test.js`

Run: `npm run test:a11y -- --grep @task8-user`

Run: `npm run test:all`

Expected: 기본 상태 PASS, 저대비 사용자 상태는 정확한 비차단 경고, 이미지 상태는 unknown, 초기화 후 PASS.

```bash
git add src/app.js index.html styles.css tests/color-contrast.test.js tests/upload-panel-markup.test.js e2e/accessibility.spec.js
git commit -m "feat: report user theme contrast without altering output"
```

### Task 9A: 비텍스트 대비, 포커스 표시, target 크기

**Files:**
- Modify: `styles.css:1`
- Modify: `styles.css:140`
- Modify: `styles.css:162`
- Modify: `styles.css:204`
- Modify: `styles.css:228`
- Modify: `styles.css:286`
- Modify: `styles.css:397`
- Modify: `styles.css:430`
- Modify: `styles.css:582`
- Modify: `styles.css:3050`
- Test: `tests/accessibility-markup.test.js`
- Test: `e2e/accessibility.spec.js`

**Step 1: 각 시각 상태의 실패 테스트를 독립 작성한다**

- 입력 경계와 흰색/`#FBFBFA` 인접 배경 3:1 이상
- 실제 Tab focus ring과 인접 배경 3:1 이상, bounding box가 viewport와 clip ancestor 안에서 보임
- 선택 preview tab에 배경색 외 3px indicator 존재
- file label focus ring 존재
- checkbox·색상 input 등 실제 hit area가 24×24 CSS px 또는 spacing 예외 충족

Run: `npm run test:a11y -- --grep @task9-focus`

Expected: 낮은 경계·focus·선택 대비로 FAIL한다.

**Step 2: 공용 토큰과 클리핑되지 않는 표현을 구현한다**

시작값은 `--control-border: #7A8087`(흰색 약 3.989:1), `--focus-ring`/`--selected-indicator: #0B6B5F`(흰색 약 6.397:1)로 한다. 기존 `outline:0`을 제거하고 공용 3px ring을 사용한다. `.preview-tabs`의 `overflow:hidden`에 잘리지 않도록 탭은 음수 offset의 내부 outline 또는 별도 inset indicator를 사용한다. 이미지 위 컨트롤은 밝고 어두운 이중 링을 사용한다.

**Step 3: 선택 상태와 hit area를 수정한다**

활성 preview tab은 색상 외 내부 밑줄/indicator로 구분한다. 각 작은 control은 실제 clickable label/target 경계를 측정해 24×24 이상으로 만들고 인접 target spacing을 다시 검사한다.

**Step 4: GREEN과 전체 회귀를 확인한다**

Run: `npm run test:a11y -- --grep @task9-focus`

Expected: computed color/width뿐 아니라 실제 Tab 도달, focus bounding box, 상태별 스크린샷 차이가 PASS.

Run: `npm run test:all`

**Step 5: 커밋한다**

```bash
git add styles.css tests/accessibility-markup.test.js e2e/accessibility.spec.js
git commit -m "fix: strengthen control and focus visibility"
```

### Task 9B: 강제 색상 모드

**Files:**
- Modify: `styles.css:522`
- Modify: `styles.css:614`
- Modify: `styles.css:759`
- Modify: `styles.css:2331`
- Modify: `styles.css:3098`
- Test: `e2e/accessibility.spec.js`

**Step 1: 사용자 이미지를 포함한 forced-colors 테스트를 RED로 만든다**

배경 이미지를 먼저 업로드한 뒤 `forcedColors: "active"` context에서 main/chat/tab/passcode URL background가 제거되고, 입력 경계·focus·활성 탭·mask icon이 시스템 색으로 식별되어야 한다.

Run: `npm run test:a11y -- --grep @task9-forced`

Expected: 전용 규칙이 없어 FAIL한다.

**Step 2: 시스템 색상 규칙을 구현한다**

- 텍스트/배경: CanvasText/Canvas
- 경계: ButtonText
- focus와 활성 탭 3px indicator: Highlight
- main/chat/tab/passcode URL background, backdrop-filter, 의미 의존 shadow: 제거
- mask icon만 제한적으로 `forced-color-adjust:none; background-color:ButtonText`

페이지 전체에 `forced-color-adjust:none`을 적용하지 않는다.

**Step 3: GREEN과 전체 회귀를 확인하고 커밋한다**

Run: `npm run test:a11y -- --grep @task9-forced`

Run: `npm run test:all`

Expected: 자동 emulation PASS. 고대비 수동 완료 기준은 Task 10의 2026-08-22 개정 기준(실제 Windows 또는 동등한 forced-colors 환경)으로 대체한다.

```bash
git add styles.css e2e/accessibility.spec.js
git commit -m "fix: support forced colors without image interference"
```

### Task 9C: 모바일 리플로우, 텍스트 간격, 실제 확대

**Files:**
- Modify: `index.html:102`
- Modify: `index.html:1087`
- Modify: `src/app.js:332`
- Modify: `styles.css:623`
- Modify: `styles.css:646`
- Modify: `styles.css:875`
- Modify: `styles.css:1794`
- Modify: `styles.css:2905`
- Modify: `styles.css:3098`
- Modify: `styles.css:3125`
- Modify: `styles.css:3172`
- Test: `e2e/accessibility.spec.js`

**Step 1: 실행 가능한 geometry oracle을 RED로 만든다**

모든 10개 page × phone/tablet를 320×800과 390×844에서 반복한다.

- `documentElement.scrollWidth <= clientWidth + 1`
- static footer의 `top >= app-shell.bottom - 1`
- named overflow region은 실제 Tab으로 도달 가능하고 끝까지 스크롤한 뒤 마지막 콘텐츠 bounding box가 viewport 안에 나타남
- clipping 금지 selector의 text range가 `overflow:hidden` 조상에 잘리지 않음
- footer 제목·status·면책 문구가 wrap되고 가시 text range가 전부 노출됨

Run: `npm run test:a11y -- --grep @task9-reflow`

Expected: fixed footer overlap과 clipping으로 FAIL한다.

**Step 2: 하나의 리플로우 전략을 구현한다**

- 760px 이하에서 `.download-bar { position: static; }`, 고정 footer용 app padding 제거
- footer의 `nowrap`/ellipsis 제거, `overflow-wrap:anywhere`와 자연스러운 높이 사용
- 실제로 넘치는 `.chat-screen`과 page별 content scroller에 `overflow:auto`, `tabindex="0"`, `role="region"`, 고유 이름 제공
- 의미 있는 텍스트는 fixed height/nowrap/ellipsis 대신 wrap/min-height 사용
- 고정 phone aspect ratio 안에서 전부 보여줄 수 없는 시각 샘플은 Task 6에서 정의한 접근 가능한 요약으로 동등 정보를 제공

**Step 3: WCAG 텍스트 간격을 자동 검사한다**

```css
* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
p { margin-bottom: 2em !important; }
```

이 override에서도 Step 1의 oracle과 필수 control 방문 배열을 반복한다.

**Step 4: 자동 GREEN과 수동 확대 경계를 분리한다**

Run: `npm run test:a11y -- --grep @task9-reflow`

Expected: 320 CSS px와 text spacing 자동 검사 PASS. `deviceScaleFactor`는 page zoom 증거로 사용하지 않는다. 실제 확대 완료 기준은 Task 10의 2026-08-22 개정 기준(해당 단계를 지원하는 실제 브라우저의 200%·400%)으로 대체한다.

Run: `npm run test:all`

**Step 5: 커밋한다**

```bash
git add index.html src/app.js styles.css e2e/accessibility.spec.js
git commit -m "fix: prevent mobile and text-spacing clipping"
```

### Task 9D: 감소된 움직임 보완

**Files:**
- Modify: `styles.css:639`
- Test: `e2e/accessibility.spec.js`

이 작업은 WCAG 2.3.3 AAA 참고 보완이며 AA 차단 결함으로 계산하지 않는다.

**Step 1: reduced-motion RED를 작성한다**

`reducedMotion: "reduce"`에서 preview transition duration 0s이고 페이지 전환·focus 동작은 유지되어야 한다.

Run: `npm run test:a11y -- --grep @task9-motion`

Expected: transition이 남아 FAIL한다.

**Step 2: CSS를 구현한다**

```css
@media (prefers-reduced-motion: reduce) {
  .preview-track { transition: none; }
}
```

**Step 3: GREEN과 전체 회귀를 확인하고 커밋한다**

Run: `npm run test:a11y -- --grep @task9-motion`

Run: `npm run test:all`

```bash
git add styles.css e2e/accessibility.spec.js
git commit -m "fix: honor reduced motion preferences"
```

### Task 10: 전 화면 자동 감사와 수동 완료 게이트

**Files:**
- Modify: `e2e/accessibility.spec.js`
- Create: `docs/accessibility-verification.md`
- Modify: `.github/workflows/accessibility.yml`

**Step 1: 10개 프리뷰 상태의 axe 테스트를 완성한다**

lockfile로 고정된 axe 버전이 지원하는 `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa` tag를 먼저 확인해 명시한다. 각 상위 tab을 활성화한 후 앱 chrome과 기본 프리뷰에 `AxeBuilder`를 실행한다. `color-contrast`, `aria-hidden-focus` 같은 규칙을 전역 제외하지 않는다. 비활성 panel은 `page.ariaSnapshot()`/`toMatchAriaSnapshot()`에서도 이름·역할·자손이 없어야 한다. 자동화가 판정하지 못하는 항목은 예외 처리 대신 수동 체크리스트로 이동한다.

의도적으로 저대비인 사용자 생성 시나리오는 전체 page axe 0건 gate와 분리한다. 그 시나리오는 경고·비율·초기화·부분 준수 설명과 앱 chrome scope만 검사한다.

**Step 2: 전체 키보드 시나리오를 추가한다**

- 최대 200회의 실제 Tab으로 설정 → 색상 → 업로드 → preview tabs/arrows → footer를 순회하며 종료 target을 `#download-android`로 고정
- 필수 방문 accessible name 배열, 순서, 중복 loop를 기록하고 필수 control을 누락하거나 같은 cycle이 반복되면 실패
- 비활성 panel 포커스 0
- tab Arrow/Home/End
- color popover Escape와 포커스 복귀
- 상세 진입·radio·range
- passcode 입력·삭제·취소
- carousel keyboard·button
- invalid/valid 입력, upload 성공/실패, download 시작/성공/실패

**Step 3: 브라우저 오류를 실패로 처리한다**

공통 fixture에서 `pageerror`, console error, unhandled rejection을 수집한다. 정상 시나리오는 모두 0건이어야 한다. 의도한 network/decode 실패 테스트만 정확한 메시지·횟수 allowlist를 선언하고 나머지는 실패시킨다.

**Step 4: 전체 자동 검증을 실행한다**

Run: `npm run test:all`

Expected: Node와 Playwright 모두 fail 0, axe violation 0.

**Step 5: 수동 검증을 실행하고 기록한다**

> 2026-08-22 범위 변경: 사용자 지시에 따라 VoiceOver 실청취와 VoiceOver 상호작용 검사는 완료 기준에서 제외한다. 자동 ARIA snapshot을 실제 음성 검증으로 대체하거나 PASS로 기록하지 않는다.

`docs/accessibility-verification.md`에 날짜·브라우저·보조기술·결과와 WCAG 2.2 성공기준 ↔ KWCAG 2.2 공식 조항 crosswalk를 기록한다. axe가 담당하는 항목, custom browser assertion, 수동 검증의 소유 기준을 구분한다.

- Safari + VoiceOver: heading/landmark, form names, tab/tabpanel, live/alert, 암호 상태
- Chrome + VoiceOver: 전체 Tab 순서와 동적 포커스
- Windows High Contrast 또는 동등 환경: 경계·포커스·선택·mask icon
- 200%/400% 확대 및 320 CSS px: 정보·기능 손실과 footer 가림
- WCAG 텍스트 간격: 겹침·클리핑·조작 손실
- 키보드만으로 테마 설정부터 다운로드까지 완료

Expected: VoiceOver 제외 범위 외의 필수 항목 PASS. 고대비는 실제 Windows 또는 동등한 `forced-colors` 환경 중 하나를 완료하고, 200%/400% 확대는 해당 단계를 지원하는 실제 브라우저에서 완료한다. 실제 화면낭독기 결과를 수행하는 경우 중복 발표나 브라우저별 차이가 있으면 해당 작업으로 되돌아간다.

**Step 6: 최종 회귀와 diff를 검토한다**

Run: `npm run test:all`

Run: `git diff --check`

Run: `git status --short`

Expected: 테스트 fail 0, whitespace error 0, 계획된 파일만 변경됨.

**Step 7: 커밋한다**

```bash
git add e2e/accessibility.spec.js docs/accessibility-verification.md .github/workflows/accessibility.yml
git commit -m "test: verify WCAG accessibility across every preview"
```

## 계획 검토 체크리스트

- [x] 감사에서 확인한 모든 결함이 추적표의 구현 작업과 연결되는가?
- [x] 각 행동 변화에 구현보다 먼저 실패하는 테스트가 있는가?
- [x] 정규식 테스트만으로 포커스·이름·기하를 증명하려는 단계가 없는가?
- [x] 모의 UI와 실제 UI의 경계가 명확한가?
- [x] 기본 팔레트 변경이 실제 iOS/Android 다운로드 결과와 함께 검증되는가?
- [x] 사용자 이미지·임의 색상처럼 자동으로 증명할 수 없는 경계가 명시되어 있는가?
- [x] axe 결과를 수동 화면낭독기 검증의 대체물로 사용하지 않는가?
- [x] 320px, 확대, 텍스트 간격, forced-colors, reduced-motion을 포함하는가?
- [x] 각 작업이 독립 커밋과 전체 회귀 명령을 포함하는가?

## 독립 검토 결과와 반영 사항

**검토일:** 2026-08-21
**검토 관점:** 시맨틱/DOM, 키보드·포커스/TDD, 색 대비·리플로우

### 반영한 P1 수정

1. Task 0에서 알려진 실패 테스트와 CI를 함께 커밋하던 모순을 제거했다. Task 0은 green smoke만 저장하고 각 RED는 해당 구현 작업 안에서 GREEN까지 끝낸다.
2. 모든 브라우저 테스트에 `@taskN` 태그를 두고 같은 filter로 RED/GREEN을 실행하며, 각 커밋 전 `npm run test:all`을 수행하도록 통일했다.
3. 9-patch 버튼 포커스를 먼저 고친 뒤 radio로 다시 교체하던 중복 순서를 없앴다. 최종 native radio/range 시맨틱과 포커스 보존을 Task 5에서 한 번에 구현한다.
4. CSS `#RRGGBBAA`와 프로젝트 테마 ARGB `#AARRGGBB` 파서를 분리하고 비대칭 alpha fixture를 추가했다.
5. 단순 토큰쌍 대신 실제 selector·페이지·상태·image key를 가진 대비 ledger로 바꿨다. 날짜 칩, 주문 아이콘, 이미지 위 텍스트와 unread token 의미 차이를 명시적으로 닫았다.
6. 모바일 리플로우 전략을 “static footer + named/focusable overflow region + wrapping text”로 확정하고 실행 가능한 geometry oracle을 추가했다.
7. 사용자 지정 색상 정책을 비차단 경고와 부분 준수 범위로 확정했다. 이 상태에 전체 page axe 0건을 잘못 요구하지 않는다.

### 반영한 P2/P3 수정

- file input은 프로그램적 `.focus()`가 아니라 실제 Tab 도달·이탈과 가시 ring을 검사한다.
- 탭 상태는 초기/Arrow/click/previous/next/wrap 뒤 공용 assertion과 ARIA snapshot으로 검사한다.
- 캐러셀은 실제 프리뷰 탐색 기능으로 분류하고 pointer·keyboard·button을 독립 검증하며 위치 status를 제공한다.
- 필수 필드의 `required`/pattern/native validity/가시 오류/다운로드 gate를 하나의 validation 결과로 통일한다.
- 동일 업로드·동일 실패도 다시 공지되도록 이산 live event와 고빈도 debounce를 분리한다.
- 정상 console 오류 0과 의도적 실패 allowlist를 구분하고 테스트 서버의 `src/env-config.js` 쓰기를 막는다.
- focus token 값, clip 대응, forced-colors의 사용자 배경 제거, 10 page × phone/tablet 리플로우 판정식을 추가했다.
- reduced-motion은 AA 차단이 아닌 AAA 참고 보완으로 표시했다.

### 검토 결론

선언한 범위인 **앱 chrome + 기본 프리뷰 WCAG 2.2 AA/KWCAG 2.2 보완 계획으로 실행 가능**하다. 남은 정책 경계는 임의 사용자 생성 색·이미지이며, 계획은 이를 자동 통과로 오판하지 않고 부분 준수·경고·수동 확인 대상으로 명시한다. 모든 사용자 생성 상태까지 완전한 AA를 강제하려면 별도 제품 결정으로 실패 값의 프리뷰 적용 자체를 차단해야 한다.

## 실행 인계

계획 실행 시 두 방식 중 하나를 사용한다.

1. **Subagent-Driven (현재 세션):** `superpowers:subagent-driven-development`로 작업별 구현·요구사항 검토·코드 품질 검토를 수행한다.
2. **Parallel Session (별도 세션):** 전용 worktree에서 `superpowers:executing-plans`로 배치 실행하고 작업별 체크포인트에서 검토한다.
