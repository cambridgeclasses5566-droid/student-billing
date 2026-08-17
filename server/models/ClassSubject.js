import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({ day: String, startTime: String, endTime: String }, { _id: false });
const classSubjectSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  teacherName: { type: String, default: '' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isRequired: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  weeklySchedule: { type: [scheduleSchema], default: [] }
}, { timestamps: true });

classSubjectSchema.index({ ownerId: 1, classId: 1, subjectId: 1 }, { unique: true });
classSubjectSchema.index({ ownerId: 1, classId: 1, isActive: 1 });
export default mongoose.model('ClassSubject', classSubjectSchema);
