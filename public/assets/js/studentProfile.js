import { get, del } from "./api.js";
import { escapeHTML, toast, date, busy } from "./ui.js";
import { formatCurrency } from "./currency.js";
import { openRecordPaymentModal, paymentModeLabel } from "./paymentForm.js";
import { createReceiptModel, renderReceiptHTML, generateReceiptPDF } from "./receipt.js";
import { openModal, closeModal } from "./modalManager.js";
import { renderBackButton, bindBackButtons } from "./navigation.js";
import { renderPaymentStatusBadge } from "./paymentStatus.js";

if (!document.querySelector("link[data-student-profile]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/assets/css/student-billing.css";
  link.dataset.studentProfile = "true";
  document.head.append(link);
}
let activeRoot = null,
  state = null,
  studentId = null,
  activeTab = "overview",
  profileOrigin = "students";
const badge = renderPaymentStatusBadge,
  empty = (value) => (value === null || value === undefined || value === "" ? "—" : value);
const fieldRows = (rows) => rows.map(([label, value]) => `<div class="profile-field"><span>${label}</span><strong>${escapeHTML(empty(value))}</strong></div>`).join("");
const infoCard = (title, rows) => `<article class="card profile-info-card"><h3>${title}</h3><div class="profile-field-grid">${fieldRows(rows)}</div></article>`;

export async function renderStudentProfile(root, params) {
  activeRoot = root;
  studentId = params.get("id") || params.get("studentId");
  activeTab = params.get("tab") || "overview";
  profileOrigin = params.get("origin") || profileOrigin;
  if (!studentId) {
    root.innerHTML = '<div class="card empty"><h2>Student not selected</h2><a class="btn btn-primary" href="#students">Back to Students</a></div>';
    return;
  }
  root.innerHTML = '<div class="page-loading skeleton">Loading student profile...</div>';
  try {
    const [summary, timelineData, full] = await Promise.all([get(`/students/${studentId}/billing-summary`), get(`/students/${studentId}/billing-timeline`), get(`/billing/students/${studentId}`)]),
      populatedClass = summary.student.classId;
    state = { ...summary, events: timelineData.events.filter((event) => event.type !== "request"), payments: full.payments, student: { ...full.student, ...summary.student, classId: populatedClass } };
    renderShell(profileOrigin);
  } catch (error) {
    root.innerHTML = `<div class="card empty"><h2>Student profile could not be loaded</h2><p>${escapeHTML(error.message)}</p><a class="btn btn-primary" href="#students">Back to Students</a></div>`;
  }
}
export function destroyStudentProfile() {
  activeRoot = null;
  state = null;
  studentId = null;
  activeTab = "overview";
}

function renderShell(origin) {
  const student = state.student,
    classInfo = student.classId || {},
    classOrigin = origin.startsWith("class-profile") ? `#${origin}` : "",
    backLabel = classOrigin ? `Back to ${classInfo.name || "Class"}` : "Back to Students";
  activeRoot.innerHTML = `<section class="student-profile-page">${renderBackButton({ fallbackRoute: "#students", label: backLabel, origin: classOrigin })}<header class="card student-hero"><div><span class="eyebrow">STUDENT PROFILE</span><h1>${escapeHTML(student.name)}</h1><p><strong>${escapeHTML(student.studentId)}</strong> · Standard ${escapeHTML(empty(student.standard))} · Division ${escapeHTML(empty(student.division))}</p>${badge(state.fees.status)}</div><div class="hero-actions"><button class="btn btn-primary" id="profileRecordPayment">Record Payment</button><button class="btn btn-secondary profile-secondary-action" data-action="edit" data-id="${student._id}">Edit Student</button><button class="btn btn-secondary profile-secondary-action" id="profileStatement">Download Statement</button><details class="profile-overflow-menu"><summary class="profile-kebab" aria-label="Student profile actions">⋮</summary><div class="profile-menu-panel" role="menu"><button type="button" class="profile-menu-secondary" data-action="edit" data-id="${student._id}" role="menuitem">Edit Student</button><button type="button" class="profile-menu-secondary" id="profileMenuStatement" role="menuitem">Download Statement</button><button type="button" class="profile-delete-action" id="profileDeleteStudent" role="menuitem">Delete Student</button></div></details></div></header><nav class="billing-tabs" role="tablist">${["overview", "billing", "timeline", "receipts", "details"].map((tab) => `<button role="tab" aria-selected="${activeTab === tab}" class="${activeTab === tab ? "active" : ""}" data-profile-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join("")}</nav><section id="studentProfileTab"></section></section>`;
  bindBackButtons(activeRoot);
  wire();
  renderTab(activeTab);
}
function feeCards() {
  const fees = state.fees;
  return `<section class="fee-cards"><article class="card"><small>Final Payable</small><strong>${formatCurrency(fees.finalPayableFees)}</strong></article><article class="card"><small>Total Paid</small><strong class="green">${formatCurrency(fees.totalPaid)}</strong></article><article class="card"><small>Remaining</small><strong class="red">${formatCurrency(fees.remainingAmount)}</strong></article><article class="card"><small>Status</small><strong>${badge(fees.status)}</strong></article></section>`;
}
function detailCards(student) {
  return `<div class="profile-info-grid">${infoCard("Personal Information", [
    ["Student Name", student.name],
    ["Age", student.age],
    ["D.O.B", date(student.dob)],
    ["Email", student.email],
    ["Student Mobile", student.mobile],
    ["Aadhaar Number", student.aadhaarNumber],
    ["Address", student.address],
  ])}${infoCard("Academic Information", [
    ["Academic Year", student.academicYear],
    ["Standard", student.standard],
    ["Class / Batch", student.classId?.name || "Unassigned"],
    ["Division", student.division],
  ])}${infoCard("Parent & Contact", [
    ["Father Name", student.fatherName],
    ["Mother Name", student.motherName],
    ["Parents Mobile", student.parentsMobileNumber],
  ])}${infoCard("Admission & Fees", [
    ["Admission Date", date(student.admissionDate)],
    ["Total Fees", formatCurrency(student.totalFees)],
    ["Discount", formatCurrency(student.discount)],
    ["Discounted Fees", formatCurrency(student.finalFees)],
    ["Notes", student.notes],
  ])}</div>`;
}
function renderTab(tab) {
  activeTab = tab;
  const target = activeRoot.querySelector("#studentProfileTab"),
    student = state.student;
  if (tab === "overview") {
    target.innerHTML = `${feeCards()}${detailCards(student)}`;
    return;
  }
  if (tab === "billing") {
    target.innerHTML = `${feeCards()}<div class="profile-tab-actions"><button class="btn btn-primary" id="billingRecord">Record Payment</button></div><article class="card panel"><h3>Payment History</h3>${paymentRows(state.payments)}</article>`;
    target.querySelector("#billingRecord").onclick = recordPayment;
    return;
  }
  if (tab === "timeline") {
    target.innerHTML = timeline(state.events);
    return;
  }
  if (tab === "receipts") {
    target.innerHTML = `<div class="receipt-list">${
      state.payments
        .map(
          (
            item,
          ) => `<article class="card receipt-row"><span><strong>${escapeHTML(item.receiptNumber)}</strong><small>${date(item.paymentDate)}</small></span><strong>${formatCurrency(item.amount)}</strong>
<div class="receipt-row-actions">
  <button
    type="button"
    class="btn btn-secondary receipt-whatsapp-btn"
    data-whatsapp-receipt="${item._id}"
    aria-label="Send receipt on WhatsApp"
    title="Send on WhatsApp"
  >
    <svg
  xmlns="http://www.w3.org/2000/svg"
  width="22"
  height="22"
  viewBox="0 0 16 16"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.93 7.93 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.25a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.591-6.592 6.591m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.066-.315-.099-.445.099-.133.197-.513.646-.627.775-.116.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.984-.59-.525-.986-1.173-1.102-1.371-.116-.197-.013-.304.087-.402.09-.088.197-.232.296-.347.1-.116.133-.198.198-.33.066-.133.033-.248-.017-.347-.05-.1-.445-1.075-.61-1.47-.16-.389-.323-.335-.445-.34-.116-.007-.248-.007-.38-.007a.73.73 0 0 0-.529.248c-.182.198-.692.677-.692 1.654s.71 1.916.81 2.049c.098.132 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.15.907.129 1.248.078.38-.058 1.171-.48 1.337-.943.164-.462.164-.859.115-.943-.05-.083-.182-.132-.38-.23"/>
</svg>
  </button>

  <button
    class="btn btn-secondary"
    data-profile-receipt="${item._id}"
  >
    View
  </button>
</div>
</article>`,
        )
        .join("") || '<div class="card empty">No receipts yet.</div>'
    }</div>`;
    bindReceiptButtons();
    return;
  }
  target.innerHTML = detailCards(student);
}
function paymentRows(rows) {
  return (
    rows
      .map(
        (item) =>
          `<div class="receipt-row"><span>${escapeHTML(item.receiptNumber)}<small>${date(item.paymentDate)} · ${escapeHTML(paymentModeLabel(item.paymentMode))}</small></span><strong>${formatCurrency(item.amount)}</strong></div>`,
      )
      .join("") || '<div class="empty">No payments recorded.</div>'
  );
}
function timeline(events) {
  return `<div class="timeline">${events.map((event) => `<article class="card timeline-event"><div><small>${date(event.date)}</small><strong>${escapeHTML(event.title)}</strong></div></article>`).join("") || '<div class="card empty">No activity yet.</div>'}</div>`;
}
async function reload() {
  const params = new URLSearchParams({ id: studentId, tab: activeTab, origin: profileOrigin });
  await renderStudentProfile(activeRoot, params);
}
function recordPayment() {
  openRecordPaymentModal(state.student, state.fees, { onSuccess: reload });
}
function wire() {
  activeRoot.querySelectorAll("[data-profile-tab]").forEach(
    (button) =>
      (button.onclick = () => {
        activeRoot.querySelectorAll("[data-profile-tab]").forEach((item) => {
          item.classList.toggle("active", item === button);
          item.setAttribute("aria-selected", item === button);
        });
        renderTab(button.dataset.profileTab);
      }),
  );
  activeRoot.querySelector("#profileRecordPayment").onclick = recordPayment;
  activeRoot.querySelector("#profileStatement").onclick = downloadStatement;
  activeRoot.querySelector("#profileMenuStatement").onclick = downloadStatement;
  activeRoot.querySelector("#profileDeleteStudent").onclick = confirmStudentDelete;
}

function confirmStudentDelete() {
  const student = state.student,
    studentName = student.name,
    trigger = activeRoot.querySelector("#profileDeleteStudent");
  const content = `<section class="app-modal-dialog student-delete-dialog"><header class="app-modal-header"><div><span class="eyebrow">PERMANENT ACTION</span><h2>Delete ${escapeHTML(studentName)}?</h2></div><button type="button" class="modal-close" data-modal-close aria-label="Close">×</button></header><div class="app-modal-body"><p>This permanently removes <strong>${escapeHTML(studentName)}</strong> (${escapeHTML(student.studentId)}) and their class enrolments.</p><p>Students with payment or fee-request history cannot be deleted. Their financial records and receipts will always be preserved.</p><p class="delete-student-error" id="deleteStudentError" role="alert" hidden></p><div class="form-actions"><button type="button" class="btn btn-secondary" data-modal-close autofocus>Cancel</button><button type="button" class="btn btn-danger" id="confirmDeleteStudent">Delete Student</button></div></div></section>`,
    dialog = openModal({ content, size: "small", trigger, preventBackdropClose: true }),
    confirmButton = dialog.querySelector("#confirmDeleteStudent"),
    errorBox = dialog.querySelector("#deleteStudentError");
  confirmButton.onclick = async () => {
    try {
      busy(confirmButton, true, "Deleting...");
      await del(`/billing/students/${student._id}`);
      closeModal({ force: true, restoreFocus: false });
      toast(`${studentName} was deleted.`);
      location.hash = "students";
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = error.message;
      toast(error.message, "error");
      busy(confirmButton, false);
    }
  };
}
function bindReceiptButtons() {
  activeRoot.querySelectorAll("[data-profile-receipt]").forEach((button) => {
    button.onclick = () => showReceipt(button.dataset.profileReceipt);
  });

  activeRoot.querySelectorAll("[data-whatsapp-receipt]").forEach((button) => {
    button.onclick = () => sendReceiptToWhatsApp(button.dataset.whatsappReceipt);
  });
}

function whatsappNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  // Indian 10-digit mobile number
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // Already includes country code
  return digits;
}

async function sendReceiptToWhatsApp(id) {
  try {
    const student = state.student;

    const mobile = whatsappNumber(student.mobile || student.parentsMobileNumber);

    if (!mobile) {
      toast("Student mobile number is not available.", "error");
      return;
    }

    const payment = state.payments.find((item) => String(item._id) === String(id));

    if (!payment) {
      toast("Receipt was not found.", "error");
      return;
    }

    const response = await fetch(`/api/billing/payments/${id}/share`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message || "Receipt share link could not be created.");
    }

    const shareUrl = result?.data?.shareUrl;

    if (!shareUrl) {
      throw new Error("Receipt share link was not returned.");
    }

    const message = [
      `Hello ${student.name},`,
      "",
      "Payment received successfully.",
      "",
      `Receipt No: ${payment.receiptNumber}`,
      `Amount Paid: ${formatCurrency(payment.amount)}`,
      "",
      "View / Download Receipt:",
      shareUrl,
      "",
      "Cambridge Classes",
    ].join("\n");

    const whatsappUrl = `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("WhatsApp receipt share failed", error);

    toast(error.message || "Receipt could not be shared.", "error");
  }
}

async function showReceipt(id) {
  try {
    const [{ payment }, { settings }] = await Promise.all([get(`/billing/payments/${id}`), get("/settings")]),
      model = createReceiptModel(payment, state.student, state.payments, settings),
      content = `<section class="app-modal-dialog"><div class="app-modal-body">${renderReceiptHTML(model)}<div class="form-actions"><button class="btn btn-secondary" data-modal-close>Close</button><button class="btn btn-primary" id="profileDownloadReceipt">Download PDF</button></div></div></section>`,
      dialog = openModal({ content, size: "large" });
    dialog.querySelector("#profileDownloadReceipt").onclick = () => generateReceiptPDF(model, `Receipt_${payment.receiptNumber}_${state.student.name.replace(/\s+/g, "-")}.pdf`);
  } catch (error) {
    toast(error.message, "error");
  }
}
function downloadStatement() {
  const rows = [
      ["Date", "Receipt", "Mode", "Reference", "Amount"],
      ...state.payments.map((item) => [date(item.paymentDate), item.receiptNumber, item.paymentMode, item.transactionReference || "", item.amount]),
    ],
    csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n"),
    link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `Statement_${state.student.studentId}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
