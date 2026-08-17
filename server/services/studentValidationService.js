import { toPaise, fromPaise } from '../utils/money.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^[6-9][0-9]{9}$/;
const aadhaarPattern = /^\d{12}$/;
const text = value => String(value ?? '').trim();

export function validateAndNormalizeStudent(input, { partial = false } = {}) {
  const body = { ...input }, errors = [];
  const required = ['name', 'age', 'dob', 'email', 'address', 'aadhaarNumber', 'academicYear', 'standard', 'classId', 'division', 'fatherName', 'motherName', 'parentsMobileNumber', 'admissionDate', 'totalFees'];
  if (!partial) required.forEach(field => {
    if (body[field] === undefined || body[field] === null || text(body[field]) === '') errors.push(`${field} is required`);
  });
  ['name', 'email', 'address', 'aadhaarNumber', 'mobile', 'academicYear', 'standard', 'division', 'fatherName', 'motherName', 'parentsMobileNumber', 'notes'].forEach(field => {
    if (field in body) body[field] = text(body[field]);
  });
  if ('email' in body && body.email && !emailPattern.test(body.email)) errors.push('Enter a valid email address');
  if ('aadhaarNumber' in body && !aadhaarPattern.test(body.aadhaarNumber)) errors.push('Aadhaar Number must contain exactly 12 digits');
  if ('mobile' in body && body.mobile && !mobilePattern.test(body.mobile)) errors.push('Enter a valid 10-digit Student Mobile Number');
  if ('parentsMobileNumber' in body && !mobilePattern.test(body.parentsMobileNumber)) errors.push('Enter a valid 10-digit Parents Mobile Number');
  if ('age' in body) {
    body.age = Number(body.age);
    if (!Number.isInteger(body.age) || body.age < 0 || body.age > 120) errors.push('Age must be a whole number between 0 and 120');
  }
  for (const field of ['dob', 'admissionDate']) if (field in body && Number.isNaN(new Date(body[field]).valueOf())) errors.push(`${field} must be a valid date`);

  if ('totalFees' in body || 'discount' in body) {
    const totalFeesPaise = toPaise(body.totalFees), discountPaise = toPaise(body.discount || 0);
    if (!Number.isInteger(totalFeesPaise) || totalFeesPaise < 0) errors.push('Total Fees must be a valid non-negative amount');
    if (!Number.isInteger(discountPaise) || discountPaise < 0) errors.push('Discount must be a valid non-negative amount');
    if (Number.isInteger(totalFeesPaise) && Number.isInteger(discountPaise) && discountPaise > totalFeesPaise) errors.push('Discount cannot exceed Total Fees');
    if (Number.isInteger(totalFeesPaise) && totalFeesPaise >= 0 && Number.isInteger(discountPaise) && discountPaise >= 0 && discountPaise <= totalFeesPaise) {
      Object.assign(body, { totalFeesPaise, discountPaise, finalPayablePaise: totalFeesPaise - discountPaise, totalFees: fromPaise(totalFeesPaise), discount: fromPaise(discountPaise), finalFees: fromPaise(totalFeesPaise - discountPaise) });
    }
  }
  for (const field of ['ownerId', 'studentId', 'guardianName']) delete body[field];
  return { value: body, errors };
}
