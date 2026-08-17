import { Router } from 'express';
import ClassModel from '../models/Class.js'; import Subject from '../models/Subject.js'; import ClassSubject from '../models/ClassSubject.js';
import Student from '../models/Student.js'; import StudentClassEnrollment from '../models/StudentClassEnrollment.js'; import StudentSubjectEnrollment from '../models/StudentSubjectEnrollment.js';
import { enrollStudent, transferStudent } from '../services/enrollmentService.js';
import { getStudentsBillingSummaries } from '../services/studentBillingService.js';
import { getActiveClassMembership } from '../services/classMembershipService.js';
import { authenticate, requireActiveSubscription } from '../middleware/auth.js'; import { ok, fail } from '../utils/apiResponse.js';
const router = Router(); router.use(authenticate, requireActiveSubscription); const owner = req => ({ ownerId: req.user.id });
const validClass = body => body.name?.trim() && body.standard?.trim() && body.division?.trim() && body.academicYear?.trim();

router.get('/', async (req, res) => { const query = owner(req); if (req.query.standard) query.standard = req.query.standard; if (req.query.academicYear) query.academicYear = req.query.academicYear; if (req.query.active) query.isActive = req.query.active === 'true'; ok(res, 'Classes loaded', { classes: await ClassModel.find(query).sort({ standard: 1, division: 1, name: 1 }) }); });
router.post('/', async (req, res) => { const safe = { ...req.body }; ['ownerId', 'subject', 'teacher', 'timing'].forEach(k => delete safe[k]); if (!validClass(safe)) return fail(res, 'Class name, standard, division, and academic year are required.', [], 422); const item = await ClassModel.create({ ...safe, ownerId: req.user.id }); ok(res, 'Class / batch created.', { class: item }, 201); });
router.get('/:id', async (req, res) => { const item = await ClassModel.findOne({ _id: req.params.id, ...owner(req) }); return item ? ok(res, 'Class loaded', { class: item }) : fail(res, 'Class not found.', [], 404); });
router.put('/:id', async (req, res) => { const safe = { ...req.body }; ['ownerId', 'subject', 'teacher', 'timing'].forEach(k => delete safe[k]); const item = await ClassModel.findOneAndUpdate({ _id: req.params.id, ...owner(req) }, { $set: safe }, { new: true, runValidators: true }); return item ? ok(res, 'Class updated.', { class: item }) : fail(res, 'Class not found.', [], 404); });
router.delete('/:id', async (req, res) => { if (await StudentClassEnrollment.exists({ ...owner(req), classId: req.params.id, status: 'active' })) return fail(res, 'Transfer or remove active students before deleting this class.', [], 409); await ClassSubject.deleteMany({ ...owner(req), classId: req.params.id }); const item = await ClassModel.findOneAndDelete({ _id: req.params.id, ...owner(req) }); return item ? ok(res, 'Class deleted.') : fail(res, 'Class not found.', [], 404); });

router.get('/:id/subjects', async (req, res) => { if (!await ClassModel.exists({ _id: req.params.id, ...owner(req) })) return fail(res, 'Class not found.', [], 404); const links = await ClassSubject.find({ ...owner(req), classId: req.params.id }).populate('subjectId').sort({ createdAt: 1 }); ok(res, 'Class subjects loaded', { subjects: links }); });
router.post('/:id/subjects', async (req, res, next) => { try { const [cls, subject] = await Promise.all([ClassModel.findOne({ _id: req.params.id, ...owner(req) }), Subject.findOne({ _id: req.body.subjectId, ...owner(req) })]); if (!cls || !subject) return fail(res, 'Class or subject not found.', [], 404); const link = await ClassSubject.create({ ownerId: req.user.id, classId: cls.id, subjectId: subject.id, teacherName: req.body.teacherName || '', isRequired: req.body.isRequired !== false, weeklySchedule: req.body.weeklySchedule || [] }); ok(res, 'Subject linked to class.', { classSubject: await link.populate('subjectId') }, 201); } catch (error) { if (error.code === 11000) return fail(res, 'This subject is already linked to the class.', [], 409); next(error); } });
router.put('/:id/subjects/:linkId', async (req, res) => { const safe = { ...req.body }; ['ownerId', 'classId', 'subjectId'].forEach(k => delete safe[k]); const link = await ClassSubject.findOneAndUpdate({ _id: req.params.linkId, classId: req.params.id, ...owner(req) }, { $set: safe }, { new: true, runValidators: true }).populate('subjectId'); return link ? ok(res, 'Class subject updated.', { classSubject: link }) : fail(res, 'Class subject link not found.', [], 404); });
router.delete('/:id/subjects/:linkId', async (req, res) => { const link = await ClassSubject.findOneAndUpdate({ _id: req.params.linkId, classId: req.params.id, ...owner(req) }, { $set: { isActive: false } }, { new: true }); return link ? ok(res, 'Subject disabled for this class.') : fail(res, 'Class subject link not found.', [], 404); });

