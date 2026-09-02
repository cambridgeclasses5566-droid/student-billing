import { Router } from "express";
import Payment from "../models/StudentPayment.js";
import Settings from "../models/InstituteSettings.js";
import { ok, fail } from "../utils/apiResponse.js";

const router = Router();

router.get("/:shareId", async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      receiptShareId: req.params.shareId,
      receiptShareExpiresAt: { $gt: new Date() },
      status: { $ne: "reversed" },
    })
      .populate("studentId", "studentId name mobile email admissionDate className standard division academicYear")
      .lean();

    if (!payment) {
      return fail(res, "This receipt link is invalid or has expired.", [], 404);
    }

    const settings = await Settings.findOne({
      ownerId: payment.ownerId,
    }).lean();

    return ok(res, "Receipt loaded", {
      receipt: {
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        transactionReference: payment.transactionReference || "",
        collectedBy: payment.collectedBy || "",
        notes: payment.notes || "",

        totalPayable: Number(payment.receiptTotalPayablePaise || 0) / 100,

        previouslyPaid: Number(payment.receiptPreviousPaidPaise || 0) / 100,

        balanceAfter: Number(payment.receiptBalanceAfterPaise || 0) / 100,

        student: payment.studentId
          ? {
              studentId: payment.studentId.studentId,
              name: payment.studentId.name,
              mobile: payment.studentId.mobile || "",
              email: payment.studentId.email || "",
              admissionDate: payment.studentId.admissionDate || "",
              className: payment.studentId.className || "",
              standard: payment.studentId.standard || "",
              division: payment.studentId.division || "",
              academicYear: payment.studentId.academicYear || "",
            }
          : null,

        institute: {
          name: settings?.instituteName || "Cambridge Classes",
          address: settings?.address || "",
          phone: settings?.phone || settings?.mobile || "",
          email: settings?.email || "",

          logoUrl: settings?.logoUrl || "",

          signatureUrl: settings?.authorizedSignatureUrl || settings?.signatureUrl || "",

          stampUrl: settings?.instituteStampUrl || settings?.stampUrl || "",

          receiptTerms: settings?.receiptTerms || "",
          receiptFooter: settings?.receiptFooter || "",
          authorizedSignatory: settings?.authorizedSignatory || "",

          receiptThankYouHeading: settings?.receiptThankYouHeading || "",

          receiptThankYouMessage: settings?.receiptThankYouMessage || "",
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
