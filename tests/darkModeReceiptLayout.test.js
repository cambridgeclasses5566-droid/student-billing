import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('dark theme exposes shared surface, field, border, text and status tokens', () => {
  const variables = read('client/assets/css/variables.css');
  for (const token of ['--bg-app','--bg-surface','--bg-elevated','--bg-muted','--field-bg','--text-main','--text-muted','--border','--border-strong','--status-paid-bg','--status-partial-bg','--status-unpaid-bg']) {
    assert.match(variables, new RegExp(token));
  }
  assert.match(variables, /\[data-theme="dark"\]/);
});

test('late-loaded feature styles cannot override the final theme layer', () => {
  const manager = read('client/assets/js/themeManager.js');
  assert.match(manager, /keepThemeLayerLast/);
  assert.match(manager, /MutationObserver/);
  assert.match(manager, /document\.head\.append\(themeLink\)/);
});

test('dark mode covers shared inputs, tables, cards, menus, buttons and status badges', () => {
  const css = read('client/assets/css/theme.css');
  for (const selector of ['input','table','\.card','\.account-dropdown','\.profile-menu-panel','\.btn-secondary','\.page-back-button','\.status-badge--paid','\.status-badge--partial','\.status-badge--unpaid']) {
    assert.match(css, new RegExp(`\\[data-theme="dark"\\][\\s\\S]*${selector}`));
  }
  assert.match(css, /input::placeholder/);
});

test('receipt is grouped, responsive and isolated as a permanent light paper document', () => {
  const [receipt, css] = ['client/assets/js/receipt.js','client/assets/css/receipt.css'].map(read);
  assert.match(receipt, /receipt-finance-grid/);
  assert.match(receipt, /receipt-summary-section/);
  assert.match(receipt, /receipt-payment-section/);
  assert.match(css, /--receipt-paper:\s*#ffffff/);
  assert.match(css, /color-scheme:\s*light/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.receipt-finance-grid\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /@media print[\s\S]*background:\s*#fff !important/);
  assert.doesNotMatch(`${receipt}${css}`, /Amount in Words|Rupees in Words/i);
});
