import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    /* =========================
       Institute Information
    ========================== */

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    instituteName: String,
    logoUrl: String,
    signatureUrl: {
      type: String,
      default: "",
    },
    stampUrl: {
      type: String,
      default: "",
    },
    address: String,
    mobile: String,
    email: String,

    /* =========================
       Receipt Settings
    ========================== */

    receiptTitle: {
      type: String,
      default: "Fee Receipt",
    },

    receiptPrefix: {
      type: String,
      default: "REC",
    },

    receiptThankYouHeading: {
      type: String,
      default: "Thank you for your payment!",
    },

    receiptThankYouMessage: {
      type: String,
      default: "We appreciate your trust in {Institute Name}. Please keep this receipt for your records.",
    },

    receiptTerms: {
      type: String,
      default: "",
    },

    receiptFooter: {
      type: String,
      default: "This is a computer-generated receipt. No physical signature is required.",
    },

    /* =========================
       General Settings
    ========================== */

    currency: {
      type: String,
      default: "INR",
    },

    academicYear: String,

    authorizedSignatory: String,

    timeZone: {
      type: String,
      default: "Asia/Kolkata",
    },

    dateFormat: {
      type: String,
      default: "DD/MM/YYYY",
    },

    /* =========================
       Payment Account
    ========================== */

    paymentAccountName: String,

    upiId: String,

    upiMerchantName: String,

    accountHolderName: String,

    bankName: String,

    paymentMobile: String,

    upiQrImageUrl: String,

    upiQrType: {
      type: String,
      enum: ["uploaded", "exact"],
      default: "uploaded",
    },

    defaultPaymentNote: {
      type: String,
      default: "Student fee payment",
    },

    /* =========================
       Student UPI Payments
    ========================== */

    enableStudentUpiPayments: {
      type: Boolean,
      default: false,
    },

    showGooglePayButton: {
      type: Boolean,
      default: true,
    },

    showUpiQrCode: {
      type: Boolean,
      default: true,
    },

    requirePaymentProof: {
      type: Boolean,
      default: false,
    },

    requireUtrAfterPayment: {
      type: Boolean,
      default: true,
    },

    paymentInstructions: String,

    paymentAccountStatus: {
      type: String,
      enum: ["not_configured", "pending_verification", "verified", "disabled"],
      default: "not_configured",
    },

    /* =========================
       Attendance Settings
    ========================== */

    countLateAsPresent: {
      type: Boolean,
      default: true,
    },

    countLeaveInTotal: {
      type: Boolean,
      default: false,
    },

    countLeaveAsAttended: {
      type: Boolean,
      default: false,
    },

    lowAttendanceThreshold: {
      type: Number,
      default: 75,
      min: 0,
      max: 100,
    },

    consecutiveAbsenceAlertCount: {
      type: Number,
      default: 3,
      min: 1,
      max: 30,
    },

    defaultAttendanceStatus: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      default: "present",
    },

    allowDraftAttendance: {
      type: Boolean,
      default: true,
    },

    attendanceEditPermission: {
      type: String,
      enum: ["admin", "disabled"],
      default: "admin",
    },
  },
  {
    timestamps: true,
  },
);

/* =========================
   Indexes
========================== */

schema.index(
  {
    ownerId: 1,
  },
  {
    unique: true,
  },
);

/* =========================
   Model
========================== */

export default mongoose.model("InstituteSettings", schema);
