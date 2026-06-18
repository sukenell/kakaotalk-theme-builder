# KakaoTalk Theme Builder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a GitHub Pages-ready frontend that previews KakaoTalk theme settings and downloads iOS `.ktheme` plus Android theme source ZIP outputs from the official samples.

**Architecture:** The app is a no-server static site. Template files are served from `assets/templates`, patched in the browser, then packed into ZIP-compatible outputs with a small local ZIP writer.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Node built-in test runner.

---

### Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `package.json`

**Steps:**
1. Create a three-panel layout for settings, uploads, and preview.
2. Add a bottom download bar with iOS and Android buttons.
3. Keep it static so GitHub Pages can host it without build output.

### Task 2: Theme Model And Tests

**Files:**
- Create: `src/theme-model.js`
- Create: `tests/theme-model.test.js`

**Steps:**
1. Write tests for converting theme settings into iOS CSS patches.
2. Write tests for converting theme settings into Android `colors.xml` patches.
3. Implement the minimal mapper functions.

### Task 3: ZIP Utilities And Tests

**Files:**
- Create: `src/zip-utils.js`
- Create: `tests/zip-utils.test.js`

**Steps:**
1. Write a test proving the ZIP writer emits entries with expected names.
2. Implement stored ZIP writing with CRC32.
3. Avoid runtime dependencies.

### Task 4: Template Assets

**Files:**
- Create: `scripts/build-template-manifest.mjs`
- Create: `assets/templates/**`
- Create: `assets/template-manifest.json`

**Steps:**
1. Copy iOS and Android sample files into the project.
2. Generate a manifest with each template file path.
3. Use the manifest from the browser to fetch files.

### Task 5: Browser App

**Files:**
- Create: `src/app.js`

**Steps:**
1. Wire color controls to a shared state object.
2. Wire uploads to preview image URLs and output file replacements.
3. Render a KakaoTalk-style preview without changing the real template layout.
4. Download patched iOS `.ktheme` and Android source ZIP files.

### Task 6: Verification

**Files:**
- Modify as needed.

**Steps:**
1. Run `npm test`.
2. Start a local static server.
3. Open the app in the browser and inspect desktop/mobile screenshots.
4. Copy the verified project to `/Users/he-su/Documents/GitHub/kakaotalk-theme-builder`.
