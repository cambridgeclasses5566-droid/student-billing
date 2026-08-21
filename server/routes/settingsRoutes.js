import { Router } from "express";
import multer from "multer";

import Settings from "../models/InstituteSettings.js";

import { authenticate, requireActiveSubscription } from "../middleware/auth.js";

import { ok, fail } from "../utils/apiResponse.js";

import { allowedLogoTypes, uploadLogoToBlob, removeStoredLogo } from "../services/logoStorageService.js";

import { initializeInstituteWorkspace } from "../services/workspaceService.js";

import { isValidUpiId } from "../services/upiService.js";

const router = Router();

router.use(authenticate, requireActiveSubscription);

/* =========================
   Logo Upload
========================= */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    if (allowedLogoTypes.has(file.mimetype)) {
      return cb(null, true);
    }

    return cb(
      Object.assign(new Error("Logo must be a PNG, JPG, JPEG, or WebP image."), {
        status: 422,
      }),
    );
  },
});

/* =========================
   Get Settings
========================= */

router.get("/", async (req, res) => {
  const settings = await initializeInstituteWorkspace(req.user.id, req.user.instituteName);

  ok(res, "Settings loaded", {
    settings,
  });
});

/* =========================
   Update Settings
========================= */

router.put("/", async (req, res) => {
  const allowed = [
    "instituteName",
    "address",
    "mobile",
    "email",

    "receiptTitle",
    "receiptPrefix",
    "receiptThankYouHeading",
    "receiptThankYouMessage",
    "receiptTerms",
    "receiptFooter",

    "currency",
    "academicYear",
    "authorizedSignatory",
    "timeZone",
    "dateFormat",

    "paymentAccountName",
    "upiId",
    "upiMerchantName",

    "accountHolderName",
    "bankName",
    "paymentMobile",

    "defaultPaymentNote",

    "enableStudentUpiPayments",
    "showGooglePayButton",
    "showUpiQrCode",
    "requirePaymentProof",

    "paymentInstructions",
  ];

  const safe = {};

  allowed.forEach((key) => {
    if (key in req.body) {
      safe[key] = req.body[key];
    }
  });

  if (safe.upiId && !isValidUpiId(safe.upiId)) {
    return fail(res, "Enter a valid UPI ID such as name@bank or mobile@upi.", [], 422);
  }

  const current = await Settings.findOne({
    ownerId: req.user.id,
  });

  if ("upiId" in safe && safe.upiId !== current?.upiId) {
    safe.paymentAccountStatus = safe.upiId ? "pending_verification" : "not_configured";
  }

  if (safe.enableStudentUpiPayments === false) {
    safe.paymentAccountStatus = "disabled";
  }

  const settings = await Settings.findOneAndUpdate(
    {
      ownerId: req.user.id,
    },

    {
      $set: safe,

      $setOnInsert: {
        ownerId: req.user.id,
      },
    },

    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  ok(res, "Settings saved", {
    settings,
  });
});

/* =========================
   Confirm UPI
========================= */

router.post("/confirm-upi", async (req, res) => {
  const settings = await Settings.findOne({
    ownerId: req.user.id,
  });

  if (!settings?.upiId) {
    return fail(res, "Configure a valid UPI ID first.", [], 422);
  }

  if (!req.body.confirmed) {
    return fail(res, "Confirm that you checked this UPI ID using a test payment.", [], 422);
  }

  settings.paymentAccountStatus = "verified";

  settings.enableStudentUpiPayments = true;

  await settings.save();

  ok(res, "UPI account manually confirmed. This is not bank or PSP verification.", {
    settings,
  });
});

/* =========================
   Upload Institute Logo
========================= */

router.post(
  "/logo",

  (req, res, next) =>
    upload.single("logo")(req, res, async (error) => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return fail(res, "Logo must be 2 MB or smaller.", [], 413);
        }

        return next(error);
      }

      try {
        if (!req.file) {
          return fail(res, "Choose a PNG, JPG, JPEG, or WebP logo.", [], 422);
        }

        const current = await Settings.findOne({
          ownerId: req.user.id,
        });

        const oldUrl = current?.logoUrl;

        const logoUrl = await uploadLogoToBlob(req.file, req.user.id);

        const settings = await Settings.findOneAndUpdate(
          {
            ownerId: req.user.id,
          },

          {
            $set: {
              logoUrl,
            },

            $setOnInsert: {
              ownerId: req.user.id,
              instituteName: req.user.instituteName,
            },
          },

          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        );

        if (oldUrl) {
          await removeStoredLogo(oldUrl);
        }

        ok(res, "Institute logo uploaded", {
          settings,
          logoUrl,
        });
      } catch (error) {
        next(error);
      }
    }),
);

