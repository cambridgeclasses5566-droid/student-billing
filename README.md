# ClassesPro — Student Billing SaaS

ClassesPro is a production-style, multi-tenant SaaS for coaching classes, tuition centres, academies, and educational institutes. It combines a public marketing website, secure institute signup, email OTP verification, Razorpay yearly access, student billing, PDF receipts, reports, and a separate super-admin console.

## Screenshots

Add product screenshots here after deploying to your chosen environment.

## Features

- Premium red-and-white responsive SaaS landing page
- Password-hashed institute accounts and HTTP-only JWT cookies
- Six-digit email OTP with hashing, expiry, attempt limits, cooldown, and rate limits
- Secure password reset using hashed, single-use expiring tokens
- Server-created ₹4,000 Razorpay orders and server-side signature verification
- Idempotent, signature-verified Razorpay webhook endpoint
- Subscription access middleware and expiry enforcement
- Tenant-isolated students, classes, fee payments, reports, settings, and dashboard totals
- Full and partial payments with overpayment prevention
- Payment deletion with calculated balance updates
- PDF student fee receipts and printable previews
- CSV and date-range collection reports
- Institute settings used across receipts and reports
- Tenant-scoped institute logo uploads with PNG, JPEG, and WebP validation
- Live receipt settings preview with logo, thank-you content, footer, and sample PDF
- Atomic per-institute student, payment, and yearly receipt number counters
- Super-admin dashboard, users, subscriptions, transactions, status actions, extensions, and audit logs
- Loading, empty, error, toast, confirmation, responsive, and reduced-motion states

## Technology

Frontend: HTML5, CSS3, vanilla JavaScript ES modules, Fetch API, Chart.js, jsPDF, Google Fonts.

Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Nodemailer, Razorpay, express-validator, Helmet, CORS, express-rate-limit, dotenv.

## Structure

```text
student-billing-saas/
├── client/
│   ├── index.html, login.html, signup.html, verify-otp.html
│   ├── payment.html, payment-success.html, payment-failed.html
│   ├── forgot-password.html, reset-password.html, pricing.html
│   ├── dashboard/          # institute workspace and page URLs
│   ├── admin/              # super-admin workspace and page URLs
│   └── assets/
│       ├── css/
│       └── js/
├── server/
│   ├── config/, middleware/, models/, routes/, services/, utils/
│   ├── app.js, server.js
│   └── seed.js
├── tests/
├── .env.example
├── package.json
└── README.md
```

## Local installation

Requirements: Node.js 20+, MongoDB 7+ (local or Atlas), an SMTP inbox, and Razorpay test credentials.

```bash
npm install
copy .env.example .env
npm run seed
npm run dev
```

Open `http://localhost:4000`. For a production-style start:

```bash
npm start
```

## MongoDB

Create a database and set `MONGODB_URI`. MongoDB Atlas should restrict network access and use a dedicated least-privilege database user. Never commit the connection string. Models create tenant and uniqueness indexes automatically.

## Academic structure

ClassesPro uses the following hierarchy:

```text
Standard → Class / Batch → Subjects → Students → Attendance Sessions
```

- **Standard** is the grade level, such as 9 or 10.
- **Class / Batch** is a group of students, such as `10-A Evening`.
- **Subject** is a reusable catalogue item, such as Mathematics or English.
- **ClassSubject** links one catalogue subject to a class and stores its teacher, required/optional status, and schedule.
- **StudentClassEnrollment** records class membership by academic year.
- **StudentSubjectEnrollment** records required, optional, and elective subject membership without duplicating students.

Attendance is class-first. General attendance has `subjectId: null`; subject attendance is permitted only for a valid ClassSubject link. Eligible students come from active enrollments, while old `Student.classId` records remain available as a temporary migration fallback.

### Production migration

Back up MongoDB before running any academic migration. First inspect the proposed grouping:

```bash
npm run migrate:academic-structure:dry
```

Review every entry reported as ambiguous. When the dry-run output is correct, run:

```bash
npm run migrate:academic-structure
```

The migration is idempotent, creates or reuses classes and subjects, creates enrollment links, and never deletes legacy records automatically. After migration, verify class profiles, student counts, subject links, attendance history, and fee totals for every institute before deploying the updated application.

### Academic API

- `/api/classes` — class and batch CRUD
- `/api/classes/:id/profile` — combined class summary
- `/api/classes/:id/students`, `/subjects`, `/attendance-summary`, `/financial-summary`
- `/api/classes/:id/enrollments` — class enrollment management
- `/api/classes/:id/subjects` — class-subject links
- `/api/subjects` — global subject catalogue
- `/api/enrollments/:id/transfer` — history-preserving transfers
- `/api/students/:id/subject-enrollments` — safe subject synchronization
- `/api/attendance/class-overview` — class-first attendance workspace

