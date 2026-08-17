import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('settings receipt actions are a normal mobile section and pagination uses two deliberate rows',async()=>{const css=await read('client/assets/css/mobile-app.css');assert.match(css,/#settingsForm > \.form-actions \{[\s\S]*?position: static;[\s\S]*?content: 'Receipt actions'/);assert.doesNotMatch(css,/#studentForm > \.form-actions,\s*#settingsForm > \.form-actions[\s\S]*?position: sticky/);assert.match(css,/\.mobile-pagination \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);assert.match(css,/button:first-of-type \{ grid-column: 1; grid-row: 2; \}/);assert.match(css,/button:last-of-type \{ grid-column: 2; grid-row: 2; \}/)});

test('back buttons and student delete affordance are reusable and preserve safe messaging',async()=>{const [css,navigation,profile,route]=await Promise.all([read('client/assets/css/mobile-app.css'),read('client/assets/js/navigation.js'),read('client/assets/js/studentProfile.js'),read('server/routes/billingRoutes.js')]);assert.match(css,/\.page-back-button \{/);assert.match(navigation,/replace\(\/\^Back to\\s\+\/i, ''\)/);assert.match(profile,/profile-overflow-menu/);assert.match(profile,/Delete Student/);assert.match(profile,/await del\(`\/billing\/students\/\$\{student\._id\}`\)/);assert.match(profile,/location\.hash='students'/);assert.match(route,/Payment\.countDocuments/);assert.match(route,/StudentFeeRequest\.countDocuments/);assert.match(route,/financial history and cannot be deleted/);assert.doesNotMatch(route,/Payment\.deleteMany\(\{studentId:student\.id/)});
