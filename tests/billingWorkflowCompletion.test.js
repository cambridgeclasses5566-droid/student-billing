import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Settings from '../server/models/InstituteSettings.js';
import FeeRequest from '../server/models/StudentFeeRequest.js';
import Payment from '../server/models/StudentPayment.js';

const read = path => readFileSync(path, 'utf8');

test('payment settings route is centralized and renders without dashboard fallback', () => {
  const dashboard=read('client/assets/js/dashboard.js'),navigation=read('client/assets/js/workflow-dashboard.js');
  assert.match(dashboard,/page==='payment-settings'/);
  assert.match(dashboard,/renderPaymentSettings/);
  assert.match(navigation,/payment-settings/);
  assert.doesNotMatch(navigation,/payment-account/);
});

test('UPI QR upload is owner scoped, file based, and limited to supported 2 MB images', () => {
  const route=read('server/routes/paymentSettingsRoutes.js'),storage=read('server/services/paymentQrStorageService.js');
  assert.match(route,/req\.user\.id/);
  assert.doesNotMatch(route,/req\.body\.ownerId/);
  assert.match(route,/2 \* 1024 \* 1024/);
  assert.match(storage,/image\/png/);
  assert.match(storage,/image\/jpeg/);
  assert.match(storage,/image\/webp/);
  assert.match(storage,/uploads\/payment-qr/);
});

test('payment settings persist QR URL and payment workflow controls', () => {
  for(const path of ['upiQrImageUrl','upiQrType','paymentAccountName','upiId','accountHolderName','paymentMobile','paymentInstructions','enableStudentUpiPayments','requireUtrAfterPayment']) assert.ok(Settings.schema.path(path),path);
});

test('uploaded static QR and exact amount QR remain manual request flows', () => {
  const routes=read('server/routes/feeRequestRoutes.js');
  assert.match(routes,/qrType:'uploaded'/);
  assert.match(routes,/manual UTR verification/);
  assert.match(routes,/buildUpiPaymentUri/);
  assert.match(routes,/status:'verification_required'/);
});

test('verified request can create only one payment and receipt', () => {
  assert.ok(FeeRequest.schema.indexes().some(([keys,options])=>keys.studentPaymentId===1&&options.unique&&options.sparse));
  assert.ok(Payment.schema.indexes().some(([keys,options])=>keys.ownerId===1&&keys.feeRequestId===1&&options.unique));
  const routes=read('server/routes/feeRequestRoutes.js');
  assert.match(routes,/if\(existing\.status==='verified'\)/);
  assert.match(routes,/confirmedReceived/);
});

test('manual payment and payment request UI are explicitly separate', () => {
  assert.match(read('client/assets/js/paymentForm.js'),/money has already been received/i);
  assert.match(read('client/assets/js/paymentRequests.js'),/balance changes only after UTR approval/i);
  assert.match(read('client/assets/js/billingPages.js'),/Razorpay is used only for the separate ClassesPro yearly subscription/);
});

test('dashboard sections render through one guarded enhancement function', () => {
  const enhancements=read('client/assets/js/dashboardEnhancements.js');
  assert.match(enhancements,/dashboard-enhancements/);
  assert.match(enhancements,/data-section|dataset\.section/);
  for(const legacy of ['attendanceIntegration.js','upi-dashboard-sections.js']){
    const source=read(`client/assets/js/${legacy}`);
    assert.doesNotMatch(source,/new MutationObserver/);
    assert.doesNotMatch(source,/addEventListener\(['"]hashchange/);
  }
});

test('billing pages include searchable collection and filtered payment history', () => {
  const pages=read('client/assets/js/billingPages.js');
  assert.match(pages,/Search by student name, ID, or mobile/);
  assert.match(pages,/300/);
  assert.match(pages,/Verified UPI Request/);
  assert.match(pages,/historySource/);
});
