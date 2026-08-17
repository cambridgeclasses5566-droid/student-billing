import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');

test('branding text cannot corrupt dashboard component and route identifiers', () => {
  const dashboard = read('client/assets/js/dashboard.js');
  const classProfile = read('client/assets/js/classProfile.js');
  const navigation = read('client/assets/js/navigation.js');
  const combined = `${dashboard}\n${classProfile}\n${navigation}`;

  assert.match(dashboard, /from "\.\/classProfile\.js"/);
  assert.match(classProfile, /export async function renderClassProfile/);
  assert.match(classProfile, /export function destroyClassProfile/);
  assert.match(navigation, /export function classProfileRoute/);
  assert.doesNotMatch(combined, /CambridgeclassesfileRoute|renderCambridgeclassesfile|destroyCambridgeclassesfile/);
});

test('sidebar initializes independently and contains only active private-client routes', () => {
  const html = read('client/dashboard/index.html');
  const workflow = read('client/assets/js/workflow-dashboard.js');
  const labels = ['Dashboard', 'Students', 'Add Student', 'Classes', 'Collect Payment', 'Payment History', 'Pending Fees', 'Financial Reports'];

  assert.ok(html.indexOf('workflow-dashboard.js') < html.indexOf('dashboard.js'));
  labels.forEach(label => assert.match(workflow, new RegExp(`['\"]${label}['\"]`)));
  ['Attendance', 'Payment Requests', 'Payment Settings', 'Subscription', 'Institute Settings', 'Logout', 'ACCOUNT'].forEach(label => assert.doesNotMatch(workflow, new RegExp(`['\"]${label}['\"]`)));
  assert.doesNotMatch(workflow, /const icons=|aria-hidden|<span/);
  assert.match(workflow, /Dashboard module initialization failed/);
  assert.match(workflow, /Navigation remains available/);
});

test('dashboard metrics are text-only and retain a balanced two-column mobile grid', () => {
  const dashboard = read('client/assets/js/dashboard.js');
  const mobileCss = read('client/assets/css/mobile-app.css');

  assert.match(dashboard, /metricRows\.map\(\(\[label, value\]\)/);
  assert.doesNotMatch(dashboard, /metricRows\.map\(\(\[label, value, icon\]/);
  assert.doesNotMatch(dashboard, /class="mobile-metric-card[^\"]*"[^>]*><span/);
  assert.match(mobileCss, /\.mobile-metric-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(mobileCss, /\.mobile-metric-card strong\s*\{[^}]*white-space:\s*nowrap/s);
});

test('authenticated layout has one responsive non-fixed Creatify footer credit', () => {
  const html = read('client/dashboard/index.html');
  const workflowCss = read('client/assets/css/workflow.css');

  assert.match(html, /<footer class="app-footer">/);
  assert.match(html, /href="https:\/\/creatifyagencies\.com\/" target="_blank" rel="noopener noreferrer">@creatifyagencies<\/a>/);
  assert.equal((html.match(/@creatifyagencies/g) || []).length, 1);
  assert.match(workflowCss, /\.main\{[^}]*min-height:100vh[^}]*display:flex[^}]*flex-direction:column/);
  assert.match(workflowCss, /\.workspace\{[^}]*flex:1 0 auto/);
  assert.match(workflowCss, /\.app-footer\{[^}]*text-align:center/);
  assert.doesNotMatch(workflowCss, /\.app-footer\{[^}]*position:\s*fixed/s);
  assert.match(workflowCss, /\.app-footer a:active/);
  assert.match(workflowCss, /\.app-footer a:focus-visible/);
});

test('shared account control is icon-only and preserves the existing menu', () => {
  const html = read('client/dashboard/index.html');
  const account = read('client/assets/js/headerAccountMenu.js');
  const css = read('client/assets/css/dashboardHeader.css');

  assert.match(html, /aria-label="Account menu"/);
  assert.match(html, /class="account-icon"/);
  assert.doesNotMatch(html, />\s*(?:AM|CP)\s*<\/button>/);
  assert.match(account, /trigger\.innerHTML = accountIconSVG/);
  assert.match(account, /Institute Settings|accountLogout/);
  assert.match(css, /\.account-trigger[\s\S]*width:\s*42px[\s\S]*height:\s*42px/);
  assert.match(css, /\.account-trigger:active/);
  assert.match(css, /\.account-trigger:focus-visible/);
});

test('unknown routes, route failures, and optional branding data have safe fallbacks', () => {
  const dashboard = read('client/assets/js/dashboard.js');
  assert.match(dashboard, /dashboardPages\.has\(requestedPage\) \? requestedPage : "dashboard"/);
  assert.match(dashboard, /Dashboard route failed:/);
  assert.match(dashboard, /Back to Dashboard/);
  assert.match(dashboard, /await installInstituteBranding\(me\)/);
  assert.match(dashboard, /settings\.instituteName \|\| fallbackName/);
  assert.match(dashboard, /Institute branding could not be loaded; using the account fallback/);
});
