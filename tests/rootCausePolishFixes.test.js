import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildClassStudentsCsv, excelPhoneFormula, normalizeWhatsAppNumber } from '../server/services/csvExportService.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('AppSelect replaces eligible native popups with one viewport-positioned listbox', async () => {
  const [source, css, theme] = await Promise.all([
    read('client/assets/js/appSelect.js'), read('client/assets/css/app-select.css'), read('client/assets/js/themeManager.js')
  ]);
  assert.match(theme, /import '\.\/appSelect\.js'/);
  assert.match(source, /role', 'combobox'/);
  assert.match(source, /role', 'listbox'/);
  assert.match(source, /viewportWidth - margin \* 2/);
  assert.match(source, /openAbove/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /document\.addEventListener\('pointerdown'/);
  assert.match(source, /new MutationObserver/);
  assert.match(css, /\.app-select-panel\{position:fixed;z-index:1100/);
  assert.match(css, /max-width:100%/);
  assert.match(css, /\[data-theme="dark"\] \.app-select-trigger/);
});

test('class CSV phone cells preserve digits and generate only safe WhatsApp formulas', () => {
  assert.deepEqual(normalizeWhatsAppNumber('9876543210'), { display: '9876543210', whatsapp: '919876543210' });
  assert.deepEqual(normalizeWhatsAppNumber('+91 98765 43210'), { display: '919876543210', whatsapp: '919876543210' });
  assert.equal(excelPhoneFormula('0987654321'), '="0987654321"');
  assert.equal(excelPhoneFormula('9876543210'), '=HYPERLINK("https://wa.me/919876543210","9876543210")');
  const summaries = new Map([['1',{finalPayableFees:1000,totalPaid:500,remainingAmount:500,status:'Partially Paid'}]]);
  const csv = buildClassStudentsCsv({cls:{name:'KrishnaBRO'},students:[{_id:'1',studentId:'STU-1',name:'om',mobile:'0987654321',standard:'10',division:'A',academicYear:'2026-2027'}],summaries});
  assert.match(csv, /=""0987654321""/);
  assert.doesNotMatch(csv, /9\.876|E\+/i);
});

test('active enrollment is the shared class membership authority', async () => {
  const [service, billingRoutes, classRoutes] = await Promise.all([
    read('server/services/classMembershipService.js'), read('server/routes/billingRoutes.js'), read('server/routes/classSubjectRoutes.js')
  ]);
  assert.match(service, /status: 'active'/);
  assert.match(service, /students: current\.map/);
  assert.match(billingRoutes, /getActiveClassMembership/);
  assert.match(billingRoutes, /buildClassStudentsCsv/);
  assert.doesNotMatch(billingRoutes.match(/router\.get\('\/classes\/:id\/students\.csv'[\s\S]*?\}\}\);/)?.[0] || '', /Student\.find/);
  assert.ok((classRoutes.match(/getActiveClassMembership/g) || []).length >= 4);
});

test('receipt reserves a shared blank signature block in HTML and PDF', async () => {
  const [receipt, css] = await Promise.all([read('client/assets/js/receipt.js'), read('client/assets/css/receipt.css')]);
  assert.match(receipt, /receipt-signature-space/);
  assert.match(css, /\.receipt-signature-space \{ min-height: 60px; \}/);
  assert.match(receipt, /const signatureLineY=y\+17/);
  assert.match(receipt, /ensureSpace\(46\)/);
});
