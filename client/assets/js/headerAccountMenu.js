import { post } from "./api.js";

export const accountIconSVG =
  '<svg class="account-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 20a7.5 7.5 0 0 1 15 0"></path></svg>';

export function installHeaderAccountMenu(user) {
  const trigger = document.querySelector("#avatar");
  const menu = document.querySelector("#accountDropdown");
  const settings = menu?.querySelector("[data-account-settings]");
  const logout = document.querySelector("#accountLogout");
  if (!trigger || !menu || !settings || !logout) return;

  trigger.innerHTML = accountIconSVG;
  trigger.setAttribute("aria-label", "Account menu");
  trigger.title = user?.fullName ? `Account menu for ${user.fullName}` : "Account menu";
  const close = ({ restoreFocus = false } = {}) => {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  };
  const open = () => {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    settings.focus();
  };

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.hidden ? open() : close({ restoreFocus: true });
  });
  menu.addEventListener("click", (event) => event.stopPropagation());
  settings.addEventListener("click", () => close());
  logout.addEventListener("click", async () => {
    close();
    await post("/auth/logout", {});
    location.href = "/login";
  });
  document.addEventListener("click", () => close());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      event.preventDefault();
      close({ restoreFocus: true });
    }
  });
}
