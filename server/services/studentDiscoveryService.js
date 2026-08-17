import mongoose from "mongoose";
import Student from "../models/Student.js";
import ClassModel from "../models/Class.js";

const objectId = (value) => (mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null);
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const searchMatch = (search) => {
  if (!String(search || "").trim()) return {};
  const term = new RegExp(escapeRegex(String(search).trim()), "i");
  return { $or: [{ name: term }, { studentId: term }, { mobile: term }, { parentsMobileNumber: term }, { fatherName: term }, { motherName: term }, { email: term }] };
};
const billingStages = (ownerId) => [
  {
    $lookup: {
      from: "studentpayments",
      let: { studentId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $and: [{ $eq: ["$ownerId", ownerId] }, { $eq: ["$studentId", "$$studentId"] }, { $or: [{ $eq: ["$status", "completed"] }, { $eq: [{ $type: "$status" }, "missing"] }] }] },
          },
        },
        { $group: { _id: null, totalPaidPaise: { $sum: { $ifNull: ["$amountPaise", { $round: [{ $multiply: ["$amount", 100] }, 0] }] } } } },
      ],
      as: "paymentSummary",
    },
  },
  {
    $set: {
      finalPayablePaise: { $ifNull: ["$finalPayablePaise", { $round: [{ $multiply: ["$finalFees", 100] }, 0] }] },
      totalPaidPaise: { $ifNull: [{ $first: "$paymentSummary.totalPaidPaise" }, 0] },
    },
  },
  { $set: { remainingPaise: { $max: [0, { $subtract: ["$finalPayablePaise", "$totalPaidPaise"] }] }, totalPaid: { $divide: ["$totalPaidPaise", 100] } } },
  {
    $set: {
      remaining: { $divide: ["$remainingPaise", 100] },
      billing: { finalPayablePaise: "$finalPayablePaise", totalPaidPaise: "$totalPaidPaise", remainingPaise: "$remainingPaise" },
      status: {
        $switch: {
          branches: [
            { case: { $gte: ["$totalPaidPaise", "$finalPayablePaise"] }, then: "Paid" },
            { case: { $gt: ["$totalPaidPaise", 0] }, then: "Partially Paid" },
          ],
          default: "Unpaid",
        },
      },
    },
  },
];

export async function getStudentsAvailableForClass({ ownerId, classId, search = "", filters = {}, page = 1, limit = 25 }) {
  const ownerObjectId = objectId(ownerId),
    classObjectId = objectId(classId),
    cls = classObjectId && (await ClassModel.findOne({ _id: classObjectId, ownerId: ownerObjectId }).lean());
  if (!cls) throw Object.assign(new Error("Class not found."), { status: 404 });
  const safePage = Math.max(1, Number(page) || 1),
    safeLimit = [25, 50, 100].includes(Number(limit)) ? Number(limit) : 25,
    match = { ownerId: ownerObjectId, ...searchMatch(search) };
  match.isArchived = { $ne: true };
  if (filters.standard) match.standard = filters.standard;
  if (filters.academicYear) match.academicYear = filters.academicYear;
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "studentclassenrollments",
        let: { studentId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$ownerId", ownerObjectId] }, { $eq: ["$studentId", "$$studentId"] }, { $eq: ["$status", "active"] }] } } },
          { $sort: { joinedAt: -1 } },
          { $limit: 1 },
        ],
        as: "activeEnrollments",
      },
    },
    { $set: { activeEnrollment: { $first: "$activeEnrollments" } } },
    {
      $lookup: {
        from: "classes",
        localField: "activeEnrollment.classId",
        foreignField: "_id",
        pipeline: [{ $match: { ownerId: ownerObjectId } }, { $project: { name: 1, standard: 1, division: 1 } }],
        as: "currentClasses",
      },
    },
    {
      $set: {
        currentClass: { $first: "$currentClasses" },
        enrollmentStatus: {
          $switch: {
            branches: [
              { case: { $eq: ["$activeEnrollment.classId", classObjectId] }, then: "already-here" },
              { case: { $ne: [{ $type: "$activeEnrollment" }, "missing"] }, then: "another-class" },
            ],
            default: "unassigned",
          },
        },
      },
    },
    ...billingStages(ownerObjectId),
  ];
  const enrollment = filters.enrollmentStatus || "unassigned";
  if (enrollment !== "all") pipeline.push({ $match: { enrollmentStatus: enrollment } });
  if (objectId(filters.currentClassId)) pipeline.push({ $match: { "activeEnrollment.classId": objectId(filters.currentClassId) } });
  if (filters.feeStatus) pipeline.push({ $match: { status: filters.feeStatus } });
  pipeline.push(
    { $sort: { name: 1, studentId: 1 } },
    { $facet: { rows: [{ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }, { $project: { activeEnrollments: 0, currentClasses: 0, paymentSummary: 0 } }], count: [{ $count: "total" }] } },
  );
  const [result] = await Student.aggregate(pipeline),
    total = result?.count?.[0]?.total || 0;
  return { class: cls, students: result?.rows || [], pagination: { page: safePage, limit: safeLimit, total, pages: Math.max(1, Math.ceil(total / safeLimit)) } };
}

