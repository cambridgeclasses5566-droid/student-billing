import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  standard: { type: String, required: true, trim: true },
  division: { type: String, required: true, trim: true },
  batchName: { type: String, trim: true, default: '' },
  academicYear: { type: String, required: true, trim: true },
  classTeacherName: { type: String, trim: true, default: '' },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },
  defaultFees: { type: Number, min: 0, default: 0 },
  capacity: { type: Number, min: 0, default: null },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  // Legacy values are retained read-only until the academic migration is reviewed.
  subject: { type: String, select: false },
  teacher: { type: String, select: false },
  timing: { type: String, select: false }
}, { timestamps: true });

classSchema.index({ ownerId: 1, name: 1, academicYear: 1 });
classSchema.index({ ownerId: 1, standard: 1, academicYear: 1, isActive: 1 });
export default mongoose.model('Class', classSchema);
