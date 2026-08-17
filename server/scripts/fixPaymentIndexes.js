import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDatabase} from '../config/database.js';
import Payment from '../models/StudentPayment.js';
const invalid=index=>index.unique===true&&(['{"studentId":1}','{"ownerId":1,"studentId":1}'].includes(JSON.stringify(index.key))||(index.key?.ownerId===1&&['feeRequestId','clientRequestId'].some(field=>index.key?.[field]===1&&!index.partialFilterExpression))||(['transactionReference','reference'].some(field=>index.key?.[field]===1)&&!(index.key?.ownerId===1&&index.partialFilterExpression?.paymentMode==='upi')));
try{
  await connectDatabase();await Payment.createCollection();const collection=Payment.collection,indexes=await collection.indexes();
  console.log('Current indexes:',indexes.map(index=>index.name).join(', '));
  for(const index of indexes)if(invalid(index)){console.log('Found incorrect index:',index.name,'key:',JSON.stringify(index.key),'unique:',index.unique);await collection.dropIndex(index.name);console.log(`Dropped incorrect index: ${index.name}`)}
  await collection.createIndex({ownerId:1,studentId:1,paymentDate:-1},{name:'ownerId_1_studentId_1_paymentDate_-1'});
  await collection.createIndex({ownerId:1,receiptNumber:1},{name:'ownerId_1_receiptNumber_1',unique:true});
  await collection.createIndex({ownerId:1,paymentId:1},{name:'ownerId_1_paymentId_1',unique:true});
  await collection.createIndex({ownerId:1,clientRequestId:1},{name:'ownerId_1_clientRequestId_1',unique:true,partialFilterExpression:{clientRequestId:{$type:'string'}}});
  await collection.createIndex({ownerId:1,feeRequestId:1},{name:'ownerId_1_feeRequestId_1',unique:true,partialFilterExpression:{feeRequestId:{$type:'objectId'}}});
  console.log('Created correct index: ownerId_1_studentId_1_paymentDate_-1');
  console.log('Payment indexes fixed successfully');
}catch(error){console.error('Payment index maintenance failed:',error.message);process.exitCode=1}finally{await mongoose.disconnect()}
