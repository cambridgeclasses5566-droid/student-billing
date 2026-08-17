import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { normalizeIndianPhone, buildGenericWhatsAppPaymentLink, buildStudentWhatsAppPayment } from "../client/assets/js/whatsappPayment.js";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("WhatsApp links are official, encoded, copyable, and student specific", () => {
  assert.equal(normalizeIndianPhone("9876543210"), "919876543210");
  assert.equal(normalizeIndianPhone("+91 98765 43210"), "919876543210");
  const generic = buildGenericWhatsAppPaymentLink({ instituteName: "BrightPath Academy", upiId: "9082215426@fam" });
  assert.match(generic, /^https:\/\/api\.whatsapp\.com\/send\?text=/);
  assert.match(decodeURIComponent(generic), /BrightPath Academy/);
  const result = buildStudentWhatsAppPayment({
    student: { name: "Aman Verma", studentId: "STU-0003", standard: "10", division: "A", mobile: "9876543210" },
    request: { requestedAmount: 2000, requestNumber: "FEE-2026-0012", qrType: "exact" },
    settings: { instituteName: "BrightPath Academy", upiId: "9082215426@fam" },
  });
  assert.match(result.link, /^https:\/\/wa\.me\/919876543210\?text=/);
  assert.match(result.message, /Aman Verma/);
  assert.match(result.message, /FEE-2026-0012/);
  assert.match(read("client/assets/js/paymentRequests.js"), /Copy WhatsApp Link/);
});
test("Add Student shows all year standards and disables inactive classes", () => {
  const page = read("client/assets/js/dashboard.js"),
    route = read("server/routes/classSubjectRoutes.js");
  assert.match(page, /get\('\/classes'\)/);
  assert.match(page, /\.sort\(compareStandards\)/);
  assert.match(page, /c\.academicYear===year/);
  assert.match(page, /disabled/);
  assert.match(page, /Inactive/);
  assert.match(route, /Activate this class before enrolling new students/);
});
test("provided Cambridgeclassesartwork is used across primary product surfaces", () => {
  assert.equal(existsSync(new URL("../client/assets/images/NewLogo.png", import.meta.url)), true);
  for (const page of ["index.html", "login.html", "signup.html", "payment.html", "dashboard/index.html"]) {
    const html = read(`client/${page}`);
    assert.match(html, /ClassPro-logo\.png/);
    assert.match(html, /Cambridgeclasses- Smarter School Management/);
  }
  assert.match(read("client/assets/css/branding.css"), /object-fit:contain/);
});
