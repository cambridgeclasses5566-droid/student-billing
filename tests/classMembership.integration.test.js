import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server/app.js';
import User from '../server/models/User.js';
import Subscription from '../server/models/Subscription.js';
import ClassModel from '../server/models/Class.js';
import Student from '../server/models/Student.js';
import StudentClassEnrollment from '../server/models/StudentClassEnrollment.js';

let mongo, owner, token, targetClass, sourceClass, targetStudent, movableStudent;
const auth = () => ({ Authorization: `Bearer ${token}` });
const studentData = (studentId, name, classId, aadhaarNumber) => ({
  ownerId: owner.id, studentId, name, age: 14, dob: new Date('2012-01-01'),
  email: `${studentId.toLowerCase()}@example.com`, address: 'Test address', aadhaarNumber,
  mobile: '9876543210', academicYear: '2026-2027', standard: '10', classId, division: 'A',
  fatherName: 'Father', motherName: 'Mother', parentsMobileNumber: '9876543211',
  admissionDate: new Date('2026-06-01'), totalFees: 20000, discount: 0, finalFees: 20000,
  totalFeesPaise: 2000000, discountPaise: 0, finalPayablePaise: 2000000
});

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'class-membership-secret-at-least-32-characters';
  process.env.COOKIE_SECRET = 'class-membership-cookie-at-least-32-characters';
  process.env.CLIENT_URL = 'http://localhost:4000';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  owner = await User.create({ fullName: 'Membership Owner', email: 'membership@example.com', mobile: '9876543210', instituteName: 'Test Institute', passwordHash: 'not-used', emailVerified: true, accountStatus: 'active' });
  await Subscription.create({ userId: owner.id, status: 'active', expiresAt: new Date(Date.now() + 86400000), razorpayOrderId: 'membership-order' });
  [targetClass, sourceClass] = await ClassModel.create([
    { ownerId: owner.id, name: 'Class 10 Mathematics', standard: '10', division: 'A', academicYear: '2026-2027', isActive: true },
    { ownerId: owner.id, name: 'Class 10 Science', standard: '10', division: 'A', academicYear: '2026-2027', isActive: true }
  ]);
  [targetStudent, movableStudent] = await Student.create([
    studentData('STU-0001', 'Already Enrolled', targetClass._id, '111111111111'),
    studentData('STU-0002', 'Aman Verma', sourceClass._id, '222222222222')
  ]);
  await StudentClassEnrollment.create([
    { ownerId: owner.id, studentId: targetStudent._id, classId: targetClass._id, academicYear: '2026-2027', status: 'active' },
    { ownerId: owner.id, studentId: movableStudent._id, classId: sourceClass._id, academicYear: '2026-2027', status: 'active' }
  ]);
  token = jwt.sign({ sub: owner.id, role: 'institute' }, process.env.JWT_SECRET);
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test('eligible list excludes current members and identifies transfer candidates', async () => {
  const response = await request(app).get(`/api/classes/${targetClass.id}/eligible-students?search=ama`).set(auth());
  assert.equal(response.status, 200, response.body.message);
  const students = response.body.data.students;
  assert.deepEqual(students.map(item => item.studentId), ['STU-0002']);
  assert.equal(students[0].transferRequired, true);
  assert.equal(students[0].currentClass.name, 'Class 10 Science');
  assert.equal(students.some(item => item.studentId === 'STU-0001'), false);
});

test('bulk assignment never silently moves a student', async () => {
  const response = await request(app).post(`/api/classes/${targetClass.id}/enrollments/bulk`).set(auth()).send({ studentIds: [movableStudent.id], transferStudentIds: [] });
  assert.equal(response.status, 200, response.body.message);
  assert.equal(response.body.data.enrolled.length, 0);
  assert.match(response.body.data.skipped[0].reason, /Active in Class 10 Science/);
  assert.equal(await StudentClassEnrollment.countDocuments({ ownerId: owner.id, studentId: movableStudent.id, classId: sourceClass.id, status: 'active' }), 1);
});

test('confirmed move updates enrollment, student assignment, class list, and CSV', async () => {
  const response = await request(app).post(`/api/classes/${targetClass.id}/enrollments/bulk`).set(auth()).send({ studentIds: [movableStudent.id], transferStudentIds: [movableStudent.id] });
  assert.equal(response.status, 201, response.body.message);
  assert.equal(response.body.data.enrolled.length, 1);
  const oldEnrollment = await StudentClassEnrollment.findOne({ ownerId: owner.id, studentId: movableStudent.id, classId: sourceClass.id }).lean();
  const newEnrollment = await StudentClassEnrollment.findOne({ ownerId: owner.id, studentId: movableStudent.id, classId: targetClass.id }).lean();
  const student = await Student.findById(movableStudent.id).lean();
  assert.equal(oldEnrollment.status, 'transferred');
  assert.equal(newEnrollment.status, 'active');
  assert.equal(String(student.classId), targetClass.id);
  const classStudents = await request(app).get(`/api/classes/${targetClass.id}/students`).set(auth());
  assert.equal(classStudents.body.data.students.some(item => item.student.studentId === 'STU-0002'), true);
  const csv = await request(app).get(`/api/billing/classes/${targetClass.id}/students.csv`).set(auth());
  assert.equal(csv.status, 200);
  assert.match(csv.text, /STU-0002/);
  assert.match(csv.text, /Aman Verma/);
});

test('KrishnaBRO UI count and CSV share only its two active enrollment records', async () => {
  const cls = await ClassModel.create({ ownerId: owner.id, name: 'KrishnaBRO', standard: '10', division: 'B', academicYear: '2026-2027', isActive: true });
  const [om, chetan, krishna] = await Student.create([
    studentData('STU-KB-OM', 'om', cls._id, '333333333333'),
    studentData('STU-KB-CHETAN', 'chetan', cls._id, '444444444444'),
    studentData('STU-KB-KRISHNA', 'Krishna', cls._id, '555555555555')
  ]);
  await StudentClassEnrollment.create([
    { ownerId: owner.id, studentId: om._id, classId: cls._id, academicYear: '2026-2027', status: 'active' },
    { ownerId: owner.id, studentId: chetan._id, classId: cls._id, academicYear: '2026-2027', status: 'active' },
    { ownerId: owner.id, studentId: krishna._id, classId: cls._id, academicYear: '2026-2027', status: 'transferred', leftAt: new Date() }
  ]);
  const visible = await request(app).get(`/api/classes/${cls.id}/students`).set(auth());
  assert.equal(visible.status, 200);
  assert.deepEqual(visible.body.data.students.map(item => item.student.name).sort(), ['chetan', 'om']);
  const profile = await request(app).get(`/api/classes/${cls.id}/profile`).set(auth());
  assert.equal(profile.body.data.summary.studentCount, 2);
  const csv = await request(app).get(`/api/billing/classes/${cls.id}/students.csv`).set(auth());
  assert.equal(csv.status, 200);
  assert.match(csv.text, /chetan/);
  assert.match(csv.text, /om/);
  assert.doesNotMatch(csv.text, /STU-KB-KRISHNA|"Krishna"/);
  assert.match(csv.text, /=HYPERLINK\(""https:\/\/wa\.me\/919876543210"",""9876543210""\)/);
});
