export function formatCurrency(amount){return `₹${Number(amount||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})}`}
