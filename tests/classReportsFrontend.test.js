import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterReportPayments, summarizeReportPayments, buildReportCsv } from "../client/assets/js/financialReports.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("class profile exposes an actionable existing-student membership flow", async () => {
  const source = await read("client/assets/js/classProfile.js");
  assert.match(source, /\+ Add Existing Student/);
  assert.match(source, /Create New Student/);
  assert.match(source, /Download CSV/);
  assert.match(source, /eligible-students/);
  assert.match(source, /Search students by name or student ID/);
  assert.match(source, /enrollments\/bulk/);
  assert.match(source, /transferStudentIds/);
  assert.match(source, /Move Student/);
  assert.match(source, /No students assigned yet/);
  assert.match(source, /Remove from Class/);
});

test("class-origin student creation keeps academic prefill and returns to class", async () => {
  const dashboard = await read("client/assets/js/dashboard.js");
  const form = await read("client/assets/js/studentForm.js");
  assert.match(dashboard, /returnToClassId:contextClass\._id/);
  assert.match(dashboard, /standard:contextClass\.standard/);
  assert.match(dashboard, /division:contextClass\.division/);
  assert.match(dashboard, /academicYear:contextClass\.academicYear/);
  assert.match(form, /returnClassId/);
  assert.match(form, /class-profile\?id=\$\{encodeURIComponent\(returnClassId\)\}&tab=students/);
});

test("financial reports use combined student and single-date filters", async () => {
  const source = await read("client/assets/js/financialReports.js");
  assert.match(source, /id="reportStudentSearch"/);
  assert.match(source, /Search by student name/);
  assert.match(source, /id="reportDate"/);
  assert.equal((source.match(/type="date"/g) || []).length, 1);
  assert.match(source, /matchesStudent && \(!selectedDate \|\| paymentDay/);
  assert.match(source, /student\.studentId/);
  assert.match(source, /summarizeReportPayments\(filtered\)/);
  assert.match(source, /buildReportCsv\(filtered\)/);
  assert.match(source, /window\.print/);
  assert.match(source, /clearReportFilters/);
  assert.doesNotMatch(source, /id="start"|id="end"|Collection in range/);
});

test("report filtering, totals, and CSV use the same filtered payment set", () => {
  const payments = [
    { receiptNumber: "AMAN-11", amount: 5000, paymentDate: "2026-08-11T10:00:00Z", paymentMode: "cash", studentId: { name: "Aman Verma", studentId: "STU-0003", standard: "10", division: "A" } },
    { receiptNumber: "AMAN-12", amount: 3000, paymentDate: "2026-08-12T10:00:00Z", paymentMode: "upi", studentId: { name: "Aman Verma", studentId: "STU-0003", standard: "10", division: "A" } },
    { receiptNumber: "PRIYA-11", amount: 4000, paymentDate: "2026-08-11T12:00:00Z", paymentMode: "cash", studentId: { name: "Priya Patel", studentId: "STU-0004", standard: "10", division: "A" } },
  ];
  const filtered = filterReportPayments(payments, "ama", "2026-08-11");
  assert.deepEqual(
    filtered.map((payment) => payment.receiptNumber),
    ["AMAN-11"],
  );
  assert.deepEqual(summarizeReportPayments(filtered), { total: 5000, count: 1 });
  const csv = buildReportCsv(filtered);
  assert.match(csv, /AMAN-11/);
  assert.doesNotMatch(csv, /AMAN-12|PRIYA-11/);
});
