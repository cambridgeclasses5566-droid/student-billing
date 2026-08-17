import { Router } from "express";
import Student from "../models/Student.js";
import ClassModel from "../models/Class.js";
import Payment from "../models/StudentPayment.js";
import Settings from "../models/InstituteSettings.js";
import { authenticate, requireActiveSubscription } from "../middleware/auth.js";
import { nextSequence, paddedSequence } from "../services/counterService.js";
import { getStudentBillingSummary, getStudentsBillingSummaries, getOwnerBillingSnapshot, completedPaymentFilter } from "../services/studentBillingService.js";
import { ok, fail } from "../utils/apiResponse.js";
import { getStudentsPage } from "../services/studentDiscoveryService.js";
import { toPaise, fromPaise, sumPaise } from "../utils/money.js";
import { validateAndNormalizeStudent } from "../services/studentValidationService.js";
import StudentClassEnrollment from "../models/StudentClassEnrollment.js";
import StudentSubjectEnrollment from "../models/StudentSubjectEnrollment.js";
import StudentFeeRequest from "../models/StudentFeeRequest.js";
import { getActiveClassMembership } from "../services/classMembershipService.js";
import { buildClassStudentsCsv } from "../services/csvExportService.js";

const router = Router();
router.use(authenticate, requireActiveSubscription);
const owner = (req) => ({ ownerId: req.user.id });
const modes = { cash: "cash", upi: "upi", "google pay / upi": "upi", card: "card", "bank transfer": "bank_transfer", bank_transfer: "bank_transfer", cheque: "cheque", other: "other" };
const normalizeMode = (value) =>
  modes[
    String(value || "")
      .trim()
      .toLowerCase()
  ];
const enrich = async (student, ownerId) => {
  const billing = await getStudentBillingSummary({ ownerId, studentId: student._id });
  return { ...student, totalPaid: billing.totalPaid, remaining: billing.remainingAmount, status: billing.status };
};

router.get("/dashboard", async (req, res, next) => {
  try {
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    const [snapshot, classes, recentPayments, monthRows] = await Promise.all([
      getOwnerBillingSnapshot(req.user.id),
      ClassModel.countDocuments(owner(req)),
      Payment.find({ ...owner(req), ...completedPaymentFilter })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("studentId", "studentId name standard division")
        .lean(),
      Payment.find({ ...owner(req), ...completedPaymentFilter, paymentDate: { $gte: month } }).lean(),
    ]);
    const summary = {
      students: snapshot.students.length,
      classes,
      expected: snapshot.expected,
      collected: snapshot.collected,
      pending: snapshot.pending,
      paid: snapshot.students.filter((x) => x.status === "Paid").length,
      partial: snapshot.students.filter((x) => x.status === "Partially Paid").length,
      unpaid: snapshot.students.filter((x) => x.status === "Unpaid").length,
      paymentsThisMonth: fromPaise(sumPaise(monthRows)),
    };
    ok(res, "Dashboard loaded", { summary, recentPayments, students: snapshot.students });
  } catch (error) {
    next(error);
  }
});

