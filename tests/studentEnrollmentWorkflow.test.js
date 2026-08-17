import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Student from "../server/models/Student.js";
import StudentClassEnrollment from "../server/models/StudentClassEnrollment.js";
import StudentSubjectEnrollment from "../server/models/StudentSubjectEnrollment.js";

const read = (path) => readFileSync(path, "utf8");

test("student discovery is owner scoped, paginated, and supports institute search fields", () => {
  const service = read("server/services/studentDiscoveryService.js");
  assert.match(service, /ownerId:\s*ownerObjectId/);
  assert.match(service, /guardianName:\s*term/);
  assert.match(service, /email:\s*term/);
  assert.match(service, /\$skip/);
  assert.match(service, /\$limit/);
});

test("bulk enrollment validates ownership and never accepts frontend ownerId", () => {
  const routes = read("server/routes/classSubjectRoutes.js");
  assert.match(routes, /enrollments\/bulk/);
  assert.match(routes, /Student\.find\(\{ _id: \{ \$in: ids \}, \.\.\.owner\(req\) \}\)/);
  assert.match(routes, /ownerId: req\.user\.id/);
  assert.doesNotMatch(routes, /ownerId:\s*req\.body\.ownerId/);
});

test("required subjects are automatically combined with selected optional subjects", () => {
  const service = read("server/services/enrollmentService.js");
  assert.match(service, /isRequired: true/);
  assert.match(service, /required\.map/);
  assert.match(service, /subjectIds\.map/);
});

test("removing from class preserves the student while deactivating class and subject enrollments", () => {
  const routes = read("server/routes/enrollmentRoutes.js");
  assert.match(routes, /findOneAndUpdate/);
  assert.match(routes, /status: 'inactive'/);
  assert.match(routes, /StudentSubjectEnrollment\.updateMany/);
  assert.doesNotMatch(routes, /Student\.findOneAndDelete/);
});

test("enrollment indexes support owner-scoped class and subject lookups", () => {
  assert.ok(Student.schema.indexes().some(([keys]) => keys.ownerId === 1 && keys.studentId === 1));
  assert.ok(Student.schema.indexes().some(([keys]) => keys.ownerId === 1 && keys.name === 1));
  assert.ok(Student.schema.indexes().some(([keys]) => keys.ownerId === 1 && keys.mobile === 1));
  assert.ok(StudentClassEnrollment.schema.indexes().some(([keys]) => keys.ownerId === 1 && keys.classId === 1 && keys.status === 1));
  assert.ok(StudentSubjectEnrollment.schema.indexes().some(([keys]) => keys.ownerId === 1 && keys.classId === 1 && keys.subjectId === 1 && keys.status === 1));
});

test("class profile uses existing-student picker, multi-select, filters, transfer and fresh student route", () => {
  const page = read("client/assets/js/classProfile.js");
  assert.match(page, />Add Students</);
  assert.match(page, /available-for-class/);
  assert.match(page, /Select all visible/);
  assert.match(page, /transferStudentIds/);
  assert.match(page, /returnTo=class-profile/);
  assert.match(page, /300/);
});

test("global student directory sends server-side filters and paginated requests", () => {
  const page = read("client/assets/js/studentDirectory.js");
  assert.match(page, /academicYear/);
  assert.match(page, /subjectId/);
  assert.match(page, /attendanceStatus/);
  assert.match(page, /URLSearchParams\(\{ page, limit/);
  assert.match(page, /300/);
});

test("deep views use safe internal navigation helpers", () => {
  const navigation = read("client/assets/js/navigation.js");
  assert.match(navigation, /safeHash/);
  assert.match(navigation, /renderBackButton/);
  assert.match(navigation, /history\.back/);
  assert.match(read("client/assets/js/classProfile.js"), /Back to Classes/);
});
