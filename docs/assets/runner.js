// Shared docs runtime: API key persistence + per-example execution.
// Loaded as an ES module by every page; resolves the package via a relative
// path so it works from any depth (`/index.html`, `/api/prompts.html`, etc.).

import * as Pkg from "./lib/prompty-tools-core.js";

const {
  createPromptyClient,
  PromptyError,
  PromptyConfigError,
  PromptyAuthError,
  PromptyValidationError,
  PromptyNotFoundError,
  PromptyRateLimitError,
  PromptyServerError,
  PromptyHttpError,
  PromptyNetworkError,
  PromptyTimeoutError,
} = Pkg;

const STORAGE_KEY = "prompty-tools-core/api-key";
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// ---------------------------------------------------------------------------
// API key bar
// ---------------------------------------------------------------------------

const apiKeyInput = document.getElementById("api-key-input");
const apiKeySave = document.getElementById("api-key-save");
const apiKeyClear = document.getElementById("api-key-clear");
const apiKeyStatus = document.getElementById("api-key-status");

function getApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function setApiKey(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be disabled (e.g. private mode). Fall back silently.
  }
  refreshKeyStatus();
}

function refreshKeyStatus() {
  if (!apiKeyStatus) return;
  const key = getApiKey();
  if (key) {
    const masked = `${key.slice(0, 5)}…${key.slice(-4)}`;
    apiKeyStatus.textContent = `Saved: ${masked}`;
    apiKeyStatus.classList.add("set");
    if (apiKeyInput) {
      apiKeyInput.value = "";
      apiKeyInput.placeholder = "Replace key…";
    }
  } else {
    apiKeyStatus.textContent = "No API key set";
    apiKeyStatus.classList.remove("set");
    if (apiKeyInput) {
      apiKeyInput.placeholder = "pk_…";
    }
  }
}

if (apiKeySave) {
  apiKeySave.addEventListener("click", () => {
    const value = apiKeyInput?.value.trim() ?? "";
    setApiKey(value);
  });
}

if (apiKeyInput) {
  apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      apiKeySave?.click();
    }
  });
}

if (apiKeyClear) {
  apiKeyClear.addEventListener("click", () => setApiKey(""));
}

refreshKeyStatus();

// ---------------------------------------------------------------------------
// Example runner
// ---------------------------------------------------------------------------

document.querySelectorAll(".example").forEach(setupExample);

function setupExample(exampleEl) {
  const codeEl = exampleEl.querySelector(".example-code code");
  const button = exampleEl.querySelector(".run-button");
  const output = exampleEl.querySelector(".example-output");
  if (!codeEl || !button || !output) return;

  button.addEventListener("click", () => runExample(exampleEl, codeEl, button, output));
}

async function runExample(exampleEl, codeEl, button, output) {
  output.classList.remove("success", "error");
  output.classList.add("running");
  output.textContent = "Running…";
  button.disabled = true;

  const apiKey = getApiKey();
  if (!apiKey) {
    output.classList.remove("running");
    output.classList.add("error");
    output.textContent =
      "Set your API key in the bar above first. Get one at https://www.prompty.tools/settings/api-keys.";
    button.disabled = false;
    return;
  }

  let client;
  try {
    client = createPromptyClient({ apiKey });
  } catch (err) {
    output.classList.remove("running");
    output.classList.add("error");
    output.textContent = formatError(err);
    button.disabled = false;
    return;
  }

  // Capture console.log so examples can write idiomatic JS.
  const captured = [];
  const ogLog = console.log;
  const ogWarn = console.warn;
  const ogError = console.error;
  console.log = (...args) => {
    captured.push({ level: "log", args });
    ogLog(...args);
  };
  console.warn = (...args) => {
    captured.push({ level: "warn", args });
    ogWarn(...args);
  };
  console.error = (...args) => {
    captured.push({ level: "error", args });
    ogError(...args);
  };

  const code = codeEl.textContent ?? "";
  const isDanger = exampleEl.classList.contains("danger");
  if (isDanger) {
    const ok = window.confirm(
      "This example modifies your prompty.tools account. Proceed?",
    );
    if (!ok) {
      console.log = ogLog;
      console.warn = ogWarn;
      console.error = ogError;
      output.classList.remove("running");
      output.textContent = "Cancelled.";
      button.disabled = false;
      return;
    }
  }

  let result;
  let thrown;
  try {
    const fn = new AsyncFunction(
      "client",
      "createPromptyClient",
      "PromptyError",
      "PromptyConfigError",
      "PromptyAuthError",
      "PromptyValidationError",
      "PromptyNotFoundError",
      "PromptyRateLimitError",
      "PromptyServerError",
      "PromptyHttpError",
      "PromptyNetworkError",
      "PromptyTimeoutError",
      code,
    );
    result = await fn(
      client,
      createPromptyClient,
      PromptyError,
      PromptyConfigError,
      PromptyAuthError,
      PromptyValidationError,
      PromptyNotFoundError,
      PromptyRateLimitError,
      PromptyServerError,
      PromptyHttpError,
      PromptyNetworkError,
      PromptyTimeoutError,
    );
  } catch (err) {
    thrown = err;
  } finally {
    console.log = ogLog;
    console.warn = ogWarn;
    console.error = ogError;
  }

  output.classList.remove("running");
  if (thrown !== undefined) {
    output.classList.add("error");
    output.textContent = renderOutput(captured, thrown, /* error */ true);
  } else {
    output.classList.add("success");
    output.textContent = renderOutput(captured, result, /* error */ false);
  }
  button.disabled = false;
}

function renderOutput(logs, last, isError) {
  const lines = [];
  for (const entry of logs) {
    const prefix = entry.level === "log" ? "" : `[${entry.level}] `;
    lines.push(prefix + entry.args.map(serialize).join(" "));
  }
  if (isError) {
    lines.push(formatError(last));
  } else if (last !== undefined) {
    lines.push("→ " + serialize(last));
  }
  return lines.length > 0 ? lines.join("\n") : "(no output)";
}

function serialize(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "function") return value.toString();
  if (value instanceof Error) return formatError(value);
  try {
    return JSON.stringify(value, jsonReplacer, 2);
  } catch {
    return String(value);
  }
}

function jsonReplacer(_key, value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}

function formatError(err) {
  if (err instanceof PromptyError) {
    const parts = [`${err.name}: ${err.message}`];
    if (err.status !== undefined) parts.push(`  status: ${err.status}`);
    if (err.requestId) parts.push(`  requestId: ${err.requestId}`);
    if (err.cause !== undefined && err.cause !== null) {
      const cause = err.cause;
      const causeMessage =
        cause instanceof Error
          ? `${cause.name}: ${cause.message}`
          : String(cause);
      parts.push(`  cause: ${causeMessage}`);
    }
    return parts.join("\n");
  }
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  return String(err);
}

// ---------------------------------------------------------------------------
// Anchors on headings
// ---------------------------------------------------------------------------

document.querySelectorAll("main h2[id]").forEach((heading) => {
  const id = heading.id;
  const link = document.createElement("a");
  link.className = "anchor";
  link.href = `#${id}`;
  link.textContent = "#";
  link.setAttribute("aria-label", `Link to ${heading.textContent}`);
  heading.appendChild(link);
});
