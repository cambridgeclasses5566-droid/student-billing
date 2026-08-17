import crypto from 'crypto';export const publicId=prefix=>`${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
