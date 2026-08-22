import { expect, test as base } from "@playwright/test";

const allowedBrowserDiagnostics = new WeakMap();
const supportedDiagnosticKinds = new Set(["console.error", "pageerror"]);

function diagnosticKey({ kind, message }) {
  return JSON.stringify([kind, message]);
}

function summarizeDiagnostics(diagnostics) {
  const counts = new Map();

  for (const diagnostic of diagnostics) {
    const key = diagnosticKey(diagnostic);
    const current = counts.get(key) ?? {
      kind: diagnostic.kind,
      message: diagnostic.message,
      count: 0,
    };
    current.count += diagnostic.count ?? 1;
    counts.set(key, current);
  }

  return [...counts.values()].sort((left, right) =>
    diagnosticKey(left).localeCompare(diagnosticKey(right)),
  );
}

function normalizeConsoleLocation(consoleMessage, pageUrl) {
  const location = consoleMessage.location();
  return {
    url: location.url || pageUrl,
    lineNumber: Number.isInteger(location.lineNumber) ? location.lineNumber : null,
    columnNumber: Number.isInteger(location.columnNumber) ? location.columnNumber : null,
  };
}

function normalizePageErrorLocation(error, pageUrl) {
  const stackLine = error.stack
    ?.split("\n")
    .find((line) => /:\d+:\d+\)?$/.test(line.trim()));
  const match = stackLine?.trim().match(/(?:at\s+.*?\s+\()?(.+?):(\d+):(\d+)\)?$/);

  return {
    url: match?.[1] || pageUrl,
    lineNumber: match ? Number(match[2]) : null,
    columnNumber: match ? Number(match[3]) : null,
  };
}

/**
 * Declares one exact browser diagnostic multiset entry for the current test.
 * Omitted declarations mean that the expected diagnostic multiset is empty.
 */
export function allowBrowserDiagnostic(page, { kind, message, count = 1 }) {
  if (!supportedDiagnosticKinds.has(kind)) {
    throw new TypeError(`Unsupported browser diagnostic kind: ${kind}`);
  }
  if (typeof message !== "string") {
    throw new TypeError("Browser diagnostic messages must be exact strings");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new TypeError("Browser diagnostic counts must be positive integers");
  }

  const allowlist = allowedBrowserDiagnostics.get(page) ?? new Map();
  const key = diagnosticKey({ kind, message });
  if (allowlist.has(key)) {
    throw new TypeError(`Browser diagnostic already declared: ${kind}: ${message}`);
  }
  allowlist.set(key, { kind, message, count });
  allowedBrowserDiagnostics.set(page, allowlist);
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const diagnostics = [];
    const recordDiagnostic = (kind, message, location) => {
      diagnostics.push({
        kind,
        message,
        url: page.url(),
        location,
      });
    };
    const onConsole = (message) => {
      if (message.type() === "error") {
        recordDiagnostic(
          "console.error",
          message.text(),
          normalizeConsoleLocation(message, page.url()),
        );
      }
    };
    const onPageError = (error) => {
      recordDiagnostic(
        "pageerror",
        error.message,
        normalizePageErrorLocation(error, page.url()),
      );
    };

    page.on("console", onConsole);
    // Playwright reports uncaught exceptions and unhandled promise rejections
    // through pageerror. A second window unhandledrejection listener would
    // record the same rejection twice.
    page.on("pageerror", onPageError);

    await use(page);

    page.off("console", onConsole);
    page.off("pageerror", onPageError);

    const expected = [...(allowedBrowserDiagnostics.get(page)?.values() ?? [])];
    const actualMultiset = summarizeDiagnostics(diagnostics);
    const expectedMultiset = summarizeDiagnostics(expected);
    const report = {
      test: {
        title: testInfo.title,
        file: testInfo.file,
      },
      finalUrl: page.url(),
      expected: expectedMultiset,
      actual: diagnostics,
      actualMultiset,
      unhandledRejections: "captured once through Playwright pageerror",
    };

    await testInfo.attach("browser-diagnostics", {
      body: Buffer.from(JSON.stringify(report, null, 2)),
      contentType: "application/json",
    });

    expect(actualMultiset, "unexpected browser console/page errors").toEqual(expectedMultiset);
  },
});

export { expect };
