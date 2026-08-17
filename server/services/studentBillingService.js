import mongoose from 'mongoose';
import Student from '../models/Student.js';
import StudentPayment from '../models/StudentPayment.js';
import {toPaise,fromPaise,sumPaise} from '../utils/money.js';

export const completedPaymentFilter = { $or: [{ status: 'completed' }, { status: { $exists: false } }] };
const objectId = value => value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);
const statusFor = (totalPaid, remainingAmount) => totalPaid === 0 ? 'Unpaid' : remainingAmount === 0 ? 'Paid' : 'Partially Paid';
export const studentFinalPayablePaise=student=>Number.isInteger(student?.finalPayablePaise)?student.finalPayablePaise:toPaise(student?.finalFees||0);
export const paymentAmountPaiseExpression={$ifNull:['$amountPaise',{$round:[{$multiply:['$amount',100]},0]}]};

export async function getStudentsBillingSummaries({ownerId,studentIds=[]}){
  const ownerObjectId=objectId(ownerId),ids=studentIds.map(objectId),[students,totals]=await Promise.all([
    Student.find({ownerId:ownerObjectId,_id:{$in:ids}}).lean(),
    StudentPayment.aggregate([{$match:{ownerId:ownerObjectId,studentId:{$in:ids},...completedPaymentFilter}},{$group:{_id:'$studentId',totalPaidPaise:{$sum:paymentAmountPaiseExpression},paymentCount:{$sum:1}}}])
  ]),paymentMap=new Map(totals.map(item=>[String(item._id),item]));
  return new Map(students.map(student=>{const payment=paymentMap.get(String(student._id)),finalPayablePaise=studentFinalPayablePaise(student),totalPaidPaise=Number(payment?.totalPaidPaise||0),remainingPaise=Math.max(finalPayablePaise-totalPaidPaise,0);return[String(student._id),{finalPayablePaise,totalPaidPaise,remainingPaise,status:statusFor(totalPaidPaise,remainingPaise),paymentCount:payment?.paymentCount||0,finalPayableFees:fromPaise(finalPayablePaise),totalPaid:fromPaise(totalPaidPaise),remainingAmount:fromPaise(remainingPaise)}]}));
}

export async function getStudentBillingSummary({ ownerId, studentId, session = null }) {
  const ownerObjectId=objectId(ownerId),studentObjectId=objectId(studentId),student=await Student.findOne({_id:studentObjectId,ownerId:ownerObjectId}).session(session).lean();
  if(!student)return null;
  const payments=await StudentPayment.find({ownerId:ownerObjectId,studentId:studentObjectId,...completedPaymentFilter}).sort({paymentDate:1,createdAt:1,_id:1}).session(session).lean();
  const totalPaidPaise=sumPaise(payments),finalPayablePaise=studentFinalPayablePaise(student),remainingPaise=Math.max(finalPayablePaise-totalPaidPaise,0),totalPaid=fromPaise(totalPaidPaise),finalPayableFees=fromPaise(finalPayablePaise),remainingAmount=fromPaise(remainingPaise);
  return{finalPayablePaise,totalPaidPaise,remainingPaise,finalPayableFees,totalPaid,remainingAmount,status:statusFor(totalPaidPaise,remainingPaise),paymentCount:payments.length,latestPayment:payments.at(-1)||null};
}

export async function getOwnerBillingSnapshot(ownerId) {
  const ownerObjectId=objectId(ownerId),students=await Student.find({ownerId:ownerObjectId}).lean(),summaries=await getStudentsBillingSummaries({ownerId:ownerObjectId,studentIds:students.map(s=>s._id)}),rows=students.map(student=>{const billing=summaries.get(String(student._id));return{...student,billing,...billing,remaining:billing.remainingAmount}}),expectedPaise=rows.reduce((sum,row)=>sum+row.finalPayablePaise,0),collectedPaise=rows.reduce((sum,row)=>sum+row.totalPaidPaise,0),pendingPaise=rows.reduce((sum,row)=>sum+row.remainingPaise,0);
  return{students:rows,expected:fromPaise(expectedPaise),collected:fromPaise(collectedPaise),pending:fromPaise(pendingPaise),expectedPaise,collectedPaise,pendingPaise};
}
export function paymentStatus(totalPaid,remainingAmount){return statusFor(totalPaid,remainingAmount)}
