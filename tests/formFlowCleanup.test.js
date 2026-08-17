import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildClassStudentsCsv } from '../server/services/csvExportService.js';

const read = path => readFileSync(path, 'utf8');

test('sidebar uses text-only links and spacing without redundant category headings', () => {
  const navigation = read('client/assets/js/workflow-dashboard.js');
  const css = read('client/assets/css/workflow.css');
  for (const label of ['Dashboard', 'Students', 'Add Student', 'Classes', 'Collect Payment', 'Payment History', 'Pending Fees', 'Financial Reports']) {
    assert.match(navigation, new RegExp(`['"]${label}['"]`));
  }
  assert.doesNotMatch(navigation, /['"](?:DASHBOARD|STUDENTS|BILLING|REPORTS)['"]|nav-group|<p class=["']nav-group/);
  assert.doesNotMatch(navigation, /<span|aria-hidden|const icons/);
  assert.match(navigation, /side-link--group-start/);
  assert.match(css, /\.side-link\{[^}]*min-height:44px/);
  assert.match(css, /\.side-link--group-start:not\(:first-child\)\{margin-top:10px\}/);
  assert.match(css, /\.side \.product-logo-link\{width:170px;margin:0 auto\}/);
});

test('class form keeps supported fields while removing suggestions and class billing', () => {
  const dashboard = read('client/assets/js/dashboard.js');
  const classForm = dashboard.slice(dashboard.indexOf('function classModal'), dashboard.indexOf('async function settings'));
  for (const field of ['name', 'standard', 'division', 'academicYear', 'batchName', 'startTime', 'endTime', 'classTeacherName', 'notes', 'isActive']) {
    assert.match(classForm, new RegExp(`name=["']${field}["']`));
  }
  for (const section of ['Class Details', 'Schedule', 'Notes &amp; Status', 'CLASS PREVIEW']) assert.match(classForm, new RegExp(section));
  assert.doesNotMatch(classForm, /Suggested name|Use suggestion|classNameSuggestion|useSuggestedName|defaultFees|Default Fees|<h3>Billing<\/h3>|classCapacity|name=["']capacity["']/);
  assert.match(classForm, /<input id="classStandard" name="standard"/);
  assert.doesNotMatch(classForm, /<select id="classStandard"/);
});

test('academic years roll around the selected period and Batch Type is editable', () => {
  const dashboard = read('client/assets/js/dashboard.js');
  const select = read('client/assets/js/appSelect.js');
  assert.match(dashboard, /Array\.from\(\{ length: 7 \}/);
  assert.match(dashboard, /academicStartYear - 3 \+ index/);
  assert.match(dashboard, /"Regular Batch", "Morning Batch", "Evening Batch", "Weekend Batch"/);
  assert.match(dashboard, /<input id="batchType" name="batchName"/);
  assert.match(dashboard, /installAppCombobox\(field\("#batchType"\)/);
  assert.match(select, /export function installAppCombobox/);
  assert.match(select, /input\.value = option\.textContent/);
});

test('custom standards and academic years remain intact in class CSV output', () => {
  const summaries = new Map([['student-1', { finalPayableFees: 12000, totalPaid: 2000, remainingAmount: 10000, status: 'Partially Paid' }]]);
  const csv = buildClassStudentsCsv({
    cls: { name: 'Test Custom Batch' },
    students: [{ _id: 'student-1', studentId: 'STU-FYJC', name: 'Test Student', mobile: '', standard: 'FYJC', division: 'B', academicYear: '2027-2028' }],
    summaries
  });
  assert.match(csv, /"FYJC","B","2027-2028"/);
});

test('class submission is intercepted before preview initialization and uses the API flow', () => {
  const dashboard = read('client/assets/js/dashboard.js');
  const earlyGuard = dashboard.indexOf('form.addEventListener("submit", (event) => event.preventDefault())');
  const previewSetup = dashboard.indexOf('const updatePreview = () =>');
  assert.ok(earlyGuard > -1 && earlyGuard < previewSetup);
  assert.match(dashboard, /form\.onsubmit = async \(event\) => \{\s*event\.preventDefault\(\)/);
  assert.match(dashboard, /await post\("\/classes", data\)/);
  assert.match(dashboard, /controller\.close\(true\);\s*classPage\(\)/);
  assert.doesNotMatch(dashboard, /action=["'][^"']*\?/);
});

test('class preview uses real characters rather than escaped HTML entities in textContent', () => {
  const dashboard = read('client/assets/js/dashboard.js');
  assert.match(dashboard, /`Standard \$\{standard \|\| "—"\} · Division \$\{division \|\| "—"\}`/);
  assert.doesNotMatch(dashboard, /escapeHTML\(c\.standard \|\| "&mdash;"\)/);
  assert.doesNotMatch(dashboard, /transactionReference \|\| "&mdash;"/);
});

test('mobile forms use normal-flow student actions and scrollable modal sheets', () => {
  const css = read('client/assets/css/mobile-app.css');
  assert.match(css, /#studentForm > \.form-actions\s*\{[^}]*position:\s*static[^}]*bottom:\s*auto/s);
  assert.match(css, /\.dialog-field textarea\s*\{[\s\S]*font-size:\s*16px/s);
  assert.match(css, /\.app-modal-backdrop\s*\{[^}]*padding:\s*max\(12px, env\(safe-area-inset-top\)\)/s);
  assert.match(css, /\.app-modal-body,[\s\S]*\.dialog-body,[\s\S]*\.modal-content\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.class-dialog \.dialog-form-section[\s\S]*border-radius:\s*16px/s);
});

test('Creatify link supports desktop hover, mobile press, and keyboard focus', () => {
  const css = read('client/assets/css/workflow.css');
  const interaction = read('client/assets/js/footerCredit.js');
  assert.match(css, /@media \(hover:hover\) and \(pointer:fine\)/);
  assert.match(css, /\.app-footer a:active\{[^}]*color:var\(--red\)[^}]*transform:scale\(\.96\)/);
  assert.match(css, /\.app-footer a:focus-visible/);
  assert.match(css, /-webkit-tap-highlight-color/);
  assert.match(css, /\.app-footer a\.is-pressed\{[^}]*text-decoration:underline[^}]*transform:scale\(\.98\)/);
  assert.match(interaction, /pointerdown/);
  assert.match(interaction, /classList\.add\('is-pressed'\)/);
  assert.match(interaction, /setTimeout\(\(\) => footerCredit\.classList\.remove\('is-pressed'\), 220\)/);
});
