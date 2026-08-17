import './appSelect.js';

const key = 'classespro-theme';
const allowed = new Set(['light', 'dark', 'system']);
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const media = isBrowser && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : { matches: false, addEventListener() {} };

if (isBrowser && !document.querySelector('link[data-classespro-theme]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/assets/css/theme.css';
  link.dataset.classesproTheme = 'true';
  document.head.append(link);
}

// Feature styles are loaded lazily as dashboard routes are opened. Keep the
// theme layer last so shared dark-mode contracts consistently win over legacy
// light-only declarations without coupling theme logic to individual pages.
if (isBrowser) {
  const keepThemeLayerLast = () => {
    const themeLink = document.querySelector('link[data-classespro-theme]');
    const lastStyleLink = [...document.head.querySelectorAll('link[rel="stylesheet"]')].at(-1);
    if (themeLink && lastStyleLink && themeLink !== lastStyleLink) document.head.append(themeLink);
  };
  new MutationObserver(keepThemeLayerLast).observe(document.head, { childList: true });
  queueMicrotask(keepThemeLayerLast);
}

export const getThemePreference = () => {
  if (!isBrowser) return 'system';
  const saved = localStorage.getItem(key);
  return allowed.has(saved) ? saved : 'system';
};

export function applyTheme(preference = getThemePreference()) {
  const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
  if (isBrowser) {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
  }
  return resolved;
}

export function setTheme(preference) {
  if (!isBrowser || !allowed.has(preference)) return;
  localStorage.setItem(key, preference);
  applyTheme(preference);
  document.dispatchEvent(new CustomEvent('classespro:themechange', { detail: { preference } }));
}

export function installThemeSwitcher() {
  if (!isBrowser) return;
  applyTheme();
  const target = document.querySelector('.top-right');
  if (!target || target.querySelector('#themeToggle')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'themeToggle';
  button.className = 'theme-toggle';
  button.innerHTML = '<svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg><svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.5A8.5 8.5 0 0 1 8.5 3.6 8.5 8.5 0 1 0 20.4 15.5Z"/></svg>';
  const updateButton = () => {
    const current = document.documentElement.dataset.theme || applyTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    button.dataset.theme = current;
    button.setAttribute('aria-label', `Switch to ${next} theme`);
    button.title = `Switch to ${next} theme`;
  };
  button.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || applyTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
  document.addEventListener('classespro:themechange', updateButton);
  target.prepend(button);
  updateButton();
}

media.addEventListener?.('change', () => {
  if (getThemePreference() === 'system') {
    applyTheme('system');
    document.dispatchEvent(new CustomEvent('classespro:themechange', { detail: { preference: 'system' } }));
  }
});

if (isBrowser) applyTheme();
