import "./workflow-dashboard.js";
import { installMobileNavigation } from "./mobileNavigation.js";
import { renderFinancialReports } from "./financialReports.js";
import { installHeaderAccountMenu } from "./headerAccountMenu.js";
import { renderStudentForm } from "./studentForm.js";
import { renderClassProfile, destroyClassProfile } from "./classProfile.js";
import { renderStudentProfile, destroyStudentProfile } from "./studentProfile.js";
import { renderStudentDirectory } from "./studentDirectory.js";
import { renderCollectPaymentPage, renderPaymentHistoryPage } from "./billingPages.js";
import { studentInitials, avatarTone } from "./mobileUI.js";
import { get, post, put, del, upload } from "./api.js";
import { $, $$, money, date, escapeHTML, toast, busy, closeIconSVG } from "./ui.js";
import { openModal, closeModal as closeManagedModal, setModalDirty, destroyModal } from "./modalManager.js";
import { installThemeSwitcher } from "./themeManager.js";
import { installAppCombobox } from "./appSelect.js";
import { createReceiptModel, renderReceiptHTML, generateReceiptPDF } from "./receipt.js";
import { renderReceiptSettings } from "./receiptSettings.js";
const receiptStyles = document.createElement("link");
receiptStyles.rel = "stylesheet";
receiptStyles.href = "../assets/css/receipt.css";
document.head.append(receiptStyles);
const responsiveStyles = document.createElement("link");
responsiveStyles.rel = "stylesheet";
responsiveStyles.href = "../assets/css/responsive-dashboard.css";
responsiveStyles.dataset.responsiveDashboard = "true";
document.head.append(responsiveStyles);
const mobileAppStyles = document.createElement("link");
mobileAppStyles.rel = "stylesheet";
mobileAppStyles.href = "../assets/css/mobile-app.css";
mobileAppStyles.dataset.mobileApp = "true";
document.head.append(mobileAppStyles);
import { renderPaymentStatusBadge } from "./paymentStatus.js";
let me,
  classes = [],
  students = [],
  payments = [],
  charts = [];
const root = $("#workspace"),
  modal =
    $("#modal") ||
    (() => {
      const dialog = document.createElement("dialog");
      dialog.id = "modal";
      dialog.className = "modal legacy-dialog-host";
      document.body.append(dialog);
      return dialog;
    })();
