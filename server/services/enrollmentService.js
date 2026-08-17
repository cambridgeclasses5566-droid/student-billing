import ClassModel from '../models/Class.js';
import ClassSubject from '../models/ClassSubject.js';
import Student from '../models/Student.js';
import StudentClassEnrollment from '../models/StudentClassEnrollment.js';
import StudentSubjectEnrollment from '../models/StudentSubjectEnrollment.js';

export async function syncSubjectEnrollments({ ownerId, studentId, classId, academicYear, subjectIds, session }) {
  const links = await ClassSubject.find({ ownerId, classId, subjectId: { $in: subjectIds }, isActive: true }).session(session || null);
  if (links.length !== new Set(subjectIds.map(String)).size) throw Object.assign(new Error('One or more selected subjects are not linked to this class.'), { status: 422 });
  const selected = links.map(link => link.subjectId);
  await StudentSubjectEnrollment.updateMany({ ownerId, studentId, classId, academicYear, subjectId: { $nin: selected }, status: 'active' }, { $set: { status: 'inactive' } }, { session });
  if (selected.length) await StudentSubjectEnrollment.bulkWrite(selected.map(subjectId => ({
    updateOne: {
      filter: { ownerId, studentId, classId, subjectId, academicYear },
      update: { $set: { status: 'active' }, $setOnInsert: { ownerId, studentId, classId, subjectId, academicYear } },
      upsert: true
    }
  })), { session });
}

export async function enrollStudent({ ownerId, studentId, classId, academicYear, subjectIds = [], joinedAt, session }) {
  const cls = await ClassModel.findOne({ _id: classId, ownerId, isActive: true }).session(session || null);
  if (!cls) throw Object.assign(new Error('The selected class or batch was not found.'), { status: 404 });
  const enrollment = await StudentClassEnrollment.findOneAndUpdate(
    { ownerId, studentId, classId, academicYear },
    { $set: { status: 'active', leftAt: null }, $setOnInsert: { ownerId, studentId, classId, academicYear, joinedAt: joinedAt || new Date() } },
    { new: true, upsert: true, runValidators: true, session }
  );
  return enrollment;
}

export async function transferStudent({ ownerId, enrollmentId, classId, academicYear, subjectIds = [], session }) {
  const old = await StudentClassEnrollment.findOne({ _id: enrollmentId, ownerId, status: 'active' }).session(session || null);
  if (!old) throw Object.assign(new Error('Active enrollment not found.'), { status: 404 });
  old.status = 'transferred'; old.leftAt = new Date(); await old.save({ session });
  await StudentSubjectEnrollment.updateMany({ ownerId, studentId: old.studentId, classId: old.classId, academicYear: old.academicYear, status: 'active' }, { $set: { status: 'inactive' } }, { session });
  await Student.updateOne({ _id: old.studentId, ownerId }, { $set: { classId, academicYear } }, { session });
  return enrollStudent({ ownerId, studentId: old.studentId, classId, academicYear, subjectIds, joinedAt: new Date(), session });
}
