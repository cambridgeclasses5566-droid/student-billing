import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDatabase} from '../config/database.js';
import Student from '../models/Student.js';
import StudentPayment from '../models/StudentPayment.js';
import {rupeesToPaise} from '../utils/money.js';

const dryRun=process.argv.includes('--dry-run');
try{
  await connectDatabase();
  const [students,payments]=await Promise.all([Student.find({$or:[{totalFeesPaise:{$exists:false}},{discountPaise:{$exists:false}},{finalPayablePaise:{$exists:false}}]}).lean(),StudentPayment.find({amountPaise:{$exists:false}}).lean()]);
  console.log(`${dryRun?'DRY RUN: ':''}${students.length} students and ${payments.length} payments need paise fields.`);
  if(!dryRun){
    if(students.length)await Student.bulkWrite(students.map(student=>({updateOne:{filter:{_id:student._id},update:{$set:{totalFeesPaise:rupeesToPaise(student.totalFees),discountPaise:rupeesToPaise(student.discount||0),finalPayablePaise:rupeesToPaise(student.finalFees)}}}})));
    if(payments.length)await StudentPayment.bulkWrite(payments.map(payment=>({updateOne:{filter:{_id:payment._id},update:{$set:{amountPaise:rupeesToPaise(payment.amount)}}}})));
    console.log('Money-to-paise migration completed. Historical rupee values were preserved exactly as stored.');
  }
}catch(error){console.error('Money-to-paise migration failed:',error.message);process.exitCode=1}finally{await mongoose.disconnect()}