router.get('/:id/enrollments', async (req, res) => ok(res, 'Enrollments loaded', { enrollments: await StudentClassEnrollment.find({ ...owner(req), classId: req.params.id }).populate('studentId').sort({ joinedAt: -1 }) }));
router.post('/:id/enrollments', async (req, res, next) => { try { const [student,cls]=await Promise.all([Student.exists({ _id: req.body.studentId, ...owner(req) }),ClassModel.findOne({_id:req.params.id,...owner(req)}).select('isActive')]);if(!student)return fail(res,'Student not found.',[],404);if(!cls)return fail(res,'Class not found.',[],404);if(cls.isActive===false)return fail(res,'Activate this class before enrolling new students.',[],409);const enrollment = await enrollStudent({ ownerId: req.user.id, studentId: req.body.studentId, classId: req.params.id, academicYear: req.body.academicYear, subjectIds: req.body.subjectIds || [] }); ok(res, 'Student enrolled.', { enrollment }, 201); } catch (error) { next(error); } });
router.post('/:id/enrollments/bulk', async (req, res, next) => {
  try {
    const cls = await ClassModel.findOne({ _id: req.params.id, ...owner(req), isActive: true });
    if (!cls) return fail(res, 'Class not found.', [], 404);
    const ids = [...new Set((Array.isArray(req.body.studentIds) ? req.body.studentIds : []).map(String))];
    if (!ids.length || ids.length > 100) return fail(res, 'Select between 1 and 100 students.', [], 422);
    const students = await Student.find({ _id: { $in: ids }, ...owner(req) }).select('_id name');
    if (students.length !== ids.length) return fail(res, 'One or more students do not belong to your institute.', [], 403);
    const transferIds = new Set((req.body.transferStudentIds || []).map(String));
    const optionalSubjectIds = [...new Set((req.body.optionalSubjectIds || []).map(String))];
    const active = await StudentClassEnrollment.find({ ...owner(req), studentId: { $in: ids }, academicYear: cls.academicYear, status: 'active' }).populate('classId', 'name');
    const activeByStudent = new Map(active.map(item => [String(item.studentId), item]));
    const results = { enrolled: [], skipped: [] };
    for (const student of students) {
      const existing = activeByStudent.get(String(student._id));
      if (existing && String(existing.classId?._id || existing.classId) === String(cls._id)) { results.skipped.push({ studentId: student._id, name: student.name, reason: `Already enrolled in ${cls.name}` }); continue; }
      if (existing && !transferIds.has(String(student._id))) { results.skipped.push({ studentId: student._id, name: student.name, reason: `Active in ${existing.classId?.name || 'another class'}` }); continue; }
      if (existing) {
        await StudentClassEnrollment.updateOne({ _id: existing._id, ...owner(req) }, { $set: { status: 'transferred', leftAt: new Date() } });
        await StudentSubjectEnrollment.updateMany({ ...owner(req), studentId: student._id, classId: existing.classId?._id || existing.classId, academicYear: cls.academicYear, status: 'active' }, { $set: { status: 'inactive' } });
      }
      const enrollment = await enrollStudent({ ownerId: req.user.id, studentId: student._id, classId: cls._id, academicYear: cls.academicYear, subjectIds: optionalSubjectIds });
      await Student.updateOne({ _id: student._id, ...owner(req) }, { $set: { classId: cls._id, standard: cls.standard, division: cls.division, academicYear: cls.academicYear } });
      results.enrolled.push({ studentId: student._id, name: student.name, enrollmentId: enrollment._id });
    }
    ok(res, `${results.enrolled.length} students enrolled.`, { ...results, class: cls }, results.enrolled.length ? 201 : 200);
  } catch (error) { next(error); }
});

