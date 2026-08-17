import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendResetEmail, sendEmail } from "../services/emailService.js";
import { generateToken, hashToken, randomToken } from "../utils/security.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { ok, fail } from "../utils/apiResponse.js";

const router = Router(),
  cookieOptions = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 86400000 };
const errors = (req) =>
  validationResult(req)
    .array()
    .map((item) => ({ field: item.path, message: item.msg }));

router.post("/login", authLimiter, [body("email").isEmail().normalizeEmail(), body("password").isString().notEmpty()], async (req, res, next) => {
  try {
    const validation = errors(req);
    if (validation.length) return fail(res, "Invalid email or password", [], 401);
    const user = await User.findOne({ email: req.body.email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return fail(res, "Invalid email or password", [], 401);
    if (user.accountStatus === "blocked") return fail(res, "This account is not available. Contact support.", [], 403);
    user.lastLoginAt = new Date();
    await user.save();
    res.cookie("token", generateToken(user), cookieOptions);
    ok(res, "Login successful", { user: user.toJSON(), redirect: user.role === "superadmin" ? "/admin/index.html" : "/dashboard" });
  } catch (error) {
    next(error);
  }
});
router.post("/forgot-password", authLimiter, [body("email").isEmail().normalizeEmail()], async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = randomToken();
      user.resetTokenHash = hashToken(token);
      user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60_000);
      await user.save();
      await sendResetEmail(user, `${process.env.CLIENT_URL}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`);
    }
    ok(res, "If an account matches that email, a reset link has been sent.");
  } catch (error) {
    next(error);
  }
});
router.post(
  "/reset-password",
  authLimiter,
  [body("token").isString().notEmpty(), body("email").isEmail().normalizeEmail(), body("password").matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)],
  async (req, res, next) => {
    try {
      const user = await User.findOne({ email: req.body.email, resetTokenHash: hashToken(req.body.token), resetTokenExpiresAt: { $gt: new Date() } }).select(
        "+resetTokenHash +resetTokenExpiresAt +passwordHash",
      );
      if (!user) return fail(res, "Reset link is invalid or expired", [], 400);
      user.passwordHash = await bcrypt.hash(req.body.password, 12);
      user.resetTokenHash = undefined;
      user.resetTokenExpiresAt = undefined;
      await user.save();
      await sendEmail({
        to: user.email,
        subject: "Your Cambridgeclassespassword was changed",
        html: "<p>Your password was changed successfully. Contact support immediately if this was not you.</p>",
      });
      ok(res, "Password reset successfully");
    } catch (error) {
      next(error);
    }
  },
);
router.get("/me", authenticate, (req, res) => ok(res, "Current user", { user: req.user }));
router.post("/logout", (req, res) => {
  res.clearCookie("token", cookieOptions);
  ok(res, "Logged out");
});
export default router;
