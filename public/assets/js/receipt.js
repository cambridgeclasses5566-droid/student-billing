import { escapeHTML } from "./ui.js";
import { formatCurrency } from "./currency.js";

const EMPTY = "—";
const initials = (name) =>
  (name || "Institute")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const replaceInstitute = (text, name) => String(text || "").replaceAll("{Institute Name}", name || "the institute");
const asText = (value) => (value === null || value === undefined || String(value).trim() === "" ? EMPTY : String(value).trim());
const toPaise = (value) => Math.round((Number(value) || 0) * 100);
const fromPaise = (value) => (Number(value) || 0) / 100;
const hasInteger = (value) => Number.isInteger(Number(value));
const paymentPaise = (payment) => (hasInteger(payment?.amountPaise) ? Number(payment.amountPaise) : toPaise(payment?.amount));

export const formatReceiptCurrency = (amount) => formatCurrency(Math.max(0, Number(amount) || 0)).replace(/\s+/g, "");

export const formatPdfCurrency = (amount) =>
  `Rs. ${Math.max(0, Number(amount) || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export function formatReceiptDate(value, format = "DD/MM/YYYY") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return EMPTY;
  const day = String(parsed.getDate()).padStart(2, "0"),
    month = String(parsed.getMonth() + 1).padStart(2, "0"),
    year = parsed.getFullYear();
  if (String(format).toUpperCase() === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  if (String(format).toUpperCase() === "MM/DD/YYYY") return `${month}/${day}/${year}`;
  if (String(format).toUpperCase() === "DD MMM YYYY") return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `${day}/${month}/${year}`;
}

export const paymentReferenceLabel = (mode) =>
  ({ upi: "Transaction ID / UTR", card: "Transaction Reference", bank_transfer: "Transaction Reference / UTR", cheque: "Cheque Number", cash: "Reference", other: "Transaction Reference" })[
    String(mode || "").toLowerCase()
  ] || "Transaction Reference";
export const receiptPaymentModeLabel = (mode) =>
  ({ cash: "Cash", upi: "Google Pay / UPI", bank_transfer: "Bank Transfer", card: "Card", cheque: "Cheque", other: "Other" })[String(mode || "").toLowerCase()] || asText(mode);

function chronological(payments) {
  return [...(payments || [])].sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate) || new Date(a.createdAt) - new Date(b.createdAt) || String(a._id).localeCompare(String(b._id)));
}

export function createReceiptModel(payment = {}, student = {}, studentPayments = [], settings = {}, sample = false) {
  const ordered = chronological(studentPayments),
    index = ordered.findIndex((item) => String(item._id) === String(payment._id));
  const derivedPreviousPaise = ordered.slice(0, index < 0 ? 0 : index).reduce((sum, item) => sum + paymentPaise(item), 0);
  const currentPaise = paymentPaise(payment),
    studentPayablePaise = hasInteger(student.finalPayablePaise) ? Number(student.finalPayablePaise) : toPaise(student.finalFees);
  const totalPayablePaise = hasInteger(payment.receiptTotalPayablePaise) ? Number(payment.receiptTotalPayablePaise) : studentPayablePaise;
  const previousPaidPaise = hasInteger(payment.receiptPreviousPaidPaise) ? Number(payment.receiptPreviousPaidPaise) : derivedPreviousPaise;
  const balanceAfterPaise = hasInteger(payment.receiptBalanceAfterPaise) ? Number(payment.receiptBalanceAfterPaise) : Math.max(0, totalPayablePaise - previousPaidPaise - currentPaise);
  const instituteName = asText(settings.instituteName) === "—" ? "Your Institute" : asText(settings.instituteName),
    classInfo = student.classId && typeof student.classId === "object" ? student.classId : student.currentClass;
  const discountPaise = hasInteger(student.discountPaise) ? Number(student.discountPaise) : toPaise(student.discount),
    originalFeesPaise = hasInteger(student.totalFeesPaise) ? Number(student.totalFeesPaise) : toPaise(student.totalFees);
  return {
    sample,
    receiptTitle: String(settings.receiptTitle || "").trim() || "Fee Receipt",
    receiptNumber: sample ? payment.receiptNumber || "SAMPLE RECEIPT" : asText(payment.receiptNumber),
    paymentDate: payment.paymentDate || payment.createdAt,
    formattedDate: formatReceiptDate(payment.paymentDate || payment.createdAt, settings.dateFormat),
    paymentMode: receiptPaymentModeLabel(payment.paymentMode),
    paymentModeValue: String(payment.paymentMode || "").toLowerCase(),
    referenceLabel: paymentReferenceLabel(payment.paymentMode),
    transactionReference: asText(payment.transactionReference),
    collectedBy: asText(payment.collectedBy),
    notes: asText(payment.notes),
    studentId: asText(student.studentId),
    studentName: asText(student.name),
    studentMobile: asText(student.mobile),
    studentEmail: asText(student.email),
    formattedAdmissionDate: formatReceiptDate(student.admissionDate, settings.dateFormat),
    className: asText(classInfo?.name || student.className),
    standard: asText(student.standard),
    division: asText(student.division),
    academicYear: asText(student.academicYear || settings.academicYear),
    originalFees: fromPaise(originalFeesPaise),
    discount: fromPaise(discountPaise),
    showDiscount: discountPaise > 0 && originalFeesPaise > 0,
    totalPayable: fromPaise(totalPayablePaise),
    previousPaid: fromPaise(previousPaidPaise),
    currentPayment: fromPaise(currentPaise),
    totalPaid: fromPaise(previousPaidPaise + currentPaise),
    remaining: fromPaise(Math.max(0, balanceAfterPaise)),
    instituteName,

    logoUrl: settings.logoUrl || "",
    signatureUrl: settings.signatureUrl || "",
    stampUrl: settings.stampUrl || "",

    address: asText(settings.address),
    mobile: asText(settings.mobile),
    email: asText(settings.email),

    thankYouHeading: String(settings.receiptThankYouHeading || "").trim() || "Thank you for your payment!",

    thankYouMessage: replaceInstitute(
      String(settings.receiptThankYouMessage || "").trim() || "We appreciate your trust in {Institute Name}. Please keep this receipt for your records.",
      instituteName,
    ),

    terms: String(settings.receiptTerms || "").trim(),
    footer: String(settings.receiptFooter || "").trim(),
    signatory: String(settings.authorizedSignatory || "").trim(),
  };
}

export function receiptSummaryRows(model, formatter = formatReceiptCurrency) {
  const rows = [];

  if (model.showDiscount) {
    rows.push(["Original Fees", formatter(model.originalFees), ""], ["Discount", formatter(model.discount), "discount"]);
  }

  rows.push(
    ["Total Payable", formatter(model.totalPayable), ""],
    ["Previously Paid", formatter(model.previousPaid), ""],
    ["Amount Received", formatter(model.currentPayment), "received"],
    ["Balance Due", formatter(model.remaining), model.remaining > 0 ? "balance-due" : "balance-clear"],
  );

  return rows;
}

export function receiptPaymentDetailRows(model) {
  return [
    ["Payment Mode", model.paymentMode],
    [model.referenceLabel, model.transactionReference],
    ["Collected By", model.collectedBy],
    ["Payment Notes", model.notes],
  ];
}

const detailGrid = (rows) => rows.map(([label, value]) => `<div class="receipt-detail-item"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong></div>`).join("");

export function renderReceiptHTML(model) {
  const brand = model.logoUrl
    ? `<img class="receipt-logo" src="${escapeHTML(model.logoUrl)}" alt="${escapeHTML(model.instituteName)} logo">`
    : `<span class="receipt-initials">${initials(model.instituteName)}</span>`;
  const studentRows = [
    ["Student Name", model.studentName],
    ["Student ID", model.studentId],
    ["Student Mobile", model.studentMobile],
    ["Class / Batch", model.className],
    ["Standard", model.standard],
    ["Division", model.division],
    ["Academic Year", model.academicYear],
    ["Admission Date", model.formattedAdmissionDate],
    ["Email", model.studentEmail],
  ];
  const summary = `<section class="receipt-section receipt-summary-section"><h3>Payment Summary</h3><table class="receipt-summary"><tbody>${receiptSummaryRows(model)
    .map(([label, value, style]) => `<tr class="${style}"><td>${escapeHTML(label)}</td><td>${escapeHTML(value)}</td></tr>`)
    .join("")}</tbody></table></section>`;
  const paymentDetails = `<section class="receipt-section receipt-payment-section"><h3>Payment Details</h3><div class="receipt-detail-grid receipt-payment-details">${detailGrid(receiptPaymentDetailRows(model))}</div></section>`;
  return `<article class="receipt-pro"><header class="receipt-pro-head"><div class="receipt-brand-block">${brand}<div><h2>${escapeHTML(model.instituteName)}</h2><p>${escapeHTML(model.address)}</p><p>${escapeHTML(model.mobile)}</p><p>${escapeHTML(model.email)}</p></div></div><div class="receipt-title-block"><span>${escapeHTML(model.receiptTitle)}</span><strong>${escapeHTML(model.receiptNumber)}</strong><small>${escapeHTML(model.formattedDate)}</small></div></header><section class="receipt-section"><h3>Student Details</h3><div class="receipt-detail-grid receipt-student-details">${detailGrid(studentRows)}</div></section><div class="receipt-finance-grid">${summary}${paymentDetails}</div><section class="receipt-thanks"><h3>${escapeHTML(model.thankYouHeading)}</h3><p>${escapeHTML(model.thankYouMessage)}</p></section>${model.terms ? `<section class="receipt-terms"><h3>Terms &amp; Conditions</h3><p>${escapeHTML(model.terms)}</p></section>` : ""}
  <footer class="receipt-pro-footer">

  <div class="receipt-footer-note">
    <p>${escapeHTML(model.footer || EMPTY)}</p>
  </div>

  <div class="receipt-signature">
    <div class="receipt-auth-images">
      ${
        model.stampUrl
          ? `<img
              class="receipt-stamp-image"
              src="${escapeHTML(model.stampUrl)}"
              alt="Institute stamp"
            >`
          : ""
      }

      ${
        model.signatureUrl
          ? `<img
              class="receipt-signature-image"
              src="${escapeHTML(model.signatureUrl)}"
              alt="Authorized signature"
            >`
          : ""
      }
    </div>
    <span
      class="receipt-signature-line"
      aria-hidden="true"
    ></span>
    <strong>Authorized Signature</strong>
    ${model.signatory ? `<small>${escapeHTML(model.signatory)}</small>` : ""}
  </div>
