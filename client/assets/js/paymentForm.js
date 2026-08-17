import { post, get } from "./api.js";
import { escapeHTML, toast, busy, actionToast, closeIconSVG } from "./ui.js";
import { formatCurrency } from "./currency.js";
import { openModal, closeModal } from "./modalManager.js";
import { createReceiptModel, renderReceiptHTML } from "./receipt.js";

/* =========================
   Helpers
========================== */

export const createClientRequestId = () => globalThis.crypto?.randomUUID?.() || `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const paymentModeLabel = (value) =>
  ({
    cash: "Cash",
    upi: "Google Pay / UPI",
    bank_transfer: "Bank Transfer",
    card: "Card",
    cheque: "Cheque",
    other: "Other",

    Cash: "Cash",
    UPI: "Google Pay / UPI",
    "Bank Transfer": "Bank Transfer",
    Card: "Card",
    Cheque: "Cheque",
    Other: "Other",
  })[value] || value;

/* =========================
   Record Payment Modal
========================== */

export function openRecordPaymentModal(student, fees, { onSuccess = () => {} } = {}) {
  if (fees.remainingAmount <= 0) {
    return toast("This student has already paid the full amount.", "error");
  }

  const clientRequestId = createClientRequestId();

  const content = `
    <form
      class="app-modal-dialog record-payment-dialog"
      id="profilePaymentForm"
    >

      <header
        class="app-modal-header record-payment-header"
      >

        <div>
          <span class="eyebrow">
            PAYMENT RECEIVED
          </span>

          <h2>
            Record Payment
          </h2>

          <p>
            Use this only when money has already been
            received by the institute.
          </p>
        </div>


        <button
          type="button"
          class="dialog-close"
          data-modal-close
          aria-label="Close"
        >
          ${closeIconSVG}
        </button>

      </header>


      <div
        class="app-modal-body record-payment-body"
      >

        <div
          class="form-error-summary"
          data-modal-error
          tabindex="-1"
          hidden
        ></div>


        <!-- Student Summary -->

        <section
          class="payment-student-summary"
          aria-label="Student payment summary"
        >

          <div class="payment-student-identity">
            <strong>
              ${escapeHTML(student.name)}
            </strong>

            <span>
              ${escapeHTML(student.studentId)}
            </span>
          </div>


          <div
            class="
              payment-summary-grid
              payment-baseline-summary
            "
          >

            <div>
              <small>
                Final Payable
              </small>

              <strong>
                ${formatCurrency(fees.finalPayableFees)}
              </strong>
            </div>


            <div>
              <small>
                Previously Paid
              </small>

              <strong>
                ${formatCurrency(fees.totalPaid)}
              </strong>
            </div>


            <div>
              <small>
                Remaining
              </small>

              <strong>
                ${formatCurrency(fees.remainingAmount)}
              </strong>
            </div>

          </div>

        </section>


        <!-- Payment Preview -->

        <section>

          <h3 class="payment-section-title">
            Payment preview
          </h3>


          <div
            class="
              payment-live-preview
              payment-summary-grid
            "
            aria-live="polite"
          >

            <div>
              <small>
                Current Payment
              </small>

              <strong id="previewPayment">
                ${formatCurrency(0)}
              </strong>
            </div>


            <div>
              <small>
                Paid After
              </small>

              <strong id="previewPaid">
                ${formatCurrency(fees.totalPaid)}
              </strong>
            </div>


            <div>
              <small>
                Remaining After
              </small>

              <strong id="previewRemaining">
                ${formatCurrency(fees.remainingAmount)}
              </strong>
            </div>

          </div>

        </section>


        <!-- Payment Fields -->

        <div
          class="form-grid record-payment-fields"
        >

          <label class="form-field">

            <span>
              Payment amount *
            </span>

            <input
              name="amount"
              type="number"
              min="0.01"
              max="${fees.remainingAmount}"
              step="0.01"
              required
            >

          </label>


          <label class="form-field">

            <span>
              Payment date *
            </span>

            <input
              name="paymentDate"
              type="date"
              value="${new Date().toISOString().slice(0, 10)}"
              required
            >

          </label>


          <label class="form-field">

            <span>
              Payment mode *
            </span>

            <select
              name="paymentMode"
              required
            >

              <option value="cash">
                Cash
              </option>

              <option value="upi">
                Google Pay / UPI
              </option>

              <option value="bank_transfer">
                Bank Transfer
              </option>

              <option value="card">
                Card
              </option>

              <option value="cheque">
                Cheque
              </option>

              <option value="other">
                Other
              </option>

            </select>

          </label>


          <label class="form-field">

            <span>
              Reference / UTR
            </span>

            <input
              name="transactionReference"
              autocomplete="off"
            >

          </label>


          <label class="form-field">

            <span>
              Collected by *
            </span>

            <input
              name="collectedBy"
              value="Administrator"
              required
            >

          </label>


          <label class="form-field full">

            <span>
              Notes
            </span>

            <textarea
              name="notes"
              rows="4"
            ></textarea>

          </label>

        </div>

      </div>


      <footer
        class="app-modal-footer record-payment-footer"
      >

        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close
        >
          Cancel
        </button>


        <button
          class="btn btn-primary"
        >
          Record Payment
        </button>

      </footer>

    </form>
  `;

  /* =========================
     Open Modal
  ========================== */

  const dialog = openModal({
    content,
    size: "large",
  });

  const form = dialog.querySelector("form");

  const errorBox = form.querySelector("[data-modal-error]");

  /* =========================
     Live Payment Preview
  ========================== */

  const updatePreview = () => {
    const amount = Math.max(0, Math.min(Number(form.amount.value) || 0, fees.remainingAmount));

    dialog.querySelector("#previewPayment").textContent = formatCurrency(amount);

    dialog.querySelector("#previewPaid").textContent = formatCurrency(fees.totalPaid + amount);

    dialog.querySelector("#previewRemaining").textContent = formatCurrency(fees.remainingAmount - amount);
  };

  form.amount.addEventListener("input", updatePreview);

  /* =========================
     Transaction Reference
  ========================== */

  const reference = form.elements.transactionReference;

  const updateReference = () => {
    const paymentMode = form.elements.paymentMode.value;

    const cash = paymentMode === "cash";

    if (cash) {
      reference.value = "";
    }

    reference.disabled = cash;

    reference.placeholder = cash ? "Not required for cash" : paymentMode === "cheque" ? "Enter cheque number" : "Enter transaction reference / UTR";
  };

  form.elements.paymentMode.addEventListener("change", updateReference);

  updateReference();

  /* =========================
     Submit Payment
  ========================== */

  form.onsubmit = async (event) => {
    event.preventDefault();

    errorBox.hidden = true;

    const button = event.submitter;

    const data = Object.fromEntries(new FormData(form));

    data.studentId = student._id;

    data.amount = Number(data.amount);

    data.clientRequestId = clientRequestId;

    /* Development Debug */

    if (globalThis.location?.hostname === "localhost") {
      console.debug("Submitting payment", {
        endpoint: "/api/billing/payments",

        method: "POST",

        studentId: data.studentId,

        amount: data.amount,

        paymentDate: data.paymentDate,

        paymentMode: data.paymentMode,
      });
    }

    try {
      busy(button, true, "Recording...");

      const result = await post("/billing/payments", data);

      closeModal({
        force: true,
      });

      await onSuccess(result);

      /* Notify Other Billing Views */

      window.dispatchEvent(
        new CustomEvent("billing:payment-recorded", {
          detail: {
            studentId: student._id,

            summary: result.summary,

            payment: result.payment,
          },
        }),
      );

      /* Success Notification */

      actionToast({
        title: "✓ Payment recorded successfully  ",

        message: `${formatCurrency(data.amount)} received from ${student.name}. Remaining: ${formatCurrency(result.summary.remainingAmount)}`,

        actionLabel: "View receipt",

        onAction: () => openReceipt(student, result),
      });
    } catch (error) {
      errorBox.textContent = error.message;

      errorBox.hidden = false;

      errorBox.focus();

      busy(button, false);
    }
  };
}

/* =========================
   Receipt Modal
========================== */

async function openReceipt(student, result) {
  try {
    const [{ student: updated, payments }, { settings }] = await Promise.all([get(`/billing/students/${student._id}`), get("/settings")]);

    const model = createReceiptModel(result.payment, updated, payments, settings);

    model.paymentMode = paymentModeLabel(model.paymentMode);

    openModal({
      size: "large",

      content: `
        <section class="app-modal-dialog">

          <div class="app-modal-body">

            ${renderReceiptHTML(model)}

            <div class="form-actions">

              <button
                class="btn btn-secondary"
                data-modal-close
              >
                Close
              </button>

            </div>

          </div>

        </section>
      `,
    });
  } catch (error) {
    toast(error.message, "error");
  }
}