export async function getStudentsPage({ ownerId, search = "", filters = {}, page = 1, limit = 25, sort = "name" }) {
  const ownerObjectId = objectId(ownerId),
    safePage = Math.max(1, Number(page) || 1),
    safeLimit = [25, 50, 100].includes(Number(limit)) ? Number(limit) : 25,
    match = { ownerId: ownerObjectId, ...searchMatch(search) };
  if (filters.enrollmentStatus === "archived") {
    match.isArchived = true;
  } else {
    match.isArchived = { $ne: true };
  }
  if (filters.standard) match.standard = filters.standard;
  if (filters.academicYear) match.academicYear = filters.academicYear;
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "studentclassenrollments",
        let: { studentId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$ownerId", ownerObjectId] }, { $eq: ["$studentId", "$$studentId"] }, { $eq: ["$status", "active"] }] } } },
          { $sort: { joinedAt: -1 } },
          { $limit: 1 },
        ],
        as: "activeEnrollments",
      },
    },
    { $set: { activeEnrollment: { $first: "$activeEnrollments" } } },
    {
      $lookup: {
        from: "classes",
        localField: "activeEnrollment.classId",
        foreignField: "_id",
        pipeline: [{ $match: { ownerId: ownerObjectId } }, { $project: { name: 1, standard: 1, division: 1 } }],
        as: "currentClasses",
      },
    },
    { $set: { currentClass: { $first: "$currentClasses" }, enrollmentStatus: { $cond: [{ $eq: [{ $type: "$activeEnrollment" }, "missing"] }, "unassigned", "active"] } } },
    ...billingStages(ownerObjectId),
  ];
  if (objectId(filters.classId)) pipeline.push({ $match: { "activeEnrollment.classId": objectId(filters.classId) } });
  if (filters.feeStatus) pipeline.push({ $match: { status: filters.feeStatus } });
  if (filters.enrollmentStatus && filters.enrollmentStatus !== "archived") {
    pipeline.push({
      $match: {
        enrollmentStatus: filters.enrollmentStatus,
      },
    });
  }
  const sortStage = sort === "newest" ? { createdAt: -1 } : sort === "studentId" ? { studentId: 1 } : { name: 1, studentId: 1 };
  pipeline.push(
    { $sort: sortStage },
    { $facet: { rows: [{ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }, { $project: { activeEnrollments: 0, currentClasses: 0, paymentSummary: 0 } }], count: [{ $count: "total" }] } },
  );
  const [result] = await Student.aggregate(pipeline),
    total = result?.count?.[0]?.total || 0;
  return { students: result?.rows || [], pagination: { page: safePage, limit: safeLimit, total, pages: Math.max(1, Math.ceil(total / safeLimit)) } };
}
