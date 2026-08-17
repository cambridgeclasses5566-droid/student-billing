const safeHash = (value) => (typeof value === "string" && /^#[a-z0-9-]+(?:\?[a-zA-Z0-9_=&%.-]*)?$/.test(value) ? value : null);

export function rememberOrigin(route = location.hash) {
  const safe = safeHash(route);
  if (safe) sessionStorage.setItem("classespro-origin-route", safe);
}

export function navigateBack({ fallback = "#dashboard", origin } = {}) {
  const target = safeHash(origin) || safeHash(sessionStorage.getItem("classespro-origin-route"));
  sessionStorage.removeItem("classespro-origin-route");
  if (target && target !== location.hash) {
    location.hash = target;
    return;
  }
  if (history.length > 1) {
    history.back();
    return;
  }
  location.hash = safeHash(fallback) || "#dashboard";
}

export function renderBackButton({ fallbackRoute = "#dashboard", label = "Back", origin = "" } = {}) {
  const fallback = safeHash(fallbackRoute) || "#dashboard";
  const preferred = safeHash(origin) || "";
  const displayLabel = String(label || "Back").replace(/^Back to\s+/i, "") || "Back";
  return `<button type="button" class="btn btn-back page-back-button" data-smart-back data-fallback="${fallback}" data-origin="${preferred}"><span aria-hidden="true">&lsaquo;</span><span>${displayLabel}</span></button>`;
}

export function bindBackButtons(root = document) {
  root.querySelectorAll("[data-smart-back]").forEach((button) => button.addEventListener("click", () => navigateBack({ fallback: button.dataset.fallback, origin: button.dataset.origin })));
}

export function classProfileRoute(classId, tab = "students") {
  return `#class-profile?id=${encodeURIComponent(classId)}&tab=${encodeURIComponent(tab)}`;
}

export function navigateDashboard(page, params = {}) {
  if (!/^[a-z0-9-]+$/.test(String(page))) throw new Error("Invalid dashboard route.");
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") query.set(key, String(value));
  });
  location.hash = `${page}${query.size ? `?${query}` : ""}`;
}

export function studentProfileRoute(studentId, origin = "students", tab = "") {
  const query = new URLSearchParams({ id: studentId, origin });
  if (tab) query.set("tab", tab);
  return `#student-profile?${query}`;
}
