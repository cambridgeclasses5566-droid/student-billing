import Counter from '../models/Counter.js';
export async function nextSequence(ownerId,counterType,year=new Date().getFullYear(),initialSequence=0){const query={ownerId,counterType,year};let counter=await Counter.findOne(query);if(!counter){try{counter=await Counter.create({...query,sequence:initialSequence+1});return counter.sequence}catch(error){if(error?.code!==11000)throw error}}counter=await Counter.findOneAndUpdate(query,{$inc:{sequence:1}},{new:true});return counter.sequence}
export const paddedSequence=(value,width=4)=>String(value).padStart(width,'0');
