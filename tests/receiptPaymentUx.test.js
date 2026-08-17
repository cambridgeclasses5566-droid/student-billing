import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("receipt student details keep the required nine-field order and three-column desktop grid", () => {
  const receipt = read("client/assets/js/receipt.js"),
    css = read("client/assets/css/receipt.css");
  const expected = ["Student Name", "Student ID", "Student Mobile", "Class / Batch", "Standard", "Division", "Academic Year", "Admission Date", "Email"];
  const rowSource = receipt.match(/const studentRows=\[(.*?)\];/s)?.[1] || "";
  let previous = -1;
  for (const label of expected) {
    const index = rowSource.indexOf(`['${label}'`);
    assert.ok(index > previous, `${label} is missing or out of order`);
    previous = index;
  }
  assert.equal((rowSource.match(/\['/g) || []).length, 9);
  assert.match(receipt, /studentEmail:asText\(student\.email\)/);
  assert.match(receipt, /formattedAdmissionDate:formatReceiptDate\(student\.admissionDate/);
  assert.match(css, /\.receipt-detail-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
  assert.match(css, /\.receipt-payment-details\s*\{[^}]*display:\s*block/s);
  assert.doesNotMatch(css, /\.receipt-payment-details\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
});

test("payment details retain exactly four fields in the required order", () => {
  const receipt = read("client/assets/js/receipt.js"),
    css = read("client/assets/css/receipt.css");
  const source = receipt.match(/receiptPaymentDetailRows\(model\)\{\s*return\[(.*?)\];/s)?.[1] || "";
  for (const label of ["Payment Mode", "Collected By", "Payment Notes"]) assert.match(source, new RegExp(label));
  assert.match(source, /model\.referenceLabel,model\.transactionReference/);
  assert.equal((source.match(/\],\s*\[/g) || []).length + 1, 4);
  assert.match(css, /\.receipt-payment-details \.receipt-detail-item\s*\{[^}]*grid-template-columns:\s*minmax\(112px/s);
  assert.match(css, /border-bottom:\s*1px solid var\(--receipt-border\)/);
  assert.match(css, /@media \(max-width:\s*480px\)[\s\S]*\.receipt-payment-details \.receipt-detail-item\s*\{\s*grid-template-columns:\s*1fr/s);
});

test("shared SVG close control replaces broken modal glyphs", () => {
  const ui = read("client/assets/js/ui.js"),
    sources = ["dashboard.js", "paymentForm.js", "receiptSettings.js", "classProfile.js", "subjects.js"].map((file) => read(`client/assets/js/${file}`)).join("\n");
  assert.match(ui, /export const closeIconSVG/);
  assert.match(ui, /class="close-icon"/);
  assert.match(sources, /\$\{closeIconSVG\}/);
  assert.doesNotMatch(sources, /class="dialog-close"[^>]*>\s*(?:\?|×|Ã—|&times;)\s*<\/button>/);
});

test("collect-payment search exposes an accessible floating listbox interaction", () => {
  const source = read("client/assets/js/billingPages.js"),
    css = read("client/assets/css/billing-pages.css");
  for (const token of ['role="combobox"', 'aria-autocomplete="list"', 'role="listbox"', 'role="option"', "ArrowDown", "ArrowUp", "Enter", "Escape", "No students found", "collect-student-avatar"])
    assert.match(source, new RegExp(token));
  assert.match(css, /\.collect-student-results\s*\{[^}]*position:absolute/s);
  assert.match(css, /\.collect-student-result\s*\{[^}]*min-height:68px/s);
});

test("record-payment modal has two three-cell summaries and clears cash references", () => {
  const source = read("client/assets/js/paymentForm.js"),
    css = read("client/assets/css/billing-pages.css");
  for (const label of ["Final Payable", "Previously Paid", "Remaining", "Current Payment", "Paid After", "Remaining After"]) assert.match(source, new RegExp(label));
  assert.match(source, /if\(cash\)reference\.value=''/);
  assert.match(source, /reference\.disabled=cash/);
  assert.match(css, /\.payment-summary-grid\s*\{[^}]*grid-template-columns:repeat\(3,/s);
  assert.match(source, /textarea name="notes" rows="4"/);
});
