import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAndNormalizeStudent } from '../server/services/studentValidationService.js';

const read = path => readFileSync(path, 'utf8');
const completeStudent = aadhaarNumber => ({name:'Chetan',age:12,dob:'2014-01-12',email:'chetan12@gmail.com',address:'Test address',aadhaarNumber,mobile:'',academicYear:'2026-2027',standard:'8',classId:'507f1f77bcf86cd799439011',division:'A',fatherName:'Test Father',motherName:'Test Mother',parentsMobileNumber:'9876543210',admissionDate:'2026-06-01',totalFees:'25000',discount:'2000',notes:'Full profile test'});

test('Aadhaar remains a 12-character string including a leading zero',()=>{for(const aadhaar of ['212452658623','012345678901']){const {value,errors}=validateAndNormalizeStudent(completeStudent(aadhaar));assert.deepEqual(errors,[]);assert.equal(value.aadhaarNumber,aadhaar);assert.equal(typeof value.aadhaarNumber,'string')}});
test('student form emits digit-friendly text inputs with escape-safe HTML patterns',()=>{const source=read('client/assets/js/studentForm.js');assert.match(source,/type="text" name="aadhaarNumber" inputmode="numeric" pattern="\[0-9\]\{12\}"/);assert.match(source,/name="parentsMobileNumber" inputmode="numeric" pattern="\[6-9\]\[0-9\]\{9\}"/);assert.match(source,/maxlength="12"/)});
test('profile exposes every form field and excludes request actions and tabs',()=>{const source=read('client/assets/js/studentProfile.js');for(const label of ['Student Name','Age','D.O.B','Email','Address','Aadhaar Number','Student Mobile','Academic Year','Standard','Class / Batch','Division','Father Name','Mother Name','Parents Mobile','Admission Date','Total Fees','Discount','Discounted Fees','Notes'])assert.match(source,new RegExp(label));assert.doesNotMatch(source,/Send Payment Request|UPI Requests|paymentRequests|openUpiRequestModal/)});
test('active navigation and router contain no payment request destinations',()=>{const nav=read('client/assets/js/workflow-dashboard.js'),dashboard=read('client/assets/js/dashboard.js'),app=read('server/app.js');assert.doesNotMatch(nav,/Payment Requests|payment-requests/);assert.doesNotMatch(dashboard,/renderPaymentRequestsPage|upi-verification/);assert.doesNotMatch(app,/feeRequestRoutes|\/api\/fee-requests/)});
