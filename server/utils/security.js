import crypto from "crypto";
import jwt from "jsonwebtoken";
export const hashToken = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
export const randomDigits = (length = 6) => String(crypto.randomInt(0, 10 ** length)).padStart(length, "0");
export const randomToken = () => crypto.randomBytes(32).toString("hex");
export const generateToken = (user) => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "30d" });
export const verifyHmac = (payload, signature, secret) => {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
  } catch {
    return false;
  }
};
