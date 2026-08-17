import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import ClassModel from '../models/Class.js'; import Subject from '../models/Subject.js'; import ClassSubject from '../models/ClassSubject.js'; import Student from '../models/Student.js'; import StudentClassEnrollment from '../models/StudentClassEnrollment.js'; import StudentSubjectEnrollment from '../models/StudentSubjectEnrollment.js';

const dryRun = process.argv.includes('--dry-run');
const subjectPattern = /math|english|science|physics|chemistry|biology|history|geography|sanskrit|computer|social|hindi|marathi/i;
const clean = value => String(value || '').trim();
const keyFor = row => [row.ownerId, clean(row.standard), clean(row.division), clean(row.academicYear), clean(row.batchName || row.timing)].join('|').toLowerCase();
const report = { inspected: 0, groups: 0, classes: 0, subjects: 0, links: 0, classEnrollments: 0, subjectEnrollments: 0, ambiguous: [] };

await connectDatabase();
try {
  const legacy = await ClassModel.find({}).select('+subject +teacher +timing').lean(); report.inspected = legacy.length;
  const groups = new Map();
  for (const row of legacy) { const key = keyFor(row); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); }
  report.groups = groups.size;
  for (const rows of groups.values()) {
    const source = rows[0], subjectNames = [...new Set(rows.flatMap(row => [clean(row.subject), subjectPattern.test(clean(row.name)) ? clean(row.name).replace(/^class\s*\d+\s*/i, '') : '']).filter(Boolean))];
    if (rows.length === 1 && !subjectNames.length) { report.ambiguous.push({ classId: source._id, reason: 'No legacy subject value; retained as an existing class.' }); }
    const classData = { ownerId: source.ownerId, name: subjectPattern.test(source.name) ? `${source.standard}-${source.division}${source.batchName || source.timing ? ` ${source.batchName || source.timing}` : ''}` : source.name, standard: source.standard, division: source.division, academicYear: source.academicYear || '2026-2027', batchName: source.batchName || source.timing || '', classTeacherName: source.classTeacherName || source.teacher || '', startTime: source.startTime || '', endTime: source.endTime || '', defaultFees: source.defaultFees || 0, isActive: source.isActive !== false };
    let target = await ClassModel.findOne({ ownerId: source.ownerId, name: classData.name, academicYear: classData.academicYear });
    if (!target && !dryRun) { target = await ClassModel.create(classData); report.classes++; } else if (!target) target = { _id: source._id, ...classData };
    for (const subjectName of subjectNames) {
      let subject = await Subject.findOne({ ownerId: source.ownerId, name: subjectName, standard: source.standard });
      if (!subject && !dryRun) { subject = await Subject.create({ ownerId: source.ownerId, name: subjectName, standard: source.standard, isActive: true }); report.subjects++; } else if (!subject) subject = { _id: new mongoose.Types.ObjectId(), name: subjectName };
      if (!dryRun) { const result = await ClassSubject.updateOne({ ownerId: source.ownerId, classId: target._id, subjectId: subject._id }, { $setOnInsert: { ownerId: source.ownerId, classId: target._id, subjectId: subject._id, teacherName: source.teacher || '', isRequired: true, isActive: true } }, { upsert: true }); if (result.upsertedCount) report.links++; }
    }
    const students = await Student.find({ ownerId: source.ownerId, classId: { $in: rows.map(row => row._id) } });
    for (const student of students) {
      if (!dryRun) {
        const result = await StudentClassEnrollment.updateOne({ ownerId: source.ownerId, studentId: student._id, classId: target._id, academicYear: student.academicYear || target.academicYear }, { $setOnInsert: { ownerId: source.ownerId, studentId: student._id, classId: target._id, academicYear: student.academicYear || target.academicYear, status: 'active', joinedAt: student.admissionDate || student.createdAt } }, { upsert: true }); if (result.upsertedCount) report.classEnrollments++;
        const links = await ClassSubject.find({ ownerId: source.ownerId, classId: target._id, isActive: true });
        for (const link of links) { const result2 = await StudentSubjectEnrollment.updateOne({ ownerId: source.ownerId, studentId: student._id, classId: target._id, subjectId: link.subjectId, academicYear: student.academicYear || target.academicYear }, { $setOnInsert: { ownerId: source.ownerId, studentId: student._id, classId: target._id, subjectId: link.subjectId, academicYear: student.academicYear || target.academicYear, status: 'active' } }, { upsert: true }); if (result2.upsertedCount) report.subjectEnrollments++; }
      }
    }
  }
  console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'write', note: 'No legacy records were deleted.', ...report }, null, 2));
} finally { await mongoose.disconnect(); }
