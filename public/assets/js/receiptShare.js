import { createReceiptModel, renderReceiptHTML, generateReceiptPDF } from "./receipt.js";

const shareId = window.location.pathname.split("/").filter(Boolean).pop();

const loading = document.querySelector("#loading");
const errorBox = document.querySelector("#error");
const receiptContent = document.querySelector("#receiptContent");

const showError = () => {
  loading.style.display = "none";
  receiptContent.style.display = "none";
  errorBox.style.display = "block";
};

const showReceipt = (receipt) => {
  const student = receipt.student || {};
  const institute = receipt.institute || {};

  const payment = {
    receiptNumber: receipt.receiptNumber,
    paymentDate: receipt.paymentDate,
    amount: receipt.amount,
    amountPaise: Math.round(Number(receipt.amount || 0) * 100),

    receiptTotalPayablePaise: Math.round(Number(receipt.totalPayable || 0) * 100),

    receiptPreviousPaidPaise: Math.round(Number(receipt.previouslyPaid || 0) * 100),

    receiptBalanceAfterPaise: Math.round(Number(receipt.balanceAfter || 0) * 100),

    paymentMode: receipt.paymentMode,
    transactionReference: receipt.transactionReference || "",

    collectedBy: receipt.collectedBy || "",

    notes: receipt.notes || "",
  };

  const receiptStudent = {
    studentId: student.studentId || "",
    name: student.name || "",
    mobile: student.mobile || "",
    email: student.email || "",
    admissionDate: student.admissionDate || "",
    className: student.className || "",
    standard: student.standard || "",
    division: student.division || "",
    academicYear: student.academicYear || "",
  };

  const settings = {
    instituteName: institute.name || "Cambridge Classes",

    address: institute.address || "",

    mobile: institute.phone || "",

    email: institute.email || "",

    logoUrl: institute.logoUrl || "",

    signatureUrl: institute.signatureUrl || "",

    stampUrl: institute.stampUrl || "",

    receiptTerms: institute.receiptTerms || "",

    receiptFooter: institute.receiptFooter || "",

    authorizedSignatory: institute.authorizedSignatory || "",

    receiptThankYouHeading: institute.receiptThankYouHeading || "",

    receiptThankYouMessage: institute.receiptThankYouMessage || "",
  };

  const model = createReceiptModel(payment, receiptStudent, [payment], settings);

  receiptContent.innerHTML = `
    <div id="printableReceipt">
      ${renderReceiptHTML(model)}
    </div>

    <div
      id="receiptActions"
      style="
        display:flex;
        justify-content:center;
        gap:10px;
        margin-top:24px;
      "
    >
      <button
        id="downloadReceiptBtn"
        type="button"
      >
        Download Receipt
      </button>

      <button
        id="printReceiptBtn"
        type="button"
      >
        Print
      </button>
    </div>
  `;

  loading.style.display = "none";
  errorBox.style.display = "none";
  receiptContent.style.display = "block";

  document.querySelector("#printReceiptBtn")?.addEventListener("click", () => {
    window.print();
  });

  document.querySelector("#downloadReceiptBtn")?.addEventListener("click", async () => {
    try {
      await generateReceiptPDF(model, `Receipt_${String(receipt.receiptNumber || "Receipt").replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      console.error("Receipt PDF download failed", error);

      alert("Unable to download receipt PDF.");
    }
  });
};

const loadReceipt = async () => {
  if (!shareId) {
    showError();
    return;
  }

  try {
    const response = await fetch(`/api/receipt-share/${encodeURIComponent(shareId)}`);

    const result = await response.json();

    if (!response.ok || !result?.data?.receipt) {
      showError();
      return;
    }

    showReceipt(result.data.receipt);
  } catch (error) {
    console.error("Receipt share load failed", error);

    showError();
  }
};

loadReceipt();
