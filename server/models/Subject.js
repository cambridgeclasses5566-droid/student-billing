import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true, default: '' },
  standard: { type: String, trim: true, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  // Kept only so pre-migration records remain readable.
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', select: false },
  teacherName: { type: String, select: false },
  academicYear: { type: String, select: false }
}, { timestamps: true });

subjectSchema.index({ ownerId: 1, name: 1, standard: 1 }, { unique: true });
subjectSchema.index({ ownerId: 1, isActive: 1, standard: 1 });
export default mongoose.model('Subject', subjectSchema);
