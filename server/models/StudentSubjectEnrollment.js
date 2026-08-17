import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  academicYear: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'completed'], default: 'active' }
}, { timestamps: true });

schema.index({ ownerId: 1, studentId: 1, classId: 1, subjectId: 1, academicYear: 1 }, { unique: true });
schema.index({ ownerId: 1, classId: 1, subjectId: 1, status: 1 });
export default mongoose.model('StudentSubjectEnrollment', schema);
