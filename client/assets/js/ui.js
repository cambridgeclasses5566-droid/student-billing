import "./themeManager.js";

/* =========================
   DOM Helpers
========================== */

export const $ = (selector, root = document) => root.querySelector(selector);

export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* =========================
   Formatters
========================== */

export const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/* =========================
   Security / Escaping
========================== */

export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character],
  );

/* =========================
   Shared Icons
========================== */

export const closeIconSVG = `
  <svg
    class="close-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 6l12 12M18 6L6 18"/>
  </svg>
`;

/* =========================
   Toast Notification
========================== */

export function toast(text, type = "success") {
  let stack = $(".toast-stack");

  if (!stack) {
    stack = document.createElement("div");

    stack.className = "toast-stack";

    document.body.append(stack);
  }

  const item = document.createElement("div");

  item.className = `toast ${type}`;

  item.textContent = text;

  stack.append(item);

  setTimeout(() => item.remove(), 3500);
}

/* =========================
   Action Toast
========================== */

export function actionToast({ title, message = "", type = "success", actionLabel, onAction, duration = 4500 }) {
  let stack = $(".toast-stack");

  if (!stack) {
    stack = document.createElement("div");

    stack.className = "toast-stack";

    document.body.append(stack);
  }

  const item = document.createElement("div");

  item.className = `toast action-toast ${type}`;

  item.innerHTML = `
    <div>
      <strong>
        ${escapeHTML(title)}
      </strong>

      ${
        message
          ? `
            <span>
              ${escapeHTML(message)}
            </span>
          `
          : ""
      }
    </div>

    ${
      actionLabel
        ? `
          <button type="button">
            ${escapeHTML(actionLabel)}
          </button>
        `
        : ""
    }
  `;

  const timer = setTimeout(() => item.remove(), duration);

  item.querySelector("button")?.addEventListener("click", () => {
    clearTimeout(timer);

    item.remove();

    onAction?.();
  });

  stack.append(item);
}

/* =========================
   Button Busy State
========================== */

export function busy(button, on, label = "Please wait") {
  if (on) {
    button.dataset.label = button.innerHTML;

    button.disabled = true;

    button.innerHTML = `
      <span class="spinner"></span>
      ${label}
    `;
  } else {
    button.disabled = false;

    button.innerHTML = button.dataset.label || button.innerHTML;
  }
}

/* =========================
   Form Messages
========================== */

export function showMessage(element, text, type = "error") {
  element.textContent = text;

  element.className = `message show ${type}`;
}

/* =========================
   Form Dialog Setup
========================== */

export function setupFormDialog(dialog, form, { trigger = document.activeElement } = {}) {
  let dirty = false;

  dialog.classList.add("form-dialog-host");

  document.body.classList.add("modal-open");

  /* =========================
     Dirty State
  ========================== */

  const markDirty = () => {
    dirty = true;
  };

  form.addEventListener("input", markDirty);

  /* =========================
     Close Handling
  ========================== */

  const requestClose = () => {
    if (dirty && !confirm("Discard unsaved changes?")) {
      return false;
    }

    dialog.close();

    return true;
  };

  form.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", requestClose);
  });

  /* =========================
     Escape / Cancel
  ========================== */

  const onCancel = (event) => {
    event.preventDefault();

    requestClose();
  };

  /* =========================
     Backdrop Click
  ========================== */

  const onClick = (event) => {
    if (event.target === dialog) {
      requestClose();
    }
  };

  /* =========================
     Cleanup
  ========================== */

  const cleanup = () => {
    document.body.classList.remove("modal-open");

    dialog.classList.remove("form-dialog-host");

    form.removeEventListener("input", markDirty);

    dialog.removeEventListener("cancel", onCancel);

    dialog.removeEventListener("click", onClick);

    dialog.removeEventListener("close", cleanup);

    trigger?.focus?.();
  };

  dialog.addEventListener("cancel", onCancel);

  dialog.addEventListener("click", onClick);

  dialog.addEventListener("close", cleanup);

  /* =========================
     Initial Focus
  ========================== */

  queueMicrotask(() =>
    form
      .querySelector(
        `
            input:not([type="hidden"]),
            select,
            textarea
          `,
      )
      ?.focus(),
  );

  /* =========================
     Public Dialog Controller
  ========================== */

  return {
    close(force = false) {
      if (force) {
        dirty = false;
      }

      return requestClose();
    },

    resetDirty() {
      dirty = false;
    },

    isDirty() {
      return dirty;
    },
  };
}
