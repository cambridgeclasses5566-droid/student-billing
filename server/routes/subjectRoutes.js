import { Router } from 'express';
import Subject from '../models/Subject.js';
import ClassSubject from '../models/ClassSubject.js';
import StudentSubjectEnrollment from '../models/StudentSubjectEnrollment.js';
import { authenticate, requireActiveSubscription } from '../middleware/auth.js';
import { ok, fail } from '../utils/apiResponse.js';

const router = Router(); router.use(authenticate, requireActiveSubscription);
const owner = req => ({ ownerId: req.user.id });
router.get('/', async (req, res) => {
  const query = owner(req); if (req.query.standard) query.standard = req.query.standard; if (req.query.active) query.isActive = req.query.active === 'true';
  const subjects = await Subject.find(query).sort({ name: 1 }).lean();
  const links = await ClassSubject.find({ ...owner(req), subjectId: { $in: subjects.map(s => s._id) } }).populate('classId', 'name standard division').lean();
  ok(res, 'Subjects loaded', { subjects: subjects.map(subject => ({ ...subject, classLinks: links.filter(link => String(link.subjectId) === String(subject._id)) })) });
});
router.post('/', async (req, res, next) => { try { const safe = { ...req.body }; delete safe.ownerId; delete safe.classId; if (!safe.name?.trim()) return fail(res, 'Subject name is required.', [], 422); const subject = await Subject.create({ ...safe, ownerId: req.user.id }); ok(res, 'Subject created successfully.', { subject }, 201); } catch (error) { next(error); } });
router.get('/:id', async (req, res) => { const subject = await Subject.findOne({ _id: req.params.id, ...owner(req) }); return subject ? ok(res, 'Subject loaded', { subject, classLinks: await ClassSubject.find({ ...owner(req), subjectId: subject.id }).populate('classId') }) : fail(res, 'Subject not found.', [], 404); });
router.put('/:id', async (req, res) => { const safe = { ...req.body }; delete safe.ownerId; delete safe.classId; const subject = await Subject.findOneAndUpdate({ _id: req.params.id, ...owner(req) }, { $set: safe }, { new: true, runValidators: true }); return subject ? ok(res, 'Subject updated successfully.', { subject }) : fail(res, 'Subject not found.', [], 404); });
router.delete('/:id', async (req, res) => { if (await StudentSubjectEnrollment.exists({ ...owner(req), subjectId: req.params.id })) return fail(res, 'This subject has academic history. Disable it instead.', [], 409); await ClassSubject.deleteMany({ ...owner(req), subjectId: req.params.id }); const subject = await Subject.findOneAndDelete({ _id: req.params.id, ...owner(req) }); return subject ? ok(res, 'Subject deleted.') : fail(res, 'Subject not found.', [], 404); });
export default router;
