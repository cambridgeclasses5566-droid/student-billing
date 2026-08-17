import Razorpay from 'razorpay';
let instance;export function getRazorpay(){if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)throw Object.assign(new Error('Razorpay is not configured'),{status:503});return instance??=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET})}
