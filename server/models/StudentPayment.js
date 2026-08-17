import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  ownerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  studentId:{type:mongoose.Schema.Types.ObjectId,ref:'Student',required:true,index:true},
  feeRequestId:{type:mongoose.Schema.Types.ObjectId,ref:'StudentFeeRequest',sparse:true},
  clientRequestId:{type:String,trim:true,sparse:true},paymentId:{type:String,required:true},receiptNumber:{type:String,required:true},
  amount:{type:Number,required:true,min:.01},amountPaise:{type:Number,required:true,min:1},paymentDate:{type:Date,required:true},
  receiptTotalPayablePaise:{type:Number,min:0},receiptPreviousPaidPaise:{type:Number,min:0},receiptBalanceAfterPaise:{type:Number,min:0},
  paymentMode:{type:String,enum:['cash','upi','bank_transfer','card','cheque','other'],required:true},
  paymentProvider:String,transactionReference:{type:String,trim:true,default:''},collectedBy:{type:String,required:true},notes:String,
  status:{type:String,enum:['completed','reversed'],default:'completed',index:true},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}
},{timestamps:true});
schema.index({ownerId:1,studentId:1,paymentDate:-1});
schema.index({ownerId:1,receiptNumber:1},{unique:true});
schema.index({ownerId:1,paymentId:1},{unique:true});
schema.index({ownerId:1,clientRequestId:1},{unique:true,partialFilterExpression:{clientRequestId:{$type:'string'}}});
schema.index({ownerId:1,feeRequestId:1},{unique:true,partialFilterExpression:{feeRequestId:{$type:'objectId'}}});
export default mongoose.model('StudentPayment',schema);
