import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import studentBillingRoutes from "./routes/studentBillingRoutes.js";
import onboardingRoutes from "./routes/onboardingRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import classSubjectRoutes from "./routes/classSubjectRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { uploadsRoot } from "./services/logoStorageService.js";
import { paymentQrRoot } from "./services/paymentQrStorageService.js";

const app = express(),
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client");
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],

        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],

        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],

        imgSrc: ["'self'", "data:", "blob:"],

        connectSrc: ["'self'", "https://cdnjs.cloudflare.com"],

        objectSrc: ["'none'"],

        baseUri: ["'self'"],

        frameAncestors: ["'self'"],

        formAction: ["'self'"],
      },
    },

    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
if (process.env.NODE_ENV !== "test") app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  "/uploads/logos",
  express.static(uploadsRoot, {
    dotfiles: "deny",
    fallthrough: false,
    index: false,
    maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosn"),
  }),
);
app.use(
  "/uploads/payment-qr",
  express.static(paymentQrRoot, {
    dotfiles: "deny",
    fallthrough: false,
    index: false,
    maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosn"),
  }),
);
app.use("/api", apiLimiter);
app.get("/api/health", (req, res) => res.json({ success: true, message: "CambridgeclassesAPI is healthy", data: { environment: process.env.NODE_ENV || "development" } }));
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/students", studentBillingRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classSubjectRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/admin", adminRoutes);
app.get("/", (req, res) => res.redirect(302, "/login"));
app.get(["/signup", "/signup.html", "/register", "/register.html", "/pricing", "/pricing.html", "/payment", "/payment.html", "/subscription", "/subscription.html", "/verify-otp.html"], (req, res) =>
  res.redirect(302, "/login"),
);
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(root, "dashboard", "index.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(root, "login.html"));
});

app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(root, "forgot-password.html"));
});

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(root, "reset-password.html"));
});
app.use(express.static(root, { extensions: ["html"] }));
app.use("/api", notFound);
app.get("*", (req, res) => res.sendFile(path.join(root, "index.html")));
app.use(errorHandler);
export default app;