</footer>
  </article>`;
}

async function imageForPdf(url) {
  if (!url) return null;
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas"),
          scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ data: canvas.toDataURL("image/png"), width: image.naturalWidth, height: image.naturalHeight });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = url;
  });
}

export async function generateReceiptPDF(model, filename) {
  if (!window.jspdf) throw new Error("PDF library is unavailable.");
  const { jsPDF } = window.jspdf,
    doc = new jsPDF({ unit: "mm", format: "a4" }),
    pageWidth = 210,
    pageHeight = 297,
    margin = 15,
    contentWidth = 180;
  let y = 15,
    logo = null,
    signatureImage = null,
    stampImage = null;

  try {
    logo = await imageForPdf(model.logoUrl);
  } catch {}

  try {
    signatureImage = await imageForPdf(model.signatureUrl);
  } catch {}

  try {
    stampImage = await imageForPdf(model.stampUrl);
  } catch {}
  const ensureSpace = (height) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };
  const sectionTitle = (title) => {
    ensureSpace(12);
    doc.setTextColor(153, 27, 27);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };
  const keyRows = (rows, { summary = false } = {}) =>
    rows.forEach(([label, value, style = ""]) => {
      ensureSpace(10);
      if (style === "received" || style === "balance-clear") doc.setFillColor(240, 253, 244);
      else if (style === "balance-due") doc.setFillColor(255, 247, 237);
      else doc.setFillColor(249, 250, 251);
      doc.roundedRect(margin, y - 5, contentWidth, 9, 1.5, 1.5, "F");
      doc.setTextColor(75, 85, 99);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(String(label), margin + 4, y);
      doc.setTextColor(
        style === "received" || style === "balance-clear" ? 21 : 17,
        style === "received" || style === "balance-clear" ? 128 : 24,
        style === "received" || style === "balance-clear" ? 61 : 39,
      );
      doc.setFont("helvetica", "bold");
      doc.text(String(value), pageWidth - margin - 4, y, { align: "right", maxWidth: summary ? 80 : 105 });
      doc.setFont("helvetica", "normal");
      y += 10;
    });
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 6, "F");
  let logoWidth = 24,
    logoHeight = 18;
  if (logo) {
    const ratio = logo.width / logo.height;
    logoHeight = ratio >= 1 ? logoWidth / ratio : 22;
    logoWidth = ratio >= 1 ? logoWidth : logoHeight * ratio;
    doc.addImage(logo.data, "PNG", margin, y, logoWidth, logoHeight, undefined, "FAST");
  } else {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, 20, 20, 4, 4, "F");
    doc.setTextColor(153, 27, 27);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(initials(model.instituteName), margin + 10, y + 12, { align: "center" });
  }
  const brandX = margin + (logo ? logoWidth : 20) + 6;
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(model.instituteName, brandX, y + 5, { maxWidth: 92 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(doc.splitTextToSize([model.address, model.mobile, model.email].filter((value) => value && value !== EMPTY).join("\n"), 88), brandX, y + 11);
  doc.setTextColor(220, 38, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(model.receiptTitle, pageWidth - margin, y + 4, { align: "right" });
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(9);
  doc.text(model.receiptNumber, pageWidth - margin, y + 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(model.formattedDate, pageWidth - margin, y + 17, { align: "right" });
  y += 30;
  sectionTitle("Student Details");
  keyRows([
    ["Student Name", model.studentName],
    ["Student ID", model.studentId],
    ["Student Mobile", model.studentMobile],
    ["Class / Batch", model.className],
    ["Standard", model.standard],
    ["Division", model.division],
    ["Academic Year", model.academicYear],
    ["Admission Date", model.formattedAdmissionDate],
    ["Email", model.studentEmail],
  ]);
  y += 3;
  sectionTitle("Payment Summary");
  keyRows(receiptSummaryRows(model, formatPdfCurrency), { summary: true });
  y += 3;
  sectionTitle("Payment Details");
  keyRows(receiptPaymentDetailRows(model));
  ensureSpace(22);
  y += 3;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin, y - 5, contentWidth, 18, 2, 2, "F");
  doc.setTextColor(153, 27, 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(model.thankYouHeading, margin + 4, y + 1);
  doc.setTextColor(75, 85, 99);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(model.thankYouMessage, contentWidth - 8), margin + 4, y + 7);
  y += 22;
  if (model.terms) {
    sectionTitle("Terms & Conditions");
    const terms = doc.splitTextToSize(model.terms, contentWidth);
    ensureSpace(terms.length * 4 + 5);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(terms, margin, y);
    y += terms.length * 4 + 6;
  }
  ensureSpace(46);
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize(model.footer || EMPTY, 95), margin, y);
  const signatureLineY = y + 24;

  const signatureX = pageWidth - 70;
  const signatureWidth = 55;

  /* Stamp */
  if (stampImage) {
    const stampSize = 24;

    doc.addImage(stampImage.data, "PNG", signatureX - 12, signatureLineY - 26, stampSize, stampSize, undefined, "FAST");
  }

  /* Signature */
  if (signatureImage) {
    const ratio = signatureImage.width / signatureImage.height;

    let sigWidth = 38;
    let sigHeight = sigWidth / ratio;

    if (sigHeight > 18) {
      sigHeight = 18;
      sigWidth = sigHeight * ratio;
    }

    doc.addImage(signatureImage.data, "PNG", signatureX + 12, signatureLineY - sigHeight - 2, sigWidth, sigHeight, undefined, "FAST");
  }

  /* Signature line */
  doc.setDrawColor(75, 85, 99);

  doc.line(signatureX, signatureLineY, pageWidth - margin, signatureLineY);

  /* Label */
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  doc.text("Authorized Signature", signatureX + signatureWidth / 2, signatureLineY + 6, {
    align: "center",
  });

  /* Signatory name */
  if (model.signatory) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);

    doc.text(model.signatory, signatureX + signatureWidth / 2, signatureLineY + 11, {
      align: "center",
    });
  }
  if (model.signatory) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(model.signatory, pageWidth - 42.5, signatureLineY + 11, { align: "center" });
  }
  doc.save(filename || `${model.sample ? "Sample_" : "Receipt_"}${model.receiptNumber.replace(/\s+/g, "_")}.pdf`);
}