router.get("/students", async (req, res, next) => {
  try {
    if (req.query.page) {
      const data = await getStudentsPage({
        ownerId: req.user.id,
        search: req.query.search,
        filters: { standard: req.query.standard, classId: req.query.classId, academicYear: req.query.academicYear, feeStatus: req.query.feeStatus, enrollmentStatus: req.query.enrollmentStatus },
        page: req.query.page,
        limit: req.query.limit,
        sort: req.query.sort,
      });
      return ok(res, "Students loaded", data);
    }
    const query = owner(req);
    if (req.query.standard) query.standard = req.query.standard;
    if (req.query.division) query.division = req.query.division;
    if (req.query.search)
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { studentId: { $regex: req.query.search, $options: "i" } },
        { mobile: { $regex: req.query.search, $options: "i" } },
        { parentsMobileNumber: { $regex: req.query.search, $options: "i" } },
      ];
    const rows = await Student.find(query).sort({ createdAt: -1 }).lean();
    ok(res, "Students loaded", { students: await Promise.all(rows.map((row) => enrich(row, req.user.id))) });
  } catch (error) {
    next(error);
  }
});
router.post("/students", async (req, res, next) => {
  try {
    const { value: body, errors } = validateAndNormalizeStudent(req.body);
    if (errors.length) return fail(res, errors[0], errors, 422);
    const cls = await ClassModel.findOne({ _id: body.classId, ...owner(req) }).lean();
    if (!cls || cls.standard !== body.standard || cls.division !== body.division || cls.academicYear !== body.academicYear)
      return fail(res, "Academic assignment must match the selected class or batch.", [], 422);
    const latest = await Student.findOne(owner(req)).sort({ studentId: -1 }).select("studentId").lean(),
      initial = Number(latest?.studentId?.match(/\d+$/)?.[0] || 0),
      sequence = await nextSequence(req.user.id, "student", 0, initial);
    const student = await Student.create({ ...body, ownerId: req.user.id, studentId: `STU-${paddedSequence(sequence)}` });
    ok(res, "Student created successfully", { student }, 201);
  } catch (error) {
    next(error);
  }
});
router.get("/students/:id", async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, ...owner(req) })
    .populate("classId", "name batchName standard division academicYear")
    .lean();
  if (!student) return fail(res, "Student was not found.", [], 404);
  const payments = await Payment.find({ studentId: student._id, ...owner(req), ...completedPaymentFilter }).sort({ paymentDate: -1, createdAt: -1 });
  ok(res, "Student loaded", { student: await enrich(student, req.user.id), payments });
});
router.put("/students/:id", async (req, res, next) => {
  try {
    const current = await Student.findOne({ _id: req.params.id, ...owner(req) });
    if (!current) return fail(res, "Student was not found.", [], 404);
    const { value: safe, errors } = validateAndNormalizeStudent({ ...current.toObject(), ...req.body });
    if (errors.length) return fail(res, errors[0], errors, 422);
    const cls = await ClassModel.findOne({ _id: safe.classId, ...owner(req) }).lean();
    if (!cls || cls.standard !== safe.standard || cls.division !== safe.division || cls.academicYear !== safe.academicYear)
      return fail(res, "Academic assignment must match the selected class or batch.", [], 422);
    const billing = await getStudentBillingSummary({ ownerId: req.user.id, studentId: current.id });
    if (safe.finalPayablePaise < billing.totalPaidPaise) return fail(res, `The updated payable fee cannot be below the ₹${billing.totalPaid.toLocaleString("en-IN")} already collected.`, [], 422);
    const student = await Student.findOneAndUpdate({ _id: req.params.id, ...owner(req) }, { $set: safe }, { new: true, runValidators: true });
    ok(res, "Student updated successfully", { student, billing: await getStudentBillingSummary({ ownerId: req.user.id, studentId: student.id }) });
  } catch (error) {
    next(error);
  }
});
router.delete("/students/:id", async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, ...owner(req) });
    if (!student) return fail(res, "Student was not found.", [], 404);
    const [paymentCount, requestCount] = await Promise.all([
      Payment.countDocuments({ studentId: student.id, ...owner(req) }),
      StudentFeeRequest.countDocuments({ studentId: student.id, ...owner(req) }),
    ]);
    if (paymentCount || requestCount)
      return fail(res, "This student has financial history and cannot be deleted. Payment and receipt records have been preserved.", { paymentCount, requestCount }, 409);
    await Promise.all([StudentClassEnrollment.deleteMany({ studentId: student.id, ...owner(req) }), StudentSubjectEnrollment.deleteMany({ studentId: student.id, ...owner(req) })]);
    await student.deleteOne();
    ok(res, "Student deleted successfully. No financial records were affected.", { deletedStudentId: student.id });
  } catch (error) {
    next(error);
  }
});
router.patch("/students/:id/archive", async (req, res, next) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      ...owner(req),
    });

    if (!student) {
      return fail(res, "Student was not found.", [], 404);
    }

    student.isArchived = true;
    await student.save();

    return ok(res, "Student archived successfully.", {
      studentId: student.id,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/students/:id/restore", async (req, res, next) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      ...owner(req),
    });

    if (!student) {
      return fail(res, "Student was not found.", [], 404);
    }

    student.isArchived = false;
    await student.save();

    return ok(res, "Student restored successfully.", {
      studentId: student.id,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/classes", async (req, res) => ok(res, "Classes loaded", { classes: await ClassModel.find(owner(req)).sort({ standard: 1, division: 1 }) }));
router.get("/classes/:id/students.csv", async (req, res, next) => {
  try {
    const cls = await ClassModel.findOne({ _id: req.params.id, ...owner(req) }).lean();
    if (!cls) return fail(res, "Class not found", [], 404);
    const membership = await getActiveClassMembership({ ownerId: req.user.id, classId: cls._id }),
      students = [...membership.students].sort((a, b) => a.name.localeCompare(b.name) || a.studentId.localeCompare(b.studentId)),
      summaries = await getStudentsBillingSummaries({ ownerId: req.user.id, studentIds: students.map((student) => student._id) }),
      csv = buildClassStudentsCsv({ cls, students, summaries }),
      filename = `${cls.name}-${cls.batchName || "Batch"}-Students`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    next(error);
  }
});
router.post("/classes", async (req, res) => {
  const safe = { ...req.body };
  delete safe.ownerId;
  const item = await ClassModel.create({ ...safe, ownerId: req.user.id });
  ok(res, "Class created", { class: item }, 201);
});
router.put("/classes/:id", async (req, res) => {
  const safe = { ...req.body };
  delete safe.ownerId;
  const item = await ClassModel.findOneAndUpdate({ _id: req.params.id, ...owner(req) }, { $set: safe }, { new: true, runValidators: true });
  return item ? ok(res, "Class updated", { class: item }) : fail(res, "Class not found", [], 404);
});

router.delete("/classes/:id", async (req, res, next) => {
  try {
    const activeEnrollment = await StudentClassEnrollment.exists({
      classId: req.params.id,
      status: "active",
      ...owner(req),
    });

    if (activeEnrollment) {
      return fail(res, "Reassign students before deleting this class.", [], 409);
    }

    const item = await ClassModel.findOneAndDelete({
      _id: req.params.id,
      ...owner(req),
    });

    return item ? ok(res, "Class deleted") : fail(res, "Class not found", [], 404);
  } catch (error) {
    next(error);
  }
});

router.get("/payments", async (req, res) => {
  const query = { ...owner(req), ...completedPaymentFilter };
  if (req.query.studentId) query.studentId = req.query.studentId;
  ok(res, "Payments loaded", {
    payments: await Payment.find(query)
      .populate("studentId", "studentId name standard division academicYear finalFees")
      .populate("feeRequestId", "requestNumber")
      .sort({ paymentDate: -1, createdAt: -1 }),
  });
});
router.get("/payments/:id", async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, ...owner(req), ...completedPaymentFilter })
    .populate("studentId")
    .populate("feeRequestId", "requestNumber");
  return payment ? ok(res, "Payment loaded", { payment }) : fail(res, "Payment not found.", [], 404);
});
router.post("/payments", async (req, res, next) => {
  const studentId = req.body?.studentId,
    amountPaise = toPaise(req.body?.amount),
    amount = fromPaise(amountPaise);
  try {
    if (process.env.NODE_ENV === "development")
      console.debug("Payment submission received", { userId: req.user.id, studentId, amount, paymentDate: req.body?.paymentDate, paymentMode: req.body?.paymentMode });
    const clientRequestId = String(req.body?.clientRequestId || "").trim();
    if (clientRequestId) {
      const existing = await Payment.findOne({ ...owner(req), clientRequestId });
      if (existing) {
        const summary = await getStudentBillingSummary({ ownerId: req.user.id, studentId: existing.studentId });
        return ok(res, "Payment already recorded.", { payment: existing, summary, idempotent: true });
      }
    }
    const student = await Student.findOne({ _id: studentId, ...owner(req) });
    if (!student) return fail(res, "Student not found.", [], 404);
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) return fail(res, "Enter a valid payment amount.", [], 422);
    const before = await getStudentBillingSummary({ ownerId: req.user.id, studentId: student.id });
    if (before.remainingAmount <= 0) return fail(res, "This student has already paid the full amount.", [], 422);
    if (amountPaise > toPaise(before.remainingAmount)) return fail(res, `Payment cannot exceed the remaining amount of ₹${before.remainingAmount.toLocaleString("en-IN")}.`, [], 422);
    if (!req.body.paymentDate || Number.isNaN(new Date(req.body.paymentDate).valueOf())) return fail(res, "Payment date is required.", [], 422);
    const paymentMode = normalizeMode(req.body.paymentMode);
    if (!paymentMode) return fail(res, "Select a valid payment mode.", [], 422);
    const year = new Date().getFullYear(),
      [latestReceipt, latestPayment, settings] = await Promise.all([
        Payment.findOne({ ...owner(req), receiptNumber: { $regex: `-${year}-\\d+$` } })
          .sort({ receiptNumber: -1 })
          .select("receiptNumber")
          .lean(),
        Payment.findOne(owner(req)).sort({ paymentId: -1 }).select("paymentId").lean(),
        Settings.findOne(owner(req)),
      ]),
      receiptInitial = Number(latestReceipt?.receiptNumber?.match(/\d+$/)?.[0] || 0),
      paymentInitial = Number(latestPayment?.paymentId?.match(/\d+$/)?.[0] || 0),
      [receiptSequence, paymentSequence] = await Promise.all([nextSequence(req.user.id, "receipt", year, receiptInitial), nextSequence(req.user.id, "payment", year, paymentInitial)]);
    const payment = await Payment.create({
      ownerId: req.user.id,
      studentId: student.id,
      paymentId: `PAY-${paddedSequence(paymentSequence)}`,
      receiptNumber: `${settings?.receiptPrefix || "REC"}-${year}-${paddedSequence(receiptSequence)}`,
      amount,
      amountPaise,
      receiptTotalPayablePaise: before.finalPayablePaise,
      receiptPreviousPaidPaise: before.totalPaidPaise,
      receiptBalanceAfterPaise: Math.max(0, before.remainingPaise - amountPaise),
      paymentDate: req.body.paymentDate,
      paymentMode,
      transactionReference: String(req.body.transactionReference || "").trim(),
      collectedBy: String(req.body.collectedBy || req.user.fullName || "Administrator").trim(),
      notes: String(req.body.notes || "").trim(),
      status: "completed",
      clientRequestId: clientRequestId || undefined,
      createdBy: req.user.id,
    });
    const summary = await getStudentBillingSummary({ ownerId: req.user.id, studentId: student.id });
    ok(
      res,
      "Payment recorded successfully.",
      {
        payment,
        summary,
        previouslyPaid: before.totalPaid,
        currentPayment: amount,
        totalPaid: summary.totalPaid,
        remaining: summary.remainingAmount,
        remainingAmount: summary.remainingAmount,
        status: summary.status,
        paymentStatus: summary.status,
      },
      201,
    );
  } catch (error) {
    console.error(error.code === 11000 ? "Duplicate payment error" : "Create payment failed", {
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      userId: req.user?.id,
      studentId,
      amount,
    });
    if (error.code === 11000 && req.body?.clientRequestId) {
      const existing = await Payment.findOne({ ownerId: req.user.id, clientRequestId: req.body.clientRequestId });
      if (existing) {
        const summary = await getStudentBillingSummary({ ownerId: req.user.id, studentId: existing.studentId });
        return ok(res, "Payment already recorded.", { payment: existing, summary, idempotent: true });
      }
    }
    if (error.code === 11000) {
      const fields = Object.keys(error.keyPattern || {});
      return fail(res, `Duplicate value detected for ${fields.join(", ") || "a payment identifier"}. Run the payment index repair if this is a new installment.`, fields, 409);
    }
    next(error);
  }
});
router.delete("/payments/:id", async (req, res) => {
  const payment = await Payment.findOneAndDelete({ _id: req.params.id, ...owner(req) });
  if (!payment) return fail(res, "Payment not found.", [], 404);
  ok(res, "Payment deleted and balance recalculated", { summary: await getStudentBillingSummary({ ownerId: req.user.id, studentId: payment.studentId }) });
});
router.get("/reports", async (req, res) => {
  const match = { ...owner(req), ...completedPaymentFilter };
  if (req.query.start || req.query.end) {
    match.paymentDate = {};
    if (req.query.start) match.paymentDate.$gte = new Date(req.query.start);
    if (req.query.end) match.paymentDate.$lte = new Date(`${req.query.end}T23:59:59`);
  }
  const payments = await Payment.find(match).populate("studentId", "studentId name standard division");
  ok(res, "Report generated", { payments, total: fromPaise(sumPaise(payments)) });
});
router.get("/settings", async (req, res) => ok(res, "Settings loaded", { settings: await Settings.findOne(owner(req)) }));
router.put("/settings", async (req, res) => {
  const safe = { ...req.body };
  delete safe.ownerId;
  const settings = await Settings.findOneAndUpdate(owner(req), { $set: safe, $setOnInsert: { ownerId: req.user.id } }, { new: true, upsert: true, runValidators: true });
  ok(res, "Settings saved", { settings });
});
export default router;
