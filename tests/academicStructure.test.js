import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ClassModel from "../server/models/Class.js";
import Subject from "../server/models/Subject.js";
import ClassSubject from "../server/models/ClassSubject.js";
import StudentClassEnrollment from "../server/models/StudentClassEnrollment.js";
import StudentSubjectEnrollment from "../server/models/StudentSubjectEnrollment.js";
import AttendanceSession from "../server/models/AttendanceSession.js";

test("class model represents a group and exposes no active subject field", () => {
  assert.ok(ClassModel.schema.path("batchName"));
  assert.ok(ClassModel.schema.path("classTeacherName"));
  assert.ok(ClassModel.schema.path("startTime"));
  assert.ok(ClassModel.schema.path("capacity"));
  assert.equal(ClassModel.schema.path("subject").options.select, false);
});
test("subjects are reusable catalogue records", () => {
  assert.ok(Subject.schema.path("description"));
  assert.ok(Subject.schema.path("isActive"));
  assert.equal(Subject.schema.path("classId").options.select, false);
});
test("class-subject relation is owner scoped and unique", () => {
  const index = ClassSubject.schema.indexes().find(([keys]) => keys.ownerId === 1 && keys.classId === 1 && keys.subjectId === 1);
  assert.equal(index?.[1].unique, true);
});
test("class and subject enrollments prevent duplicate membership", () => {
  assert.ok(StudentClassEnrollment.schema.indexes().some(([keys]) => keys.ownerId === 1 && keys.classId === 1 && keys.status === 1));
  assert.ok(
    StudentSubjectEnrollment.schema
      .indexes()
      .some(([keys, options]) => keys.ownerId === 1 && keys.studentId === 1 && keys.classId === 1 && keys.subjectId === 1 && keys.academicYear === 1 && options.unique),
  );
});
test("attendance duplicate key includes owner, class, subject, date, and time", () => {
  assert.ok(
    AttendanceSession.schema
      .indexes()
      .some(([keys, options]) => keys.ownerId === 1 && keys.classId === 1 && keys.subjectId === 1 && keys.attendanceDate === 1 && keys.startTime === 1 && options.unique),
  );
});
test("migration supports dry run and never deletes legacy data", () => {
  const source = readFileSync("server/scripts/migrateClassesAndSubjects.js", "utf8");
  assert.match(source, /--dry-run/);
  assert.doesNotMatch(source, /deleteMany|findOneAndDelete|deleteOne/);
  assert.match(source, /upsert:\s*true/);
});
test("attendance eligibility uses enrollment relations", () => {
  const source = readFileSync("server/services/enrollmentService.js", "utf8");
  assert.match(source, /StudentClassEnrollment\.find/);
  assert.match(source, /StudentSubjectEnrollment\.find/);
  assert.match(source, /ClassSubject\.findOne/);
});
test("dashboard has class profile and class-first attendance routes", () => {
  const dashboard = readFileSync("client/assets/js/dashboard.js", "utf8"),
    attendance = readFileSync("client/assets/js/attendance.js", "utf8");
  assert.match(dashboard, /renderClassProfile/);
  assert.match(dashboard, /page==='class-profile'/);
  assert.match(attendance, /attendance\/class-overview/);
  assert.match(attendance, /aria-expanded/);
});