/* =========================
   Remove Institute Logo
========================= */

router.delete("/logo", async (req, res, next) => {
  try {
    const settings = await Settings.findOne({
      ownerId: req.user.id,
    });

    if (!settings) {
      return fail(res, "Settings not found", [], 404);
    }

    const oldUrl = settings.logoUrl;

    settings.logoUrl = undefined;

    await settings.save();

    if (oldUrl) {
      await removeStoredLogo(oldUrl);
    }

    ok(res, "Institute logo removed", {
      settings,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   Upload Authorized Signature
========================= */

router.post(
  "/signature",

  (req, res, next) =>
    upload.single("signature")(req, res, async (error) => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return fail(res, "Signature image must be 2 MB or smaller.", [], 413);
        }

        return next(error);
      }

      try {
        if (!req.file) {
          return fail(res, "Choose a PNG, JPG, JPEG, or WebP signature image.", [], 422);
        }

        const current = await Settings.findOne({
          ownerId: req.user.id,
        });

        const oldUrl = current?.signatureUrl;

        const signatureUrl = await uploadLogoToBlob(req.file, `${req.user.id}/signature`);

        const settings = await Settings.findOneAndUpdate(
          {
            ownerId: req.user.id,
          },

          {
            $set: {
              signatureUrl,
            },

            $setOnInsert: {
              ownerId: req.user.id,
              instituteName: req.user.instituteName,
            },
          },

          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        );

        if (oldUrl) {
          await removeStoredLogo(oldUrl);
        }

        ok(res, "Signature uploaded", {
          settings,
          signatureUrl,
        });
      } catch (error) {
        next(error);
      }
    }),
);

/* =========================
   Remove Authorized Signature
========================= */

router.delete("/signature", async (req, res, next) => {
  try {
    const settings = await Settings.findOne({
      ownerId: req.user.id,
    });

    if (!settings) {
      return fail(res, "Settings not found", [], 404);
    }

    const oldUrl = settings.signatureUrl;

    settings.signatureUrl = "";

    await settings.save();

    if (oldUrl) {
      await removeStoredLogo(oldUrl);
    }

    ok(res, "Signature removed", {
      settings,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   Upload Institute Stamp
========================= */

router.post(
  "/stamp",

  (req, res, next) =>
    upload.single("stamp")(req, res, async (error) => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return fail(res, "Stamp image must be 2 MB or smaller.", [], 413);
        }

        return next(error);
      }

      try {
        if (!req.file) {
          return fail(res, "Choose a PNG, JPG, JPEG, or WebP stamp image.", [], 422);
        }

        const current = await Settings.findOne({
          ownerId: req.user.id,
        });

        const oldUrl = current?.stampUrl;

        const stampUrl = await uploadLogoToBlob(req.file, `${req.user.id}/stamp`);

        const settings = await Settings.findOneAndUpdate(
          {
            ownerId: req.user.id,
          },

          {
            $set: {
              stampUrl,
            },

            $setOnInsert: {
              ownerId: req.user.id,
              instituteName: req.user.instituteName,
            },
          },

          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        );

        if (oldUrl) {
          await removeStoredLogo(oldUrl);
        }

        ok(res, "Stamp uploaded", {
          settings,
          stampUrl,
        });
      } catch (error) {
        next(error);
      }
    }),
);

/* =========================
   Remove Institute Stamp
========================= */

router.delete("/stamp", async (req, res, next) => {
  try {
    const settings = await Settings.findOne({
      ownerId: req.user.id,
    });

    if (!settings) {
      return fail(res, "Settings not found", [], 404);
    }

    const oldUrl = settings.stampUrl;

    settings.stampUrl = "";

    await settings.save();

    if (oldUrl) {
      await removeStoredLogo(oldUrl);
    }

    ok(res, "Stamp removed", {
      settings,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