The dashboard uses fixed desktop navigation, two-column laptop/tablet grids, horizontally scrollable profile tabs, full-screen mobile modal sheets, touch-friendly attendance controls, and sticky mobile save/submit actions.

## Environment variables

Copy `.env.example` to `.env` and replace every secret. `JWT_SECRET` and `COOKIE_SECRET` should be independent random values of at least 32 bytes. Keep `.env` outside version control.

## Institute logos and file storage

Authenticated institute users can upload a PNG, JPG/JPEG, or WebP logo up to 2 MB from Settings. Multer validates the file on the server and stores it under:

```text
server/uploads/logos/{authenticated-user-id}/institute-logo-{unique-id}.{ext}
```

Only the relative URL is stored in `InstituteSettings.logoUrl`; image bytes are never stored in MongoDB. Replacement deletes the previous local file, and removal clears both the file and URL. Ownership always comes from the authenticated cookie session, never a submitted user ID. The storage operations are isolated in `logoStorageService.js`, so a production adapter can later write to Cloudinary, S3, or another object store while preserving the route contract.

The Express server exposes `/uploads/logos` with directory indexes and dotfiles disabled, content-type sniffing protection, and immutable user-ID-based paths. Logos are public branding assets; the path is never used as authorization for private institute data.

## Receipt settings and PDF behavior

Settings includes a live preview for institute identity, address, contact details, logo, thank-you heading/message, footer note, and authorized signatory. Users can open a full printable sample or download a sample PDF marked `SAMPLE RECEIPT`; this does not create a payment record.

Real receipt HTML and PDFs use the same normalized receipt model. The PDF generator waits for the logo to load, preserves aspect ratio, converts browser-supported formats such as WebP to PNG through canvas, uses `INR` with Indian grouping to avoid unsupported rupee glyphs in jsPDF’s built-in font, and calculates footer position from the last content row. Short receipts fit one A4 page, while genuinely long content starts a second page.

Default receipt workspace values are created idempotently after verified subscription activation by `initializeInstituteWorkspace(userId, instituteName)`.

## Multi-tenant numbering

Students, payments, classes, settings, and fee receipts remain in shared MongoDB collections with an `ownerId` field. A compound `Counter` index on `{ ownerId, counterType, year }` and atomic `$inc` operations allow every institute to independently use values such as `STU-0001`, `PAY-0001`, and `REC-2026-0001` without race-prone global counts.

## Nodemailer and OTP

Set `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`, and `EMAIL_FROM` using a verified SMTP sender. Signup creates an unverified account, invalidates previous codes, hashes the new OTP, sets a ten-minute expiry, and emails it. Verification is limited to five attempts and API routes are rate-limited. OTP values are never returned or logged.

## Razorpay test mode

Create Razorpay test credentials and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. The server always creates the order for 400000 paise in INR. The client sends Razorpay’s three public response identifiers back to the server, which verifies the HMAC signature and fetches the payment before activating one year of access.

The application never contains fake frontend success logic. `ALLOW_TEST_SUBSCRIPTION_ACTIVATION` is documented but intentionally unused; development subscriptions still require a verified Razorpay test payment.

## Razorpay webhook

Configure Razorpay to send events to:

```text
POST https://your-domain.example/api/subscriptions/webhook
```

Set the same secret in `RAZORPAY_WEBHOOK_SECRET`. The route reads the raw request body, verifies `x-razorpay-signature`, records event IDs, and safely ignores duplicates. Subscribe to relevant `payment.failed`, `payment.captured`, and order events; checkout verification remains the authoritative activation path in this version.

