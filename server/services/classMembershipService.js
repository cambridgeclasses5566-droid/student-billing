import StudentClassEnrollment from '../models/StudentClassEnrollment.js';

export async function getActiveClassMembership({ ownerId, classId }) {
  const enrollments = await StudentClassEnrollment.find({ ownerId, classId, status: 'active' })
    .populate('studentId')
    .sort({ joinedAt: 1, _id: 1 })
    .lean();
  const current = enrollments.filter(item => item.studentId);
  return {
    enrollments: current,
    students: current.map(item => item.studentId),
    studentIds: current.map(item => item.studentId._id)
  };
}
