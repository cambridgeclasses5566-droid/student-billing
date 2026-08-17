import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  academicYear: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'transferred', 'inactive'], default: 'active' },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ ownerId: 1, classId: 1, status: 1 });
schema.index({ ownerId: 1, studentId: 1, classId: 1, academicYear: 1 }, { unique: true });
schema.index({ ownerId: 1, studentId: 1, academicYear: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
export default mongoose.model('StudentClassEnrollment', schema);