## Seed data and first admin

Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`, then run:

```bash
npm run seed
```

The seed is idempotent. It creates or updates one super-admin, three sample institutes with active, pending-payment, and expired states, plus sample classes, students, subscription data, and settings. Local sample institute accounts use the configured admin password; never run sample seeding against a production database.

## Security design

- Passwords use bcrypt with cost 12.
- JWTs are delivered in HTTP-only, SameSite=Lax cookies and marked Secure in production.
- Authorization roles are verified by the backend.
- Active subscriptions are checked before all billing routes.
- Every institute-owned query derives `ownerId` from the authenticated session, never request input.
- Reset tokens and OTPs are hashed at rest.
- Razorpay amount, currency, order ownership, payment details, and signature are verified server-side.
- Helmet, restricted credentialed CORS, payload limits, rate limits, validation, and centralized errors are enabled.
- Admin account mutations create audit records.

## Testing

Run the included security unit tests:

```bash
npm test
```

Before production, run end-to-end tests against dedicated MongoDB, SMTP, and Razorpay test accounts for signup, duplicate email, OTP success/failure/expiry/resend, login states, reset-password, order creation, valid and invalid signatures, webhook duplicates, subscription expiry/renewal, tenant isolation, admin denial, payment calculations, PDF download, and CSV export.

## Deployment

Deploy behind HTTPS using a managed Node host (Render, Railway, Fly.io, AWS, Azure, or Google Cloud), MongoDB Atlas, a verified transactional-email service, and production Razorpay credentials. Configure `CLIENT_URL` to the exact HTTPS origin, forward proxy headers, persist logs without secrets, and add monitoring and database backups.

### Production checklist

- Generate new strong JWT, cookie, database, SMTP, Razorpay, and webhook secrets
- Set `NODE_ENV=production` and an exact HTTPS `CLIENT_URL`
- Use production Razorpay keys and a verified webhook URL
- Verify SMTP sender/domain and SPF, DKIM, and DMARC
- Restrict MongoDB network and database permissions
- Enable automated backups, monitoring, alerts, and log retention
- Run API integration, browser, accessibility, and payment sandbox tests
- Add Terms, Privacy, Refund, and support policies for your jurisdiction
- Review applicable taxes and invoices with a qualified professional

## Known limitations

- Logo configuration currently accepts a URL; file upload storage is not bundled.
- Subscription invoice uses the browser print dialog; student receipts use jsPDF.
- The webhook records verified failures and deduplicates all events; checkout verification performs activation.
- Email delivery and Razorpay flows require real configured external accounts and cannot be exercised offline.
- Full automated integration tests require a disposable MongoDB test database and Razorpay/SMTP test fixtures.

## Future improvements

Add object-storage logo uploads, background jobs and retry queues, granular staff roles, automated fee reminders, scheduled installments, richer audit exports, GST invoice configuration, backup import/export, observability dashboards, and a full CI integration-test environment.
# Student-fee UPI payment requests

ClassesPro deliberately separates its two payment domains:

- The fixed ₹4,000 yearly software subscription continues through Razorpay, including server-side verification, webhooks, activation, and renewal.
- Student fees go directly to the logged-in institute's configured UPI ID. They never pass through the platform Razorpay account.

Institute users configure **Student Payment Account** in the dashboard, manually confirm the UPI ID after a real test payment, and create exact-amount requests from a student's row. The server selects the institute UPI ID, recalculates the balance, creates institute-scoped request/reference numbers, and builds the encoded UPI URI. Parents can scan its QR, open a compatible UPI app, print or download the request, and submit a UTR and optional proof.

A deep link, QR scan, browser return, screenshot, or user-entered UTR is never treated as proof. A claim remains `verification_required` until institute staff compare it with their bank/UPI statement and explicitly approve it. Only approval creates one `StudentPayment`, assigns an institute-specific receipt number, and changes the calculated balance. `ManualUpiVerificationProvider` makes this limitation explicit and can later be replaced by a verified bank, PSP, or merchant provider.

Payment proofs are type/size restricted, receive safe random filenames, and are stored under `server/uploads/payment-proofs/{ownerId}/`. They are delivered only through an authenticated, owner-scoped API after a matching database record is confirmed. Use durable private object storage and authenticated delivery in production.

Approval uses a MongoDB transaction, so production MongoDB should be a replica set or managed cluster supporting transactions. Unique compound indexes and atomic per-owner/year counters additionally protect request, UTR, payment, and receipt uniqueness.

Set the public application origin used in parent share links:

```env
CLIENT_URL=http://localhost:3000
```

Keep the existing Razorpay variables unchanged; they apply only to the ClassesPro subscription.

## Guided student billing workflow

The institute dashboard now guides staff through: create a class → add a student → confirm fees → open the Student Billing Profile → record an already-received payment or send a new UPI request → download the receipt. The dedicated profile URL is `/dashboard/student-billing.html?id={studentMongoId}` and combines the fee summary, timeline, UPI requests, receipts, statement export, and student information.

The Add Student form auto-fills standard, division, academic year, default fees, teacher, and batch timing from the selected class. Choose **Use custom student class details** only when the student differs from the class defaults. **Save Student** returns to the student list, while **Save and Start Billing** opens the new profile immediately. Both actions lock during submission.

### Manual payments versus UPI requests

- **Record Payment** is for money the institute has already received through cash, UPI, bank transfer, cheque, card, or another method. Each installment creates a separate payment and receipt. Client request IDs make retries idempotent.
- **Send UPI Request** asks a parent to make a future payment. A QR launch, screenshot, UTR, or “I Have Paid” action never changes the balance. Only institute approval after checking its bank/UPI account creates the final payment and receipt.
- Razorpay remains exclusively for the institute owner's ₹4,000 ClassesPro subscription. Student funds go directly to the institute payment account.

Sidebar navigation is grouped into Dashboard, Students, Billing, Reports, and Account. UPI verification is consolidated into the **Payment Requests** tabs instead of appearing as a duplicate navigation page. Institute Settings, Payment Settings, and Subscription remain separate concerns.

### Fix legacy payment indexes

Older databases may still contain an invalid unique `studentId` or `ownerId + studentId` payment index, which prevents a second installment. Back up the database, configure `MONGODB_URI`, then run:

```bash
npm run fix:payment-indexes
```

The maintenance script inspects the real payment collection, drops only the known invalid unique student indexes, and creates the correct owner/student/date lookup plus owner-scoped receipt, payment, and idempotency indexes. It never deletes payment documents.

### Billing troubleshooting

- A second payment returning HTTP 500 usually indicates the legacy unique student index still exists; run `npm run fix:payment-indexes` and review its logged index names.
- `GET /api/settings` is a read-only authenticated route and creates/returns defaults when settings are missing. It does not run update-form validation. A 401 indicates login/session state; a 402 indicates an inactive subscription. It should not return 422 for missing form fields.
- Payment validation errors now preserve safe backend messages, including full payment, overpayment, missing references, duplicate retries, missing students, and inactive subscriptions. Production responses omit stack traces while the server logs route, user ID, error code, and duplicate-key fields.

## Attendance Management

ClassesPro now includes a multi-tenant attendance workspace alongside billing. The daily workflow is: create a class, create its subjects, assign students, create a session, default everyone to Present, change exceptions to Absent/Late/Leave, save a draft or submit, then review reports.

### Subjects and sessions

Open **Academics → Subjects** to create institute-owned subjects linked to a class and teacher. One class can have multiple active subjects. General Attendance is represented by no subject and a `general` session type; no shared or cross-institute subject is created.

Open **Academics → Attendance** to create a Regular, Extra, Test, Practical, Seminar, General, or Other session. Students are loaded only when they belong to both the authenticated institute and selected class. Fast controls mark everyone Present/Absent, reset to the configured default, search students, save a draft, or submit.

- `P` / Present: counted and attended.
- `A` / Absent: counted, not attended.
- `L` / Late: counted and attended by default; configurable.
- `LV` / Leave: excluded from counted sessions by default; configurable.
- Draft and Cancelled sessions never count in official percentages.

Attendance percentage is calculated only by the backend service as `attended sessions ÷ counted sessions × 100`, rounded to two decimals. Institute-specific settings control late, leave, the low-attendance threshold (75% default), consecutive absence alert (3 default), default status, draft support, and edit permission.

### Drafts, submission, and corrections

Draft records are owner-scoped upserts and can be continued without audit logs. Submission validates every student and status, uses unique session/student records, and protects against duplicate rows. Submitted records can change only through the correction endpoint with a required reason. Each correction stores previous/new status, staff user, date, session, student, and record in `AttendanceChangeLog`. Cancellation requires confirmation and a reason and preserves history while excluding the session from calculations.

### Reports and student profiles

**Academics → Attendance Reports** supports date, class, subject, student-oriented, status, low-attendance, consecutive-absence, and register views. Reports export readable CSV, print in A4 landscape, and download as PDF. WhatsApp actions create only a pre-filled manual message.

The existing `student-billing.html` route remains valid and now presents a Student Profile with a dedicated Attendance tab containing overall/subject percentages, monthly trend, recent history, low-attendance warnings, consecutive absences, print, report, and WhatsApp actions. Class cards link to marking and class attendance reports. The main dashboard adds one compact Attendance Today section and the onboarding checklist includes first subject and first submitted session.

### Attendance API summary

```text
GET/POST              /api/subjects
GET/PUT/DELETE         /api/subjects/:id
GET                    /api/classes/:classId/subjects
GET/POST               /api/attendance/sessions
GET                    /api/attendance/sessions/:id
PUT                    /api/attendance/sessions/:id/draft
POST                   /api/attendance/sessions/:id/submit
POST                   /api/attendance/sessions/:id/cancel
PUT                    /api/attendance/records/:id
GET/PUT                /api/attendance/settings
GET                    /api/attendance/overview
GET                    /api/attendance/students/:studentId/summary
GET                    /api/attendance/classes/:classId/summary
GET                    /api/attendance/subjects/:subjectId/summary
GET                    /api/attendance/low-attendance
GET                    /api/attendance/consecutive-absences
GET                    /api/attendance/reports
```

All attendance and subject queries include `ownerId` derived from the authenticated user. Class, subject, session, and student relationships are revalidated on the server; frontend `ownerId` values are ignored. `AttendanceSession.timetableEntryId` keeps the module ready for a future timetable integration without requiring one today.

## Student enrollment workflow

Students are institute-level records and are never duplicated when they join a class or subject. From a Class Profile, use **Add Students** to search existing institute students, select multiple records, choose optional subjects, and enroll them. Required class subjects are assigned automatically.

Student discovery and the global Students directory use owner-scoped server-side search and pagination. Filters include standard, class, subject, academic year, fee status, attendance status, and enrollment status, with 25, 50, or 100 results per page.

Students with another active enrollment in the same academic year are skipped by default. An explicit transfer closes the previous enrollment while preserving attendance, billing, receipts, and the original Student record. Removing a student from a class preserves the same history.

```text
GET    /api/students/available-for-class
GET    /api/billing/students?page=1&limit=25
POST   /api/classes/:classId/enrollments/bulk
DELETE /api/enrollments/:enrollmentId
```

## Student payment workflow

Student fee collection is separate from the ClassesPro Razorpay subscription. Razorpay processes only the yearly ClassesPro plan; student payments go directly to the institute through cash, bank, card, cheque, or the institute's UPI account.

Use **Payment Settings** at `/dashboard/#payment-settings` to enter a UPI ID or upload an existing PNG, JPG, JPEG, or WebP institute QR image up to 2 MB. Files are stored under `server/uploads/payment-qr/{ownerId}/`; MongoDB stores only the relative URL. Replacing or removing a QR deletes the previous local file.

