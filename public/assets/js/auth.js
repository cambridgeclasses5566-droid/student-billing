import "./themeManager.js";

import { post } from "./api.js";
import { $, $$, busy, showMessage } from "./ui.js";

/* =========================
   Page Setup
========================== */

const page = document.body.dataset.page;
const msg = $("#message");

/* =========================
   Helpers
========================== */

function values(form) {
  return Object.fromEntries(new FormData(form));
}

async function submit(form, path, button) {
  try {
    busy(button, true);

    const data = await post(path, values(form));

    if (data?.email) {
      sessionStorage.setItem("verificationEmail", data.email);
    }

    location.href =
      data?.redirect ||
      {
        signup: "/verify-otp.html",
        login: "/dashboard/index.html",
        forgot: "/login",
        reset: "/login",
      }[page] ||
      "/";
  } catch (error) {
    showMessage(msg, error.message);
  } finally {
    busy(button, false);
  }
}

/* =========================
   Auth Form
========================== */

const form = $("form[data-auth]");

if (form && page !== "otp") {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const button = form.querySelector("[type=submit]");

    if (["signup", "reset"].includes(page) && form.password.value !== form.confirmPassword.value) {
      return showMessage(msg, "Passwords do not match");
    }

    submit(
      form,
      {
        signup: "/auth/signup",
        login: "/auth/login",
        forgot: "/auth/forgot-password",
        reset: "/auth/reset-password",
      }[page],
      button,
    );
  });
}

/* =========================
   Password Toggle
========================== */

$$("[data-toggle-password]").forEach((toggle) => {
  toggle.onclick = () => {
    const field = document.getElementById(toggle.getAttribute("aria-controls") || "password");

    if (!field) {
      return;
    }

    const reveal = field.type === "password";

    field.type = reveal ? "text" : "password";

    toggle.textContent = reveal ? "Hide" : "Show";

    toggle.setAttribute("aria-label", `${reveal ? "Hide" : "Show"} ${field.id === "confirmPassword" ? "confirmed password" : "password"}`);
  };
});

/* =========================
   Password Strength
========================== */

const password = $("#password");

const strength = $("#strength");

if (password && strength) {
  password.oninput = () => {
    const score = [/.{8}/, /[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z\d]/].filter((rule) => rule.test(password.value)).length;

    strength.style.width = `${score * 20}%`;

    strength.dataset.level = score < 3 ? "weak" : score < 5 ? "medium" : "strong";
  };
}

/* =========================
   OTP Verification
========================== */

if (page === "otp") {
  const email = sessionStorage.getItem("verificationEmail") || new URLSearchParams(location.search).get("email") || "";

  $("#maskedEmail").textContent = email.replace(/^(.{2}).*(@.*)$/, "$1••••$2");

  const inputs = $$(".otp-input");

  /* =========================
     OTP Input Handling
  ========================== */

  inputs.forEach((input, index) => {
    input.oninput = () => {
      input.value = input.value.replace(/\D/g, "").slice(-1);

      if (input.value && inputs[index + 1]) {
        inputs[index + 1].focus();
      }
    };

    input.onkeydown = (event) => {
      if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
        inputs[index - 1].focus();
      }
    };

    input.onpaste = (event) => {
      event.preventDefault();

      const code = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

      code.split("").forEach((number, pasteIndex) => {
        if (inputs[pasteIndex]) {
          inputs[pasteIndex].value = number;
        }
      });

      if (code.length) {
        inputs[Math.min(code.length, inputs.length - 1)].focus();
      }
    };
  });

  /* =========================
     Verify OTP
  ========================== */

  form.onsubmit = async (event) => {
    event.preventDefault();

    const button = form.querySelector("button");

    try {
      busy(button, true);

      const data = await post("/auth/verify-otp", {
        email,

        code: inputs.map((input) => input.value).join(""),
      });

      location.href = data.redirect;
    } catch (error) {
      showMessage(msg, error.message);
    } finally {
      busy(button, false);
    }
  };

  /* =========================
     Resend OTP Timer
  ========================== */

  let seconds = 60;

  const timer = $("#timer");

  const resend = $("#resend");

  const tick = setInterval(() => {
    seconds--;

    timer.textContent = `00:${String(seconds).padStart(2, "0")}`;

    if (seconds <= 0) {
      clearInterval(tick);

      resend.disabled = false;
    }
  }, 1000);

  /* =========================
     Resend OTP
  ========================== */

  resend.onclick = async () => {
    resend.disabled = true;

    await post("/auth/resend-otp", {
      email,
    });

    seconds = 60;
  };
}
