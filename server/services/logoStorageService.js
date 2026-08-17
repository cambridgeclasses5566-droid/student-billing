import fs from 'fs/promises';import path from 'path';import crypto from 'crypto';import {fileURLToPath} from 'url';
export const uploadsRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../uploads/logos');
export const allowedLogoTypes=new Map([['image/png','.png'],['image/jpeg','.jpg'],['image/webp','.webp']]);
export function userLogoDirectory(userId){return path.join(uploadsRoot,String(userId))}
export async function ensureUserLogoDirectory(userId){const dir=userLogoDirectory(userId);await fs.mkdir(dir,{recursive:true});return dir}
export function uniqueLogoFilename(mimeType){return `institute-logo-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${allowedLogoTypes.get(mimeType)}`}
export function publicLogoUrl(userId,filename){return `/uploads/logos/${encodeURIComponent(String(userId))}/${encodeURIComponent(filename)}`}
export async function removeLocalLogo(logoUrl,userId){if(!logoUrl?.startsWith(`/uploads/logos/${userId}/`))return;const filename=path.basename(decodeURIComponent(logoUrl));const dir=userLogoDirectory(userId),target=path.resolve(dir,filename);if(!target.startsWith(path.resolve(dir)+path.sep))return;try{await fs.unlink(target)}catch(error){if(error.code!=='ENOENT')throw error}}