const status = renderPaymentStatusBadge;
const closeModal = () => {
  if (modal.open) modal.close();
  closeManagedModal({ force: true });
};
installThemeSwitcher();
installMobileNavigation();
async function bootstrap() {
  try {
    ({ user: me } = await get("/auth/me"));
    installHeaderAccountMenu(me);
    await installInstituteBranding(me);
    await route();
  } catch (e) {
    console.error("Dashboard bootstrap failed", e);
    root.innerHTML = `<div class="card empty"><h3>Could not load your workspace</h3><p>${escapeHTML(e.message)}</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div>`;
  }
}
async function installInstituteBranding(user) {
  const logo = document.querySelector("#sidebar .product-logo");
  const fallbackName = String(user?.instituteName || "Institute").trim() || "Institute";
  if (logo) logo.alt = `${fallbackName} logo`;
  document.title = `Dashboard — ${fallbackName}`;
  try {
    const response = await get("/settings");
    const settings = response?.settings && typeof response.settings === "object" ? response.settings : {};
    const instituteName = String(settings.instituteName || fallbackName).trim() || fallbackName;
    if (logo) {
      logo.alt = `${instituteName} logo`;
      if (typeof settings.logoUrl === "string" && settings.logoUrl.trim()) logo.src = settings.logoUrl;
    }
    document.title = `Dashboard — ${instituteName}`;
  } catch (error) {
    console.warn("Institute branding could not be loaded; using the account fallback.", error);
  }
}
async function loadData() {
  const [s, c, p] = await Promise.all([get("/billing/students"), get("/billing/classes"), get("/billing/payments")]);
  students = s.students;
  classes = c.classes;
  payments = p.payments;
}
function heading(title, subtitle, action = "") {
  return `<div class="page-title"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
function actions(id) {
  return `<div class="actions"><button class="icon-button" data-action="view" data-id="${id}">View</button><button class="icon-button" data-action="edit" data-id="${id}">Edit</button><button class="icon-button" data-action="pay" data-id="${id}">Record payment</button><button class="icon-button" data-action="delete" data-id="${id}">Delete</button></div>`;
}
async function dashboard() {
  const { summary, recentPayments, students: list } = await get("/billing/dashboard"),
    metricRows = [
      ["Students", summary.students],
      ["Classes", summary.classes],
      ["Expected fees", money(summary.expected)],
      ["Collected", money(summary.collected)],
      ["Pending", money(summary.pending)],
      ["Fully paid", summary.paid],
      ["Partially paid", summary.partial],
      ["Unpaid", summary.unpaid],
    ],
    classCount = (item) => list.filter((student) => String(student.classId?._id || student.classId) === String(item._id)).length;
  root.innerHTML = `<section class="desktop-dashboard">${heading(`Good morning, ${escapeHTML(me.fullName.split(" ")[0])}`, "Here is today’s institute finance overview.", '<button class="btn btn-primary" data-go="add-student">+ Add student</button>')}<div class="kpis">${metricRows.map(([label, value]) => `<article class="card kpi"><small>${label}</small><strong>${value}</strong></article>`).join("")}</div><div class="dash-grid"><section class="card panel"><h3>Collection overview</h3>${[
    ["Expected", summary.expected],
    ["Collected", summary.collected],
    ["Pending", summary.pending],
  ]
    .map(([label, amount]) => `<div class="receipt-row"><span>${label}</span><strong>${money(amount)}</strong></div>`)
    .join("")}</section><section class="card panel"><h3>Fee status</h3>${[
    ["Paid", summary.paid],
    ["Partially Paid", summary.partial],
    ["Unpaid", summary.unpaid],
  ]
    .map(([label, count]) => `<div class="receipt-row"><span>${label}</span><strong>${count}</strong></div>`)
    .join(
      "",
    )}</section><section class="card panel"><h3>Recent payments</h3>${recentPayments.map((payment) => `<div class="receipt-row"><span>${escapeHTML(payment.studentId?.name || "Student")}<small style="display:block;color:var(--muted)">${date(payment.paymentDate)}</small></span><strong>${money(payment.amount)}</strong></div>`).join("") || '<div class="empty">No payments yet</div>'}</section><section class="card panel"><h3>Quick actions</h3><div class="quick"><button class="btn" data-go="add-student">Add student</button><button class="btn" data-go="fee-collection">Collect fee</button><button class="btn" data-go="pending">Pending fees</button><button class="btn" data-go="reports">Run report</button></div><h3 style="margin-top:24px">Class summary</h3>${classes
    .slice(0, 4)
    .map((item) => `<div class="receipt-row"><span>${escapeHTML(item.name)}</span><strong>${classCount(item)}</strong></div>`)
    .join(
      "",
    )}</section></div></section><section class="mobile-dashboard"><header class="mobile-dashboard-head"><div><h1>Good morning, ${escapeHTML(me.fullName.split(" ")[0])} <span aria-hidden="true">👋</span></h1><p>Here is today’s institute finance overview.</p></div><button class="btn btn-primary" data-go="add-student">+ Add Student</button></header><div class="mobile-metric-grid">${metricRows.map(([label, value]) => `<article class="mobile-metric-card"><small>${label}</small><strong>${value}</strong></article>`).join("")}</div><div class="mobile-dashboard-sections"><section class="mobile-dashboard-card"><h2>Collection overview</h2>${[
    ["Expected", summary.expected],
    ["Collected", summary.collected],
    ["Pending", summary.pending],
  ]
    .map(([label, amount]) => `<div class="mobile-summary-row"><span>${label}</span><strong>${money(amount)}</strong></div>`)
    .join("")}</section><section class="mobile-dashboard-card"><h2>Fee status</h2>${[
    ["Paid", summary.paid, "paid"],
    ["Partially paid", summary.partial, "partial"],
    ["Unpaid", summary.unpaid, "unpaid"],
  ]
    .map(([label, count, tone]) => `<div class="mobile-summary-row"><span><i class="status-dot ${tone}"></i>${label}</span><strong>${count}</strong></div>`)
    .join("")}</section><section class="mobile-dashboard-card"><div class="mobile-section-heading"><h2>Recent payments</h2><a href="#payments">View all</a></div>${
    recentPayments
      .slice(0, 4)
      .map(
        (payment) =>
          `<div class="mobile-payment-row"><span class="mobile-avatar tone-${avatarTone(payment.studentId?.name)}">${studentInitials(payment.studentId?.name)}</span><div><strong>${escapeHTML(payment.studentId?.name || "Student")}</strong><small>${date(payment.paymentDate)}</small></div><b>${money(payment.amount)}</b></div>`,
      )
      .join("") || '<div class="mobile-empty">No payments yet.</div>'
  }</section><section class="mobile-dashboard-card"><h2>Quick actions</h2><div class="mobile-quick-grid"><button data-go="add-student"><span>＋</span>Add student</button><button data-go="fee-collection"><span>₹</span>Collect fee</button><button data-go="pending"><span>!</span>Pending fees</button><button data-go="reports"><span>↗</span>Run report</button></div></section><section class="mobile-dashboard-card"><h2>Class summary</h2>${
    classes
      .slice(0, 4)
      .map(
        (item) =>
          `<a class="mobile-class-row" href="#class-profile?id=${item._id}"><span><strong>${escapeHTML(item.name)}</strong><small>${classCount(item)} Students</small></span><b aria-hidden="true">›</b></a>`,
      )
      .join("") || '<div class="mobile-empty">No classes yet.</div>'
  }</section></div></section>`;
}
async function studentList(mode = "all") {
  await loadData();
  let list = mode === "pending" ? students.filter((s) => s.remaining > 0) : students;
  root.innerHTML = `${heading(mode === "pending" ? "Pending fees" : "Students", mode === "pending" ? "Outstanding accounts requiring attention." : "Search and manage institute student records.", '<button class="btn btn-primary" data-go="add-student">+ Add student</button>')}<div class="toolbar"><input id="studentSearch" placeholder="Search name, ID or mobile"><select id="statusFilter"><option value="">All statuses</option><option>Paid</option><option>Partially Paid</option><option>Unpaid</option></select></div><div class="card table-card"><div class="table-scroll"><table><thead><tr><th>ID</th><th>Student</th><th>Class</th><th>Mobile</th><th>Payable</th><th>Paid</th><th>Remaining</th><th>Status</th><th>Actions</th></tr></thead><tbody id="studentRows">${studentRows(list)}</tbody></table></div></div>`;
  const update = () => {
    $("#studentRows").innerHTML = studentRows(
      list.filter(
        (s) =>
          (!$("#studentSearch").value || `${s.name} ${s.studentId} ${s.mobile}`.toLowerCase().includes($("#studentSearch").value.toLowerCase())) &&
          (!$("#statusFilter").value || s.status === $("#statusFilter").value),
      ),
    );
  };
  $("#studentSearch").oninput = update;
  $("#statusFilter").onchange = update;
}
function studentRows(list) {
  return (
    list
      .map(
        (s) =>
          `<tr><td><strong>${escapeHTML(s.studentId)}</strong></td><td>${escapeHTML(s.name)}</td><td>${escapeHTML(s.standard)}-${escapeHTML(s.division)}</td><td>${escapeHTML(s.mobile)}</td><td>${money(s.finalFees)}</td><td>${money(s.totalPaid)}</td><td><strong>${money(s.remaining)}</strong></td><td>${status(s.status)}</td><td>${actions(s._id)}</td></tr>`,
      )
      .join("") || '<tr><td colspan="9" class="empty">No matching students.</td></tr>'
  );
}
async function paymentList() {
  await loadData();
  root.innerHTML = `${heading("Payment history", "View, print, download, or reverse student payments.", '<button class="btn btn-primary" data-go="fee-collection">Collect fee</button>')}<div class="card table-card"><div class="table-scroll"><table><thead><tr><th>Receipt</th><th>Date</th><th>Student</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Actions</th></tr></thead><tbody>${payments.map((p) => `<tr><td>${escapeHTML(p.receiptNumber)}</td><td>${date(p.paymentDate)}</td><td>${escapeHTML(p.studentId?.name)}</td><td><strong>${money(p.amount)}</strong></td><td>${escapeHTML(p.paymentMode)}</td><td>${escapeHTML(p.transactionReference || "—")}</td><td><div class="actions"><button class="icon-button" data-action="receipt" data-id="${p._id}">Receipt</button><button class="icon-button" data-action="delete-payment" data-id="${p._id}">Delete</button></div></td></tr>`).join("") || '<tr><td colspan="7" class="empty">No payments recorded.</td></tr>'}</tbody></table></div></div>`;
}
async function paymentForm(id = "") {
  await loadData();
  root.innerHTML = `${heading("Collect student fee", "Record a full or partial payment safely.")}<form class="card form-card" id="paymentForm"><div class="form-grid"><div class="form-field full"><label>Student *</label><select name="studentId" id="payStudent" required><option value="">Select student</option>${students
    .filter((s) => s.remaining > 0)
    .map((s) => `<option value="${s._id}" ${s._id === id ? "selected" : ""}>${escapeHTML(s.name)} &middot; ${s.studentId} &middot; Remaining ${money(s.remaining)}</option>`)
    .join(
      "",
    )}</select></div><div class="form-field"><label>Amount *</label><input type="number" min="1" name="amount" required></div><div class="form-field"><label>Payment date *</label><input type="date" name="paymentDate" value="${new Date().toISOString().slice(0, 10)}" required></div><div class="form-field"><label>Payment mode *</label><select name="paymentMode"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Cheque</option><option>Other</option></select></div><div class="form-field"><label>Reference</label><input name="transactionReference"></div><div class="form-field"><label>Collected by *</label><input name="collectedBy" value="${escapeHTML(me.fullName)}" required></div><div class="form-field full"><label>Notes</label><textarea name="notes"></textarea></div></div><div class="form-actions"><button class="btn btn-primary">Record payment</button></div></form>`;
  $("#paymentForm").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.submitter;
    try {
      busy(b, true);
      const data = Object.fromEntries(new FormData(e.currentTarget));
      data.amount = Number(data.amount);
      await post("/billing/payments", data);
      toast("Payment and receipt created");
      location.hash = "payments";
    } catch (err) {
      toast(err.message, "error");
    } finally {
      busy(b, false);
    }
  };
}
async function classPage() {
  const data = await get("/classes");
  classes = data.classes;
  const profiles = await Promise.all(classes.map((item) => get(`/classes/${item._id}/profile`).catch(() => ({ class: item, summary: { studentCount: 0 } }))));
  root.innerHTML = `${heading("Classes / Batches", "Manage student groups and billing assignments.", '<button class="btn btn-primary" id="addClass">+ Add Class / Batch</button>')}<div class="class-grid">${profiles.map(({ class: item, summary }) => `<article class="card class-card"><div class="class-card-top"><span class="tag">Standard ${escapeHTML(item.standard)} &middot; ${escapeHTML(item.division)}</span><div class="class-card-tools"><span class="status ${item.isActive ? "paid" : "unpaid"}">${item.isActive ? "Active" : "Inactive"}</span><details class="overflow-menu"><summary class="icon-button kebab-button" aria-label="More actions for ${escapeHTML(item.name)}">&#8942;</summary><div role="menu"><button role="menuitem" data-action="edit-class" data-id="${item._id}">Edit Class</button><button class="danger-menu-item" role="menuitem" data-action="delete-class" data-id="${item._id}">Delete Class</button></div></details></div></div><h2>${escapeHTML(item.name)}</h2><p class="class-meta">${escapeHTML(item.batchName || "Regular Batch")} &middot; ${escapeHTML(item.academicYear)}</p><p class="class-meta">${escapeHTML(item.startTime || "Time not set")}${item.endTime ? `&ndash;${escapeHTML(item.endTime)}` : ""} &middot; ${escapeHTML(item.classTeacherName || "Teacher not assigned")}</p><div class="class-stats"><span><strong>${summary.studentCount}</strong> Students</span></div><div class="card-actions"><a class="btn btn-primary" href="#class-profile?id=${item._id}">Open Class</a><a class="btn btn-secondary" href="/api/billing/classes/${item._id}/students.csv">Download CSV</a></div></article>`).join("") || '<div class="card empty"><h2>No classes or batches have been created</h2><p>Create a class such as 10-A before adding students.</p></div>'}</div>`;
  $("#addClass").onclick = () => classModal();
}
function classModal(c = {}) {
  const trigger = document.activeElement,
    titleId = "class-dialog-title",
    currentYear = new Date().getFullYear(),
    defaultYear = c.academicYear || `${currentYear}-${currentYear + 1}`,
    academicStartYear = Number(c.academicYear?.match(/^\d{4}/)?.[0] || currentYear),
    academicYears = [...new Set([...Array.from({ length: 7 }, (_, index) => `${academicStartYear - 3 + index}-${academicStartYear - 2 + index}`), ...classes.map((item) => item.academicYear), defaultYear].filter(Boolean))].sort(),
    batchTypes = [...new Set([c.batchName, "Regular Batch", "Morning Batch", "Evening Batch", "Weekend Batch"].filter(Boolean))],
    options = (items, selected) => items.map((item) => `<option value="${escapeHTML(item)}" ${item === selected ? "selected" : ""}>${escapeHTML(item)}</option>`).join("");
  const classContent = `<form class="form-dialog class-dialog" id="classForm" role="dialog" aria-modal="true" aria-labelledby="${titleId}" novalidate><header class="dialog-header"><div class="dialog-title"><span class="dialog-icon" aria-hidden="true">&#43;</span><div><span class="dialog-tag">ACADEMIC SETUP</span><h2 id="${titleId}">${c._id ? "Edit" : "Create"} Class / Batch</h2><p>Create a student group for assigning students and fees.</p></div></div><button type="button" class="dialog-close" data-dialog-close aria-label="Close">${closeIconSVG}</button></header><div class="dialog-body"><div class="form-error-summary" id="classErrorSummary" tabindex="-1" hidden></div><div class="form-dialog-content"><div class="class-dialog-sections"><section class="dialog-form-section"><div class="form-section-heading"><div><h3>Class Details</h3><p>Required information used for student assignment and reporting.</p></div></div><div class="dialog-form-grid"><label class="dialog-field dialog-field--full" for="className">Class / Batch Name *<input id="className" name="name" value="${escapeHTML(c.name || "")}" placeholder="Class 10 Mathematics" autocomplete="off" required aria-describedby="classNameError"><span class="field-error" id="classNameError"></span></label><label class="dialog-field" for="classStandard">Standard *<input id="classStandard" name="standard" value="${escapeHTML(c.standard || "")}" placeholder="10 or FYJC" maxlength="20" autocomplete="off" required aria-describedby="classStandardError"><span class="field-error" id="classStandardError"></span></label><label class="dialog-field" for="classDivision">Division *<input id="classDivision" name="division" value="${escapeHTML(c.division || "")}" placeholder="A" maxlength="20" required aria-describedby="classDivisionError"><span class="field-error" id="classDivisionError"></span></label><label class="dialog-field" for="classYear">Academic Year *<select id="classYear" name="academicYear" required aria-describedby="classYearError">${options(academicYears, defaultYear)}</select><span class="field-error" id="classYearError"></span></label><label class="dialog-field" for="batchType">Batch Type<input id="batchType" name="batchName" value="${escapeHTML(c.batchName || "Regular Batch")}" placeholder="Regular Batch" autocomplete="off"><small>Select a preset or type a custom batch name.</small></label></div></section><section class="dialog-form-section"><div class="form-section-heading"><div><h3>Schedule</h3><p>Optional timing and teacher information.</p></div></div><div class="dialog-form-grid"><label class="dialog-field" for="classStart">Start Time<input id="classStart" name="startTime" type="time" value="${escapeHTML(c.startTime || "")}" aria-describedby="classTimeError"></label><label class="dialog-field" for="classEnd">End Time<input id="classEnd" name="endTime" type="time" value="${escapeHTML(c.endTime || "")}" aria-describedby="classTimeError"><span class="field-error" id="classTimeError"></span></label><label class="dialog-field dialog-field--full" for="classTeacher">Class Teacher<input id="classTeacher" name="classTeacherName" value="${escapeHTML(c.classTeacherName || "")}" placeholder="Teacher not assigned" autocomplete="off"><small>Optional. Leave blank when no teacher is assigned.</small></label></div></section><section class="dialog-form-section class-notes-section"><div class="form-section-heading"><div><h3>Notes &amp; Status</h3><p>Optional context and class availability.</p></div></div><div class="dialog-form-grid"><label class="dialog-field dialog-field--full" for="classNotes">Notes<textarea id="classNotes" name="notes" placeholder="Optional details about this class or batch">${escapeHTML(c.notes || "")}</textarea></label><label class="check-field dialog-field--full"><input type="checkbox" name="isActive" ${c.isActive !== false ? "checked" : ""}> Active class / batch</label></div></section></div><aside class="dialog-preview" aria-live="polite"><span class="dialog-tag">CLASS PREVIEW</span><h3 id="classPreviewName">${escapeHTML(c.name || "New Class / Batch")}</h3><p id="classPreviewStandard">Standard ${escapeHTML(c.standard || "—")} · Division ${escapeHTML(c.division || "—")}</p><dl><div><dt>Academic Year</dt><dd id="classPreviewYear">${escapeHTML(defaultYear)}</dd></div><div><dt>Batch Type</dt><dd id="classPreviewBatch">${escapeHTML(c.batchName || "Regular Batch")}</dd></div><div><dt>Timing</dt><dd id="classPreviewTiming">Not set</dd></div><div><dt>Class Teacher</dt><dd id="classPreviewTeacher">${escapeHTML(c.classTeacherName || "Not assigned")}</dd></div></dl></aside></div></div><footer class="dialog-footer"><span>Fields marked * are required</span><div><button type="button" class="btn btn-secondary" data-dialog-close>Cancel</button><button type="submit" class="btn btn-primary">${c._id ? "Save Changes" : "Create Class / Batch"}</button></div></footer></form>`;
  openModal({ content: classContent, size: "large", trigger });
  const form = $("#classForm"),
    controller = { resetDirty: () => setModalDirty(false), close: (force) => closeManagedModal({ force }) };
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", () => setModalDirty(true));
  const field = (id) => form.querySelector(id),
    value = (id) => field(id)?.value.trim() || "",
    formatTime = (time) => (time ? new Date(`2000-01-01T${time}`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "Not set");
  installAppCombobox(field("#batchType"), { options: batchTypes });
  const updatePreview = () => {
    const standard = value("#classStandard"),
      division = value("#classDivision"),
      batch = value("#batchType");
    field("#classPreviewName").textContent = value("#className") || "New Class / Batch";
    field("#classPreviewStandard").textContent = `Standard ${standard || "—"} · Division ${division || "—"}`;
    field("#classPreviewYear").textContent = value("#classYear") || "Not selected";
    field("#classPreviewBatch").textContent = batch || "Regular Batch";
    field("#classPreviewTiming").textContent = value("#classStart") ? `${formatTime(value("#classStart"))}${value("#classEnd") ? ` – ${formatTime(value("#classEnd"))}` : ""}` : "Not set";
    field("#classPreviewTeacher").textContent = value("#classTeacher") || "Not assigned";
  };
  form.addEventListener("input", updatePreview);
  updatePreview();
  const validate = () => {
    form.querySelectorAll(".field-error").forEach((x) => (x.textContent = ""));
    form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
    const errors = [];
    const add = (id, errorId, message) => {
      const input = field(id),
        error = field(errorId);
      input.setAttribute("aria-invalid", "true");
      error.textContent = message;
      errors.push(input);
    };
    if (!value("#classStandard") || !/^[A-Za-z0-9][A-Za-z0-9 .-]{0,19}$/.test(value("#classStandard"))) add("#classStandard", "#classStandardError", "Enter a valid standard, such as 10.");
    if (!value("#classDivision")) add("#classDivision", "#classDivisionError", "Please enter a division.");
    if (!value("#className")) add("#className", "#classNameError", "Please enter a class or batch name.");
    if (!value("#classYear") || !/^\d{4}-\d{4}$/.test(value("#classYear"))) add("#classYear", "#classYearError", "Use an academic year such as 2026-2027.");
    if (value("#classStart") && value("#classEnd") && value("#classEnd") <= value("#classStart")) add("#classEnd", "#classTimeError", "End time must be later than start time.");
    const summary = field("#classErrorSummary");
    summary.hidden = !errors.length;
    summary.textContent = errors.length ? `Please fix ${errors.length} field${errors.length === 1 ? "" : "s"} before continuing.` : "";
    if (errors.length) {
      summary.focus();
      errors[0].scrollIntoView({ block: "center" });
      errors[0].focus();
    }
    return !errors.length;
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    const button = event.submitter,
      data = Object.fromEntries(new FormData(form));
    data.isActive = form.elements.isActive.checked;
    try {
      busy(button, true, c._id ? "Saving..." : "Creating...");
      const result = c._id ? await put(`/classes/${c._id}`, data) : await post("/classes", data),
        saved = result.class;
      controller.resetDirty();
      toast(`${saved.name} ${c._id ? "updated" : "created"} successfully.`);
      controller.close(true);
      classPage();
    } catch (error) {
      const summary = field("#classErrorSummary");
      summary.hidden = false;
      summary.textContent =
        error.status === 409
          ? "This class already exists."
          : error.status === 422
            ? "Please check the highlighted fields."
            : error.status >= 500
              ? "We could not create the class. Please try again."
              : error.message;
      summary.focus();
      busy(button, false);
    }
  };
}

async function settings() {
  const { settings: s } = await get("/settings");
  const samplePayment = {
      _id: "sample",
      receiptNumber: "SAMPLE RECEIPT",
      amount: 10000,
      paymentDate: new Date().toISOString(),
      paymentMode: "UPI",
      transactionReference: "SAMPLE-REFERENCE",
      collectedBy: me.fullName,
      notes: "Sample installment",
      createdAt: new Date().toISOString(),
    },
    sampleStudent = { studentId: "STU-0001", name: "Sample Student", standard: "10", division: "A", academicYear: s.academicYear, finalFees: 20000 };
  let previewLogo = s.logoUrl || "";
  const values = () => {
      const data = Object.fromEntries(new FormData($("#settingsForm")));
      data.logoUrl = previewLogo;
      return data;
    },
    model = () => createReceiptModel(samplePayment, sampleStudent, [samplePayment], values(), true),
    draw = () => {
      $("#liveReceipt").innerHTML = renderReceiptHTML(model());
      const img = $("#currentLogo");
      if (img) {
        img.src =
          previewLogo ||
          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100"%3E%3Crect width="100%25" height="100%25" fill="%23fef2f2"/%3E%3Ctext x="50%25" y="55%25" text-anchor="middle" fill="%23991b1b" font-family="Arial" font-size="18"%3ELOGO%3C/text%3E%3C/svg%3E';
      }
    };
  root.innerHTML = `${heading("Institute settings", "Customize institute identity, receipt branding, and footer content.")}<div class="settings-layout"><form class="card form-card" id="settingsForm"><div class="logo-upload-card"><h3>Institute logo</h3><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><img id="currentLogo" class="logo-preview" alt="Current institute logo"><div><input id="logoFile" type="file" accept="image/png,image/jpeg,image/webp" hidden><button type="button" class="btn btn-secondary" id="replaceLogo">${s.logoUrl ? "Replace" : "Upload"} logo</button> <button type="button" class="btn btn-danger" id="removeLogo" ${s.logoUrl ? "" : "disabled"}>Remove logo</button><p style="font-size:12px;color:var(--muted)">PNG, JPG, JPEG, or WebP &middot; maximum 2 MB</p><div id="logoMessage" class="message"></div></div></div></div><div class="form-grid" style="margin-top:20px">${[
    ["instituteName", "Institute name"],
    ["mobile", "Mobile"],
    ["email", "Email"],
    ["receiptPrefix", "Receipt prefix"],
    ["currency", "Currency"],
    ["academicYear", "Academic year"],
    ["authorizedSignatory", "Authorized signatory"],
    ["timeZone", "Time zone"],
    ["dateFormat", "Date format"],
  ]
    .map(([n, l]) => `<div class="form-field"><label>${l}</label><input name="${n}" value="${escapeHTML(s[n] || "")}"></div>`)
    .join(
      "",
    )}<div class="form-field full"><label>Address</label><textarea name="address">${escapeHTML(s.address || "")}</textarea></div><div class="form-field full"><label>Receipt thank-you heading</label><input name="receiptThankYouHeading" value="${escapeHTML(s.receiptThankYouHeading || "Thank you for your payment!")}"></div><div class="form-field full"><label>Receipt thank-you message</label><textarea name="receiptThankYouMessage">${escapeHTML(s.receiptThankYouMessage || "We appreciate your trust in {Institute Name}. Please keep this receipt for your records.")}</textarea></div><div class="form-field full"><label>Receipt footer note</label><textarea name="receiptFooter">${escapeHTML(s.receiptFooter || "This is a computer-generated receipt. No physical signature is required.")}</textarea></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" id="fullPreview">Preview full receipt</button><button type="button" class="btn btn-secondary" id="samplePdf">Download sample PDF</button><button class="btn btn-primary">Save receipt settings</button></div></form><aside class="card panel receipt-preview-sticky"><h3>Live receipt preview</h3><div id="liveReceipt"></div></aside></div>`;
  draw();
  $("#settingsForm").addEventListener("input", draw);
  $("#replaceLogo").onclick = () => $("#logoFile").click();
  $("#logoFile").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) {
      const m = $("#logoMessage");
      m.textContent = !allowed.includes(file.type) ? "Choose a PNG, JPG, JPEG, or WebP image." : "Logo must be 2 MB or smaller.";
      m.className = "message show error";
      return;
    }
    previewLogo = URL.createObjectURL(file);
    draw();
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const data = await upload("/settings/logo", fd);
      previewLogo = data.logoUrl;
      toast("Institute logo saved");
      $("#removeLogo").disabled = false;
      draw();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  $("#removeLogo").onclick = async () => {
    await del("/settings/logo");
    previewLogo = "";
    toast("Institute logo removed");
    $("#removeLogo").disabled = true;
    draw();
  };
  $("#settingsForm").onsubmit = async (e) => {
    e.preventDefault();
    await put("/settings", Object.fromEntries(new FormData(e.currentTarget)));
    toast("Receipt settings saved");
    draw();
  };
  $("#fullPreview").onclick = () => {
    modal.innerHTML = `<div class="modal-body"><div class="legacy-modal-toolbar"><button type="button" class="dialog-close" id="closePreview" aria-label="Close preview">${closeIconSVG}</button></div>${renderReceiptHTML(model())}<div class="form-actions"><button class="btn btn-secondary" onclick="window.print()">Print preview</button></div></div>`;
    modal.showModal();
    $("#closePreview").onclick = closeModal;
  };
  $("#samplePdf").onclick = async () => {
    try {
      await generateReceiptPDF(model(), "Sample_Receipt.pdf");
    } catch (error) {
      toast(error.message, "error");
    }
  };
}
async function viewStudent(id) {
  const { student: s, payments: p } = await get(`/billing/students/${id}`);
  modal.innerHTML = `<div class="modal-body"><div class="legacy-modal-toolbar"><button type="button" class="dialog-close" id="closeModal" aria-label="Close">${closeIconSVG}</button></div><span class="tag">${s.studentId}</span><h2>${escapeHTML(s.name)}</h2><p>${escapeHTML(s.standard)}-${escapeHTML(s.division)} &middot; ${escapeHTML(s.mobile)}</p><div class="receipt-row"><span>Final payable</span><strong>${money(s.finalFees)}</strong></div><div class="receipt-row"><span>Total paid</span><strong>${money(s.totalPaid)}</strong></div><div class="receipt-row"><span>Remaining</span><strong>${money(s.remaining)}</strong></div><h3>Payment history</h3>${p.map((x) => `<div class="receipt-row"><span>${x.receiptNumber} &middot; ${date(x.paymentDate)}</span><strong>${money(x.amount)}</strong></div>`).join("") || '<div class="empty">No payments</div>'}</div>`;
  modal.showModal();
  $("#closeModal").onclick = closeModal;
}
async function receipt(id) {
  const p = payments.find((x) => x._id === id);
  if (!p) return;
  try {
    const [{ student, payments: history }, { settings }] = await Promise.all([get(`/billing/students/${p.studentId._id}`), get("/settings")]),
      model = createReceiptModel(p, student, history, settings);
    modal.innerHTML = `<div class="modal-body"><div class="legacy-modal-toolbar"><button type="button" class="dialog-close" id="closeReceipt" aria-label="Close receipt">${closeIconSVG}</button></div>${renderReceiptHTML(model)}<div class="form-actions"><button class="btn btn-secondary" id="printReceipt">Print receipt</button><button class="btn btn-primary" id="pdf">Download PDF</button></div></div>`;
    modal.showModal();
    $("#closeReceipt").onclick = closeModal;
    $("#printReceipt").onclick = () => window.print();
    $("#pdf").onclick = async () => {
      try {
        await generateReceiptPDF(model, `Receipt_${p.receiptNumber}_${student.name.replace(/\s+/g, "-")}.pdf`);
      } catch (error) {
        toast(error.message, "error");
      }
    };
  } catch (error) {
    toast(error.message, "error");
  }
}
const dashboardPages = new Set(["dashboard", "students", "student-profile", "pending", "add-student", "fee-collection", "payments", "classes", "class-profile", "reports", "settings"]);
const obsoleteDashboardPages = new Set(["payment-settings", "payment-account", "subscription", "plans", "pricing", "attendance", "attendance-reports", "subjects"]);
export function getDashboardRoute() {
  const rawHash = location.hash.slice(1).trim(),
    [requestedPage = "dashboard", queryString = ""] = rawHash.split("?"),
    page = dashboardPages.has(requestedPage) ? requestedPage : "dashboard";
  if (page === "dashboard" && rawHash && (!dashboardPages.has(requestedPage) || obsoleteDashboardPages.has(requestedPage))) history.replaceState(null, "", location.pathname);
  return { page, params: new URLSearchParams(page === "dashboard" && requestedPage !== "dashboard" ? "" : queryString) };
}
function destroyAcademicPages() {
  destroyClassProfile();
  destroyStudentProfile();
}
function cleanupCurrentView() {
  destroyModal();
  if (modal.open) modal.close();
  modal.innerHTML = "";
  destroyAcademicPages();
  charts.forEach((chart) => chart.destroy?.());
  charts = [];
  $("#sidebar").classList.remove("open");
  $("#overlay").classList.remove("show");
  document.body.classList.remove("modal-open");
}
async function route() {
  const { page, params } = getDashboardRoute();
  cleanupCurrentView();
  $$(".side-link").forEach((x) => x.classList.toggle("active", x.dataset.page === page));
  try {
    if (page === "dashboard") {
      await dashboard();
    } else if (page === "students") {
      await renderStudentDirectory(root);
    } else if (page === "student-profile") await renderStudentProfile(root, params);
    else if (page === "pending") await renderStudentDirectory(root, "pending");
    else if (page === "add-student") {
      await loadData();
      const contextClass = classes.find((c) => String(c._id) === String(params.get("classId")));
      renderStudentForm(
        root,
        contextClass ? { classId: contextClass._id, standard: contextClass.standard, division: contextClass.division, academicYear: contextClass.academicYear, returnToClassId: contextClass._id } : {},
      );
    } else if (page === "fee-collection") await renderCollectPaymentPage(root);
    else if (page === "payments") await renderPaymentHistoryPage(root);
    else if (page === "classes") await classPage();
    else if (page === "class-profile") await renderClassProfile(root, params);
    else if (page === "reports") await renderFinancialReports(root);
    else if (page === "settings") await renderReceiptSettings(root, { user: me, modal, closeModal });
    else {
      console.warn("Unknown dashboard route:", page);
      root.innerHTML = `<div class="card empty"><h2>Page not found</h2><p>The requested dashboard page does not exist.</p><a class="btn btn-primary" href="#dashboard">Back to Dashboard</a></div>`;
    }
  } catch (e) {
    console.error(`Dashboard route failed: ${page}`, e);
    root.innerHTML = `<div class="card empty"><h3>Something went wrong</h3><p>${escapeHTML(e.message)}</p><div class="form-actions"><a class="btn btn-primary" href="#dashboard">Back to Dashboard</a><button class="btn btn-secondary" onclick="location.reload()">Retry</button></div></div>`;
  }
}
document.addEventListener("click", async (e) => {
  const go = e.target.closest("[data-go]");
  if (go) location.hash = go.dataset.go;
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const { action, id } = b.dataset;
  if (action === "view") viewStudent(id);
  if (action === "edit") {
    const { student } = await get(`/billing/students/${id}`);
    await loadData();
    renderStudentForm(root, student);
  }
  if (action === "pay") paymentForm(id);
  if (action === "delete" && confirm("Delete this student and all payments?")) {
    await del(`/billing/students/${id}`);
    toast("Student deleted");
    route();
  }
  if (action === "delete-payment" && confirm("Delete this payment and recalculate the balance?")) {
    await del(`/billing/payments/${id}`);
    toast("Payment deleted");
    route();
  }
  if (action === "receipt") {
    if (!payments.some((item) => String(item._id) === String(id))) {
      const data = await get("/billing/payments");
      payments = data.payments;
    }
    receipt(id);
  }
  if (action === "edit-class") classModal(classes.find((c) => c._id === id));
  if (action === "delete-class" && confirm("Delete this class?")) {
    try {
      await del(`/billing/classes/${id}`);
      toast("Class deleted");
      classPage();
    } catch (err) {
      toast(err.message, "error");
    }
  }
});
window.addEventListener("hashchange", route);
bootstrap();
