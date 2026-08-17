import mongoose from 'mongoose';
const schema=new mongoose.Schema({ownerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},counterType:{type:String,enum:['student','receipt','payment','feeRequest'],required:true},year:{type:Number,required:true},sequence:{type:Number,default:0}},{timestamps:true});
schema.index({ownerId:1,counterType:1,year:1},{unique:true});
export default mongoose.model('Counter',schema);
