import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Student from '../models/Student.js';
import ClassModel from '../models/Class.js';
import { toPaise, fromPaise } from '../utils/money.js';

const dryRun=process.argv.includes('--dry-run');
await connectDB();
const students=await Student.find({}).select('+guardianName').lean();let updated=0,skipped=0;
for(const student of students){
  const cls=student.classId&&await ClassModel.findById(student.classId).lean(),totalFeesPaise=Number.isInteger(student.totalFeesPaise)?student.totalFeesPaise:toPaise(student.totalFees||0),discountPaise=Number.isInteger(student.discountPaise)?student.discountPaise:toPaise(student.discount||0),finalPayablePaise=Math.max(0,totalFeesPaise-discountPaise),fallbackParent=student.guardianName||'Migration required',set={totalFeesPaise,discountPaise,finalPayablePaise,totalFees:fromPaise(totalFeesPaise),discount:fromPaise(discountPaise),finalFees:fromPaise(finalPayablePaise),mobile:student.mobile||'',fatherName:student.fatherName||fallbackParent,motherName:student.motherName||fallbackParent,parentsMobileNumber:student.parentsMobileNumber||student.mobile||'0000000000',email:student.email||`${student.studentId.toLowerCase()}@migration.invalid`,address:student.address||'Migration required',aadhaarNumber:student.aadhaarNumber||`9${String(student._id).replace(/\D/g,'').slice(-11).padStart(11,'0')}`,age:Number.isInteger(student.age)?student.age:0,dob:student.dob||student.admissionDate||new Date('2000-01-01'),classId:student.classId||cls?._id,standard:student.standard||cls?.standard,division:student.division||cls?.division,academicYear:student.academicYear||cls?.academicYear};
  if(!set.classId){skipped++;continue}if(!dryRun)await Student.collection.updateOne({_id:student._id},{$set:set,$unset:{guardianName:''}});updated++;
}
if(!dryRun){await Promise.all(['attendancerecords','attendancesessions','attendancechangelogs'].map(name=>mongoose.connection.db.dropCollection(name).catch(()=>{})));}
console.log(JSON.stringify({dryRun,studentsUpdated:updated,studentsSkippedWithoutClass:skipped,attendanceCollectionsDropped:!dryRun},null,2));
await mongoose.disconnect();
