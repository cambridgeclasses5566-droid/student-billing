import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

export const paymentQrRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads/payment-qr');
export const allowedPaymentQrTypes = new Map([['image/png', '.png'], ['image/jpeg', '.jpg'], ['image/webp', '.webp']]);
export async function ensurePaymentQrDirectory(ownerId) { const directory = path.join(paymentQrRoot, String(ownerId)); await fs.mkdir(directory, { recursive: true }); return directory; }
export function paymentQrFilename(mimeType) { return `institute-upi-qr-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${allowedPaymentQrTypes.get(mimeType)}`; }
export function paymentQrUrl(ownerId, filename) { return `/uploads/payment-qr/${encodeURIComponent(String(ownerId))}/${encodeURIComponent(filename)}`; }
export async function paymentQrExists(url,ownerId){const prefix=`/uploads/payment-qr/${ownerId}/`;if(!url?.startsWith(prefix))return false;const directory=path.resolve(paymentQrRoot,String(ownerId)),target=path.resolve(directory,path.basename(decodeURIComponent(url)));if(!target.startsWith(`${directory}${path.sep}`))return false;try{await fs.access(target);return true}catch{return false}}
export async function removePaymentQr(url, ownerId) { const prefix = `/uploads/payment-qr/${ownerId}/`; if (!url?.startsWith(prefix)) return; const directory = path.resolve(paymentQrRoot, String(ownerId)), target = path.resolve(directory, path.basename(decodeURIComponent(url))); if (!target.startsWith(`${directory}${path.sep}`)) return; try { await fs.unlink(target); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