router.get('/:id/eligible-students', async (req, res, next) => {
  try {
    const cls = await ClassModel.findOne({ _id: req.params.id, ...owner(req) }).lean();
    if (!cls) return fail(res, 'Class not found.', [], 404);

    const currentEnrollments = await StudentClassEnrollment.find({
      ...owner(req), classId: cls._id, status: 'active'
    }).select('studentId').lean();
    const excludedIds = currentEnrollments.map(item => item.studentId);
    const query = {
      ...owner(req),
      _id: { $nin: excludedIds },
      classId: { $ne: cls._id }
    };
    const search = String(req.query.search || '').trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = ['name', 'studentId', 'mobile'].map(field => ({ [field]: { $regex: escaped, $options: 'i' } }));
    }

    const students = await Student.find(query)
      .select('studentId name standard division academicYear mobile classId')
      .populate('classId', 'name standard division academicYear')
      .limit(100)
      .lean();
    const active = await StudentClassEnrollment.find({
      ...owner(req),
      studentId: { $in: students.map(student => student._id) },
      academicYear: cls.academicYear,
      status: 'active'
    }).populate('classId', 'name standard division academicYear').lean();
    const activeByStudent = new Map(active.map(item => [String(item.studentId), item]));
    const eligible = students.map(student => {
      const enrollment = activeByStudent.get(String(student._id));
      const currentClass = enrollment?.classId || student.classId || null;
      return {
        ...student,
        currentClass,
        transferRequired: Boolean(currentClass && String(currentClass._id || currentClass) !== String(cls._id)),
        matchesClass: student.standard === cls.standard && student.academicYear === cls.academicYear
      };
    }).sort((a, b) => Number(b.matchesClass) - Number(a.matchesClass) || a.name.localeCompare(b.name));

    ok(res, 'Eligible students loaded.', { class: cls, students: eligible });
  } catch (error) { next(error); }
});

router.get('/:id/students', async (req, res) => { const membership=await getActiveClassMembership({ownerId:req.user.id,classId:req.params.id}),summaries=await getStudentsBillingSummaries({ownerId:req.user.id,studentIds:membership.studentIds});ok(res,'Class students loaded',{students:membership.enrollments.map(item=>{const billing=summaries.get(String(item.studentId?._id));return{...item,student:item.studentId,feeStatus:billing?.status||'Unpaid',billing}})}) });
router.get('/:id/financial-summary', async (req, res) => { const membership=await getActiveClassMembership({ownerId:req.user.id,classId:req.params.id}),summaries=await getStudentsBillingSummaries({ownerId:req.user.id,studentIds:membership.studentIds}),rows=[...summaries.values()],expectedPaise=rows.reduce((sum,row)=>sum+row.finalPayablePaise,0),collectedPaise=rows.reduce((sum,row)=>sum+row.totalPaidPaise,0);ok(res,'Class financial summary loaded',{expected:expectedPaise/100,collected:collectedPaise/100,pending:Math.max(0,expectedPaise-collectedPaise)/100}) });
router.get('/:id/profile', async (req, res) => { const cls=await ClassModel.findOne({_id:req.params.id,...owner(req)}).lean();if(!cls)return fail(res,'Class not found.',[],404);const [membership,subjects]=await Promise.all([getActiveClassMembership({ownerId:req.user.id,classId:cls._id}),ClassSubject.countDocuments({...owner(req),classId:cls._id,isActive:true})]),summaries=await getStudentsBillingSummaries({ownerId:req.user.id,studentIds:membership.studentIds}),rows=[...summaries.values()],expectedPaise=rows.reduce((sum,row)=>sum+row.finalPayablePaise,0),collectedPaise=rows.reduce((sum,row)=>sum+row.totalPaidPaise,0);ok(res,'Class profile loaded',{class:cls,summary:{studentCount:membership.students.length,subjectCount:subjects,expected:expectedPaise/100,collected:collectedPaise/100,pending:Math.max(0,expectedPaise-collectedPaise)/100}}) });
export default router;
