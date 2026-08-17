import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import InstituteSettings from '../server/models/InstituteSettings.js';
import StudentPayment from '../server/models/StudentPayment.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('settings schema and allowlist expose only the new receipt title and terms fields',()=>{assert.equal(InstituteSettings.schema.path('receiptTitle').defaultValue,'Fee Receipt');assert.equal(InstituteSettings.schema.path('receiptTerms').defaultValue,'');const route=read('server/routes/settingsRoutes.js');assert.match(route,/receiptTitle/);assert.match(route,/receiptTerms/);assert.doesNotMatch(route,/amountInWords|rupeesInWords/i)});

test('new payments persist immutable receipt financial snapshots',()=>{for(const field of ['receiptTotalPayablePaise','receiptPreviousPaidPaise','receiptBalanceAfterPaise'])assert.ok(StudentPayment.schema.path(field),field);const route=read('server/routes/billingRoutes.js');assert.match(route,/receiptTotalPayablePaise:before\.finalPayablePaise/);assert.match(route,/receiptPreviousPaidPaise:before\.totalPaidPaise/);assert.match(route,/receiptBalanceAfterPaise:Math\.max\(0,before\.remainingPaise-amountPaise\)/)});

test('one shared receipt renderer serves live preview, viewed receipts and PDF hierarchy',()=>{const [settings,dashboard,profile,receipt,css]=['client/assets/js/receiptSettings.js','client/assets/js/dashboard.js','client/assets/js/studentProfile.js','client/assets/js/receipt.js','client/assets/css/receipt.css'].map(read);assert.match(settings,/renderReceiptHTML\(model\(\)\)/);assert.match(dashboard,/renderReceiptHTML\(model\)/);assert.match(profile,/renderReceiptHTML\(model\)/);assert.match(receipt,/receiptSummaryRows\(model\)/);assert.match(receipt,/receiptPaymentDetailRows\(model\)/);assert.match(receipt,/receipt-finance-grid/);assert.match(css,/\.receipt-finance-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/s);assert.match(css,/@media print/);assert.match(css,/body \*\s*\{\s*visibility:\s*hidden !important/);assert.doesNotMatch(`${settings}${receipt}`,/Amount in Words|Rupees in Words/i)});

test('Institute Settings is organized into the three requested receipt sections',()=>{const source=read('client/assets/js/receiptSettings.js');for(const label of ['Institute identity','Receipt configuration','Receipt content','Receipt title','Terms & Conditions'])assert.match(source,new RegExp(label));for(const name of ['instituteName','mobile','email','address','receiptTitle','receiptPrefix','currency','academicYear','authorizedSignatory','timeZone','dateFormat','receiptThankYouHeading','receiptThankYouMessage','receiptTerms','receiptFooter'])assert.match(source,new RegExp(name))});
