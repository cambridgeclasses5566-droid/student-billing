import { escapeHTML, money, date } from "./ui.js";

const tones = ["rose", "amber", "mint", "sky", "violet", "peach"];

export function studentInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : parts[0]?.[0] || "S").toUpperCase();
}

export function avatarTone(value = "") {
  const index = [...String(value)].reduce((sum, character) => sum + character.charCodeAt(0), 0) % tones.length;
  return tones[index];
}

const statusClass = (status) =>
  String(status || "Unpaid")
    .toLowerCase()
    .replace(/\s+/g, "-");

export function mobileEmpty(title, copy = "") {
  return `<div class="mobile-empty"><span aria-hidden="true">⌕</span><strong>${escapeHTML(title)}</strong>${copy ? `<p>${escapeHTML(copy)}</p>` : ""}</div>`;
}

export function studentMobileCard(student, { pending = false, href = "#", archived = false } = {}) {
  const payable = Number(student.finalPayablePaise ?? 0) / 100;
  const paid = Number(student.totalPaid || 0);
  const remaining = Number(student.remaining || 0);
  const status = student.status || "Unpaid";
  const className = student.currentClass?.name || "Unassigned";

  return `<article class="mobile-record-card student-mobile-card${pending ? " pending-mobile-card" : ""}">
    <header class="mobile-record-head">
      <span class="mobile-avatar tone-${avatarTone(student.name)}">${studentInitials(student.name)}</span>

      <div class="mobile-record-identity">
        <small>${escapeHTML(student.studentId || "Student")}</small>
        <h2>${escapeHTML(student.name || "Student")}</h2>
        <p>
          <span aria-hidden="true">⌂</span>
          ${escapeHTML(className)}
        </p>
      </div>

      <span class="mobile-status status-${statusClass(status)}">
        ${escapeHTML(status)}
      </span>
    </header>

    ${
      pending
        ? `<div class="mobile-due-focus">
            <small>Amount still due</small>
            <strong>${money(remaining)}</strong>
            <span>of ${money(payable)} payable</span>
          </div>`
        : ""
    }

    <div class="mobile-money-grid">
      <div>
        <strong>${money(payable)}</strong>
        <small>Payable</small>
      </div>

      <div>
        <strong>${money(paid)}</strong>
        <small>Paid</small>
      </div>

      <div class="${remaining > 0 ? "is-due" : ""}">
        <strong>${money(remaining)}</strong>
        <small>Remaining</small>
      </div>
    </div>

    <footer class="mobile-record-footer">
      <span class="mobile-meta">
        <span aria-hidden="true">☎</span>
        ${escapeHTML(student.mobile || "No mobile")}
      </span>

      <div class="mobile-student-actions">

        <a class="mobile-open-action" href="${href}">
          Open profile
          <span aria-hidden="true">›</span>
        </a>

        ${
          !pending
            ? `
              <div class="student-menu-wrap">
                <button
                  type="button"
                  class="student-menu-btn"
                  data-student-menu="${student._id}"
                  aria-label="Student actions"
                  aria-expanded="false"
                >
                  ⋮
                </button>

                <div
                  class="student-menu"
                  data-student-menu-panel="${student._id}"
                  hidden
                >
                  <button
                    type="button"
                    class="${archived ? "student-restore-menu-item" : "student-delete-menu-item"}"
                    data-student-id="${student._id}"
                    data-student-name="${escapeHTML(student.name)}"
                    data-student-code="${escapeHTML(student.studentId)}"
                  >
                    ${archived ? "Restore Student" : "Delete Student"}
                  </button>
                </div>
              </div>
            `
            : ""
        }

      </div>
    </footer>
  </article>`;
}

export function paymentMobileCard(item, modeLabel) {
  const className = [item.studentId?.standard, item.studentId?.division].filter(Boolean).join("-") || "Unassigned";
  return `<article class="mobile-record-card payment-mobile-card">
    <header class="payment-card-head"><span class="mobile-icon-tile" aria-hidden="true">▤</span><div><small>RECEIPT</small><h2>${escapeHTML(item.receiptNumber || "Receipt")}</h2></div><strong>${money(item.amount)}</strong></header>
    <div class="payment-card-student"><div><strong>${escapeHTML(item.studentId?.name || "Student")}</strong><span>${escapeHTML(item.studentId?.studentId || "—")} · ${escapeHTML(className)}</span></div><button class="mobile-receipt-action" data-action="receipt" data-id="${item._id}">View receipt</button></div>
    <footer class="mobile-metadata-grid"><span><small>Mode</small>${escapeHTML(modeLabel)}</span><span><small>Date</small>${date(item.paymentDate)}</span><span><small>Source</small>${item.feeRequestId ? "Verified UPI" : "Manual"}</span></footer>
  </article>`;
}

export function reportMobileCard(payment) {
  const className = [payment.studentId?.standard, payment.studentId?.division].filter(Boolean).join("-") || "—";
  return `<article class="mobile-record-card report-mobile-card">
    <header><div><small>${escapeHTML(payment.receiptNumber || "Receipt")}</small><span>${date(payment.paymentDate)}</span></div><strong>${money(payment.amount)}</strong></header>
    <div class="report-card-grid"><span><small>Student</small><strong>${escapeHTML(payment.studentId?.name || "Student")}</strong></span><span><small>Student ID</small><strong>${escapeHTML(payment.studentId?.studentId || "—")}</strong></span><span><small>Class</small><strong>${escapeHTML(className)}</strong></span></div>
    <footer><small>Payment mode</small><strong>${escapeHTML(payment.paymentMode || "—")}</strong></footer>
  </article>`;
}
