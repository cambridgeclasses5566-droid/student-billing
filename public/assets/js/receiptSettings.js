import { get, put, del, upload } from "./api.js";
import { escapeHTML, toast, closeIconSVG } from "./ui.js";
import { createReceiptModel, renderReceiptHTML, generateReceiptPDF } from "./receipt.js";

const placeholderLogo =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100"%3E%3Crect width="100%25" height="100%25" rx="14" fill="%23fef2f2"/%3E%3Ctext x="50%25" y="55%25" text-anchor="middle" fill="%23991b1b" font-family="Arial" font-size="18"%3ELOGO%3C/text%3E%3C/svg%3E';
const field = (name, label, value, type = "input") =>
  `<label class="form-field${type === "textarea" ? " full" : ""}"><span>${label}</span>${type === "textarea" ? `<textarea name="${name}">${escapeHTML(value || "")}</textarea>` : `<input name="${name}" value="${escapeHTML(value || "")}">`}</label>`;
const section = (number, title, content) => `<section class="settings-section"><header class="settings-section-head"><span>SECTION ${number}</span><h2>${title}</h2></header>${content}</section>`;

export async function renderReceiptSettings(root, { user, modal, closeModal }) {
  const { settings: s } = await get("/settings");
  let previewSignature = s.signatureUrl || "";
  let previewStamp = s.stampUrl || "";
  let previewLogo = s.logoUrl || "";
  const identity = `<div class="logo-upload-card"><h3>Institute logo</h3><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><img id="currentLogo" class="logo-preview" alt="Current institute logo"><div><input id="logoFile" type="file" accept="image/png,image/jpeg,image/webp" hidden><button type="button" class="btn btn-secondary" id="replaceLogo">${s.logoUrl ? "Replace" : "Upload"} logo</button> <button type="button" class="btn btn-danger" id="removeLogo" ${s.logoUrl ? "" : "disabled"}>Remove logo</button><p style="font-size:12px;color:var(--muted)">PNG, JPG, JPEG, or WebP · maximum 2 MB</p><div id="logoMessage" class="message"></div></div></div></div><div class="form-grid" style="margin-top:16px">${field("instituteName", "Institute name", s.instituteName)}${field("mobile", "Mobile", s.mobile)}${field("email", "Email", s.email)}${field("address", "Address", s.address, "textarea")}</div>`;
  const configuration = `<div class="form-grid">${field("receiptTitle", "Receipt title", s.receiptTitle || "Fee Receipt")}${field("receiptPrefix", "Receipt prefix", s.receiptPrefix || "REC")}${field("currency", "Currency", s.currency || "INR")}${field("academicYear", "Academic year", s.academicYear)}${field("authorizedSignatory", "Authorized signatory", s.authorizedSignatory)}${field("timeZone", "Time zone", s.timeZone || "Asia/Kolkata")}<label class="form-field"><span>Date format</span><select name="dateFormat">${["DD/MM/YYYY", "DD MMM YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((value) => `<option value="${value}" ${String(s.dateFormat || "DD/MM/YYYY") === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div>`;
  const content = `
  <div class="form-grid">
    ${field("receiptThankYouHeading", "Receipt thank-you heading", s.receiptThankYouHeading || "Thank you for your payment!")}
    ${field("receiptThankYouMessage", "Receipt thank-you message", s.receiptThankYouMessage || "We appreciate your trust in {Institute Name}. Please keep this receipt for your records.", "textarea")}
    ${field("receiptTerms", "Terms & Conditions", s.receiptTerms, "textarea")}
    ${field("receiptFooter", "Receipt footer note", s.receiptFooter || "This is a computer-generated receipt. No physical signature is required.", "textarea")}
  </div>

  <div class="receipt-auth-upload-grid">

  <div class="logo-upload-card">
    <h3>Authorized signature</h3>

    <div class="receipt-upload-row">

      <img
        id="currentSignature"
        class="receipt-auth-image-preview signature-preview"
        alt="Authorized signature"
      >

      <div class="receipt-upload-controls">

        <input
          id="signatureFile"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
        >

        <div class="receipt-upload-buttons">
          <button
            type="button"
            class="btn btn-secondary"
            id="replaceSignature"
          >
            ${s.signatureUrl ? "Replace" : "Upload"} signature
          </button>

          <button
            type="button"
            class="btn btn-danger"
            id="removeSignature"
          >
            Remove signature
          </button>
        </div>

        <p class="receipt-upload-help">
          PNG, JPG, JPEG, or WebP · maximum 2 MB
        </p>

      </div>
    </div>
  </div>


  <div class="logo-upload-card">
    <h3>Institute stamp</h3>

    <div class="receipt-upload-row">

      <img
        id="currentStamp"
        class="receipt-auth-image-preview stamp-preview"
        alt="Institute stamp"
      >

      <div class="receipt-upload-controls">

        <input
          id="stampFile"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
        >

        <div class="receipt-upload-buttons">
          <button
            type="button"
            class="btn btn-secondary"
            id="replaceStamp"
          >
            ${s.stampUrl ? "Replace" : "Upload"} stamp
          </button>

          <button
            type="button"
            class="btn btn-danger"
            id="removeStamp"
          >
            Remove stamp
          </button>
        </div>

        <p class="receipt-upload-help">
          PNG, JPG, JPEG, or WebP · maximum 2 MB
        </p>

      </div>
    </div>
  </div>

</div>
`;
  root.innerHTML = `<header class="page-header"><div><p class="eyebrow">RECEIPT SYSTEM</p><h1>Institute settings</h1><p>Manage institute identity and customer-facing receipt content.</p></div></header><div class="settings-layout"><form class="card form-card" id="settingsForm">${section(1, "Institute identity", identity)}${section(2, "Receipt configuration", configuration)}${section(3, "Receipt content", content)}<div class="form-actions"><button type="button" class="btn btn-secondary" id="fullPreview">Preview full receipt</button><button type="button" class="btn btn-secondary" id="samplePdf">Download sample PDF</button><button class="btn btn-primary">Save receipt settings</button></div></form><aside class="card panel receipt-preview-sticky"><h3>Live receipt preview</h3><div id="liveReceipt"></div></aside></div>`;
  const form = root.querySelector("#settingsForm");

  const values = () => {
    const data = Object.fromEntries(new FormData(form));

    data.logoUrl = previewLogo;
    data.signatureUrl = previewSignature;
    data.stampUrl = previewStamp;

    return data;
  };
  const model = () => {
    const current = values(),
      receiptPrefix = String(current.receiptPrefix || "REC").trim() || "REC",
      samplePayment = {
        _id: "sample",
        receiptNumber: `${receiptPrefix}-2026-0019`,
        amount: 5000,
        amountPaise: 500000,
        receiptTotalPayablePaise: 1800000,
        receiptPreviousPaidPaise: 0,
        receiptBalanceAfterPaise: 1300000,
        paymentDate: "2026-08-14T10:00:00Z",
        paymentMode: "upi",
        transactionReference: "SAMPLE-REFERENCE",
        collectedBy: user?.fullName || "Administrator",
        notes: "August installment",
        createdAt: "2026-08-14T10:00:00Z",
      },
      sampleStudent = {
        studentId: "STU-0003",
        name: "Sample Student",
        mobile: "9876543210",
        email: "sample.student@example.com",
        admissionDate: "2026-08-14T00:00:00Z",
        classId: { name: "Class 10 Mathematics" },
        standard: "10",
        division: "A",
        academicYear: current.academicYear || "2026-2027",
        totalFees: 20000,
        totalFeesPaise: 2000000,
        discount: 2000,
        discountPaise: 200000,
        finalFees: 18000,
        finalPayablePaise: 1800000,
      };
    return createReceiptModel(samplePayment, sampleStudent, [samplePayment], current, true);
  };
  const draw = () => {
    root.querySelector("#liveReceipt").innerHTML = renderReceiptHTML(model());

    const logo = root.querySelector("#currentLogo");
    if (logo) {
      logo.src = previewLogo || placeholderLogo;
    }

    const signature = root.querySelector("#currentSignature");
    if (signature) {
      signature.src = previewSignature || "";
      signature.style.display = previewSignature ? "block" : "none";
    }

    const stamp = root.querySelector("#currentStamp");
    if (stamp) {
      stamp.src = previewStamp || "";
      stamp.style.display = previewStamp ? "block" : "none";
    }

    const removeSignatureBtn = root.querySelector("#removeSignature");
    if (removeSignatureBtn) {
      removeSignatureBtn.disabled = !previewSignature;
    }

    const removeStampBtn = root.querySelector("#removeStamp");
    if (removeStampBtn) {
      removeStampBtn.disabled = !previewStamp;
    }
  };
  draw();
  form.addEventListener("input", draw);
  form.addEventListener("change", draw);
  root.querySelector("#replaceLogo").onclick = () => root.querySelector("#logoFile").click();
  root.querySelector("#logoFile").onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"],
      message = root.querySelector("#logoMessage");
    if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) {
      message.textContent = !allowed.includes(file.type) ? "Choose a PNG, JPG, JPEG, or WebP image." : "Logo must be 2 MB or smaller.";
      message.className = "message show error";
      return;
    }
    previewLogo = URL.createObjectURL(file);
    draw();
    try {
      const data = new FormData();
      data.append("logo", file);
      const result = await upload("/settings/logo", data);
      previewLogo = result.logoUrl;
      root.querySelector("#removeLogo").disabled = false;
      toast("Institute logo saved");
      draw();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  root.querySelector("#removeLogo").onclick = async () => {
    try {
      await del("/settings/logo");
      previewLogo = "";
      root.querySelector("#removeLogo").disabled = true;
      toast("Institute logo removed");
      draw();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  /* =========================
   Authorized Signature
========================= */

  root.querySelector("#replaceSignature").onclick = () => {
    root.querySelector("#signatureFile").click();
  };

  root.querySelector("#signatureFile").onchange = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/webp"];

    if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast(!allowed.includes(file.type) ? "Choose a PNG, JPG, JPEG, or WebP signature image." : "Signature must be 2 MB or smaller.", "error");
      return;
    }

    previewSignature = URL.createObjectURL(file);
    draw();

    try {
      const data = new FormData();
      data.append("signature", file);

      const result = await upload("/settings/signature", data);

      previewSignature = result.signatureUrl;

      root.querySelector("#removeSignature").disabled = false;

      toast("Authorized signature saved");

      draw();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  root.querySelector("#removeSignature").onclick = async () => {
    try {
      await del("/settings/signature");

      previewSignature = "";

      root.querySelector("#signatureFile").value = "";
      root.querySelector("#replaceSignature").textContent = "Upload signature";

      toast("Authorized signature removed");

      draw();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  /* =========================
   Institute Stamp
========================= */

  root.querySelector("#replaceStamp").onclick = () => {
    root.querySelector("#stampFile").click();
  };

  root.querySelector("#stampFile").onchange = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/webp"];

    if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast(!allowed.includes(file.type) ? "Choose a PNG, JPG, JPEG, or WebP stamp image." : "Stamp must be 2 MB or smaller.", "error");
      return;
    }

    previewStamp = URL.createObjectURL(file);
    draw();

    try {
      const data = new FormData();
      data.append("stamp", file);

      const result = await upload("/settings/stamp", data);

      previewStamp = result.stampUrl;

      root.querySelector("#removeStamp").disabled = false;

      toast("Institute stamp saved");

      draw();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  root.querySelector("#removeStamp").onclick = async () => {
    try {
      await del("/settings/stamp");

      previewStamp = "";

      root.querySelector("#stampFile").value = "";
      root.querySelector("#replaceStamp").textContent = "Upload stamp";

      toast("Institute stamp removed");

      draw();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form));
      await put("/settings", data);
      toast("Receipt settings saved");
      draw();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  root.querySelector("#fullPreview").onclick = () => {
    modal.innerHTML = `<div class="modal-body"><div class="legacy-modal-toolbar"><button type="button" class="dialog-close" id="closePreview" aria-label="Close preview">${closeIconSVG}</button></div>${renderReceiptHTML(model())}<div class="form-actions"><button class="btn btn-secondary" onclick="window.print()">Print preview</button><button class="btn btn-primary" id="previewPdf">Download sample PDF</button></div></div>`;
    modal.showModal();
    modal.querySelector("#closePreview").onclick = closeModal;
    modal.querySelector("#previewPdf").onclick = () => generateReceiptPDF(model(), "Sample_Receipt.pdf").catch((error) => toast(error.message, "error"));
  };
  root.querySelector("#samplePdf").onclick = () => generateReceiptPDF(model(), "Sample_Receipt.pdf").catch((error) => toast(error.message, "error"));
}