Payment requests may use the uploaded static institute QR or an exact-amount UPI QR generated from the configured UPI ID. Static QR sharing never marks a fee paid. A parent or staff member submits the UTR, and the institute must approve it before ClassesPro creates the `StudentPayment`, updates the balance, and generates a receipt. Unique `studentPaymentId` and `feeRequestId` indexes prevent duplicate approval payments.

Payment Settings uses an explicit UPI master switch, independent UTR and proof toggles, accessible QR-type radio cards, a live preview, and an unsaved-changes action bar. Turning UPI off disables its dependent controls without erasing their saved values; manual payment recording remains available.

Uploaded QR URLs are verified against the authenticated institute's upload directory before they are returned. If a stored file is missing, Payment Settings clears the stale URL and shows an upload-again state. The browser adds a cache-busting query only while rendering the preview; the clean persistent URL remains suitable for downloading and sharing.

```text
GET    /api/payment-settings
PUT    /api/payment-settings
POST   /api/payment-settings/upi-qr
DELETE /api/payment-settings/upi-qr
GET    /api/fee-requests
POST   /api/fee-requests
POST   /api/fee-requests/:id/approve
POST   /api/fee-requests/:id/reject
```

## Stabilized billing workflow

Student billing runs inside the main dashboard at `#student-profile?id=...`. Manual payments support unlimited installments, use owner-scoped idempotency keys, calculate balances on the server, and show a live before/after preview. The retired standalone student billing URL redirects to the dashboard profile.

Before deploying an upgraded database, run `npm run fix:payment-indexes` once to remove known legacy one-payment-per-student indexes safely.

All billing totals now come from completed `StudentPayment` documents through `server/services/studentBillingService.js`. Payment modes are stored as `cash`, `upi`, `bank_transfer`, `card`, `cheque`, or `other`. The Record Payment modal is mounted in `#globalModalRoot` directly under the document body so it remains viewport-centered.

Payment arithmetic is normalized to integer paise before validation and aggregation. This avoids floating-point drift for installments such as INR 499.97 while preserving the existing rupee-based API fields. New manual installments do not require an idempotency key; when one is supplied, its uniqueness is enforced only for non-empty values.

Student-list billing is grouped by each student's MongoDB `_id`; institute-wide collections are never reused as a row total. Existing installations can inspect legacy money fields without changing data by running `npm run migrate:money:dry`, then add exact integer-paise fields with `npm run migrate:money`. The migration converts the value actually stored and deliberately does not guess or round ₹999.98 up to ₹1,000.

Verification commands:

```bash
npm test
npm run test:billing-restart
npm run fix:payment-indexes
```

The integration suite uses an isolated temporary MongoDB instance and never modifies development or production data.
