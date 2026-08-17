export const rupeesToPaise=value=>{const number=Number(value);if(!Number.isFinite(number))throw new Error('Invalid money value');return Math.round(number*100)};
export const paiseToRupees=value=>Number(value||0)/100;
export const formatPaise=paise=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:Number(paise)%100===0?0:2,maximumFractionDigits:2}).format(paiseToRupees(paise));
export const toPaise=value=>{try{return rupeesToPaise(value)}catch{return NaN}};
export const fromPaise=paiseToRupees;
export const sumPaise=values=>values.reduce((sum,value)=>sum+(Number.isInteger(value?.amountPaise)?value.amountPaise:toPaise(value?.amount||0)),0);
