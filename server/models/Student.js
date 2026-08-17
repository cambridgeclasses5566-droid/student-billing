import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 120 },
    dob: { type: Date, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    address: { type: String, required: true, trim: true },
    aadhaarNumber: { type: String, required: true, trim: true, match: /^\d{12}$/ },
    mobile: {
      type: String,
      default: "",
      trim: true,
      validate: { validator: (value) => !value || /^[6-9][0-9]{9}$/.test(value), message: "Student Mobile Number must be empty or a valid 10-digit Indian mobile number" },
    },
    academicYear: { type: String, required: true, trim: true },
    standard: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    division: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, required: true, trim: true },
    parentsMobileNumber: { type: String, required: true, trim: true, match: /^[6-9][0-9]{9}$/ },
    admissionDate: { type: Date, required: true },
    totalFees: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    finalFees: { type: Number, required: true, min: 0 },
    totalFeesPaise: { type: Number, required: true, min: 0 },
    discountPaise: { type: Number, required: true, min: 0 },
    finalPayablePaise: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Retained temporarily for migration compatibility; active code does not expose it.
    guardianName: { type: String, select: false },
  },
  { timestamps: true },
);

schema.index({ ownerId: 1, studentId: 1 }, { unique: true });
schema.index({ ownerId: 1, name: 1 });
schema.index({ ownerId: 1, mobile: 1 });
schema.index({ ownerId: 1, aadhaarNumber: 1 }, { unique: true });

export default mongoose.model("Student", schema);
