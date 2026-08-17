import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {hashToken,randomDigits,verifyHmac} from '../server/utils/security.js';import {oneYearFrom,PLAN} from '../server/services/subscriptionService.js';
test('OTP generator produces six numeric digits',()=>assert.match(randomDigits(),/^\d{6}$/));
test('tokens are stored as deterministic hashes, not plaintext',()=>{const token='sensitive-reset-token';assert.notEqual(hashToken(token),token);assert.equal(hashToken(token),hashToken(token))});
test('HMAC verification rejects altered payloads',()=>{const secret='test-secret',payload='order_1|payment_1',signature=crypto.createHmac('sha256',secret).update(payload).digest('hex');assert.equal(verifyHmac(payload,signature,secret),true);assert.equal(verifyHmac(payload+'x',signature,secret),false)});
test('subscription plan amount is server controlled',()=>{assert.equal(PLAN.amountPaise,400000);assert.equal(PLAN.currency,'INR')});
test('yearly expiry advances the calendar year',()=>{const start=new Date('2026-02-28T00:00:00Z'),end=oneYearFrom(start);assert.equal(end.getUTCFullYear(),2027);assert.equal(end.getUTCMonth(),1)});
