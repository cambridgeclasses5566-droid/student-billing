import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('dashboard header contains only the requested controls', async () => {
  const html = await read('client/dashboard/index.html');
  assert.doesNotMatch(html, /top-search|topInstitute|Notifications|aria-label="Notifications"/);
  assert.match(html, /id="avatar"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/);
  assert.match(html, /id="accountDropdown"[^>]*role="menu"[^>]*hidden/);
  assert.match(html, /href="#settings"[^>]*role="menuitem"/);
  assert.match(html, /<button[^>]*role="menuitem"[^>]*id="accountLogout"/);
});

test('theme switcher is a persisted light-dark icon toggle', async () => {
  const source = await read('client/assets/js/themeManager.js');
  assert.match(source, /id = 'themeToggle'/);
  assert.match(source, /className = 'theme-toggle'/);
  assert.match(source, /setTheme\(current === 'dark' \? 'light' : 'dark'\)/);
  assert.match(source, /localStorage\.setItem\(key, preference\)/);
  assert.match(source, /Switch to \$\{next\} theme/);
  assert.doesNotMatch(source, /themeSelect|Appearance|<select/);
});

test('account menu installs the profile icon and accessible dismissal behavior', async () => {
  const source = await read('client/assets/js/headerAccountMenu.js');
  const dashboard = await read('client/assets/js/dashboard.js');
  assert.match(source, /trigger\.innerHTML = accountIconSVG/);
  assert.match(source, /trigger\.setAttribute\('aria-label', 'Account menu'\)/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /document\.addEventListener\('click', \(\) => close\(\)\)/);
  assert.match(source, /post\('\/auth\/logout', \{\}\)/);
  assert.match(dashboard, /installHeaderAccountMenu\(me\)/);
  assert.doesNotMatch(dashboard, /topInstitute/);
});

test('header styles right-align the responsive dropdown without horizontal overflow', async () => {
  const css = await read('client/assets/css/dashboardHeader.css');
  assert.match(css, /\.top-right\s*\{[^}]*margin-left: auto/s);
  assert.match(css, /\.account-dropdown\s*\{[^}]*position: absolute[^}]*right: 0/s);
  assert.match(css, /@media \(max-width: 550px\)/);
  assert.match(css, /calc\(100vw - 28px\)/);
});
