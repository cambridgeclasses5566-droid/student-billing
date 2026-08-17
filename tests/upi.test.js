import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUpiPaymentUri,instituteReferencePrefix,isValidUpiId} from '../server/services/upiService.js';
import {ManualUpiVerificationProvider} from '../server/services/paymentVerificationProvider.js';

test('UPI IDs accept common safe handles and reject malformed values',()=>{
  ['name@bank','9876543210@upi','merchant@okaxis'].forEach(value=>assert.equal(isValidUpiId(value),true));
  ['missing-at','bad handle@upi','name@','@bank','name@bank?amount=1'].forEach(value=>assert.equal(isValidUpiId(value),false));
});

test('backend builds one encoded exact-amount INR UPI URI',()=>{
  const uri=buildUpiPaymentUri({upiId:'brightpath@okaxis',payeeName:'BrightPath Coaching Institute',transactionReference:'BPCI20260001',note:'Rahul Sharma Second Installment',amount:5000});
  const parsed=new URL(uri);
  assert.equal(parsed.protocol,'upi:');assert.equal(parsed.hostname,'pay');
  assert.equal(parsed.searchParams.get('pa'),'brightpath@okaxis');
  assert.equal(parsed.searchParams.get('pn'),'BrightPath Coaching Institute');
  assert.equal(parsed.searchParams.get('tr'),'BPCI20260001');
  assert.equal(parsed.searchParams.get('am'),'5000.00');assert.equal(parsed.searchParams.get('cu'),'INR');
  assert.equal(uri.includes(' '),false);assert.equal(uri.includes('\n'),false);
});

test('unsafe amounts and references cannot enter a UPI URI',()=>{
  assert.throws(()=>buildUpiPaymentUri({upiId:'payer@upi',payeeName:'X',transactionReference:'BAD REF',note:'Fee',amount:10}),/reference/i);
  assert.throws(()=>buildUpiPaymentUri({upiId:'payer@upi',payeeName:'X',transactionReference:'SAFE123',note:'Fee',amount:-1}),/amount/i);
});

test('institute reference prefix is safe and deterministic',()=>{
  const prefix=instituteReferencePrefix('BrightPath Coaching Institute');
  assert.match(prefix,/^[A-Z0-9]{2,6}$/);assert.equal(prefix,instituteReferencePrefix('BrightPath Coaching Institute'));
});

test('initial verification provider is explicitly manual',async()=>{
  const provider=new ManualUpiVerificationProvider(),pending=await provider.checkPaymentStatus(),unconfirmed=await provider.verifyTransaction({confirmedByInstitute:false}),confirmed=await provider.verifyTransaction({confirmedByInstitute:true});
  assert.equal(pending.automatic,false);assert.equal(unconfirmed.verified,false);assert.equal(confirmed.verified,true);assert.equal(confirmed.automatic,false);
});
