import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile navigation exposes accessible open and close controls', async () => {
  const html = await read('client/dashboard/index.html');
  const navigation = await read('client/assets/js/mobileNavigation.js');
  assert.match(html, /id="menu"[^>]*aria-controls="sidebar"[^>]*aria-expanded="false"/);
  assert.match(html, /id="mobileNavClose"[^>]*aria-label="Close navigation"/);
  assert.match(navigation, /event\.target\.closest\('a\.side-link'\)/);
  assert.match(navigation, /event\.key === 'Escape'/);
  assert.match(navigation, /restoreFocus/);
  assert.match(navigation, /mobile-nav-open/);
});

test('drawer stacking keeps the backdrop below the interactive sidebar', async () => {
  const css = await read('client/assets/css/responsive-dashboard.css');
  assert.match(css, /\.side\s*\{[^}]*z-index: 80 !important[^}]*pointer-events: auto/s);
  assert.match(css, /\.drawer-overlay\.show\s*\{[^}]*z-index: 70 !important[^}]*pointer-events: auto/s);
  assert.match(css, /width: min\(84vw, 320px\)/);
});

test('responsive rules address all requested breakpoints without hiding body overflow', async () => {
  const css = await read('client/assets/css/responsive-dashboard.css');
  for (const breakpoint of ['1200', '1023', '767', '430']) assert.match(css, new RegExp(`max-width: ${breakpoint}px`));
  assert.doesNotMatch(css, /body\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(css, /\.workspace\s*\{[^}]*overflow-x: visible/s);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(css, /\.workspace\s*\{[^}]*max-width: 100%/s);
  assert.match(css, /min-width: 1281px\) and \(max-width: 1530px/);
});

test('major mobile data tables become labeled cards inside the workspace', async () => {
  const css = await read('client/assets/css/responsive-dashboard.css');
  for (const selector of ['#directoryRows', '#historyRows', '#reportRows', '.class-profile-content tbody']) assert.match(css, new RegExp(selector.replace(/[.#]/g, '\\$&')));
  assert.match(css, /content: 'Student ID'/);
  assert.match(css, /content: 'Receipt'/);
  assert.match(css, /content: 'Remaining'/);
  assert.match(css, /overflow-x: auto/);
});
