import { get } from './api.js';
import { escapeHTML, money, date } from './ui.js';
import { reportMobileCard, mobileEmpty } from './mobileUI.js';

if (typeof document !== 'undefined' && !document.querySelector('link[data-financial-reports]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/assets/css/financialReports.css';
  link.dataset.financialReports = 'true';
  document.head.append(link);
}

const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const paymentDay = value => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

export function filterReportPayments(payments, search = '', selectedDate = '') {
  const query = search.trim().toLowerCase();
  return payments.filter(payment => {
    const student = payment.studentId || {};
    const matchesStudent = !query || `${student.name || ''} ${student.studentId || ''}`.toLowerCase().includes(query);
    return matchesStudent && (!selectedDate || paymentDay(payment.paymentDate) === selectedDate);
  });
}

export const summarizeReportPayments = payments => ({
  total: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
  count: payments.length
});

export function buildReportCsv(payments) {
  const csvRows = [['Receipt', 'Date', 'Student', 'Student ID', 'Class', 'Mode', 'Amount'], ...payments.map(payment => [payment.receiptNumber, date(payment.paymentDate), payment.studentId?.name, payment.studentId?.studentId, `${payment.studentId?.standard || ''}-${payment.studentId?.division || ''}`, payment.paymentMode, payment.amount])];
  return `\ufeff${csvRows.map(row => row.map(csvCell).join(',')).join('\n')}`;
}

export async function renderFinancialReports(root) {
  const data = await get('/billing/reports');
  let filtered = [...data.payments];

  root.innerHTML = `<section class="financial-reports-page">
    <header class="page-title mobile-page-header"><div><p class="eyebrow">FINANCIAL REPORTS</p><div class="mobile-title-row"><h1>Collection reports</h1><button class="btn btn-primary" id="csv">Export CSV</button></div><p>Filter collections and export clean financial data.</p></div><button class="btn btn-primary desktop-page-action" id="csvDesktop" type="button">Export CSV</button></header>
    <div class="toolbar report-filter-bar mobile-filter-panel" aria-label="Financial report filters">
      <label class="report-search-field"><span>Student</span><input type="search" id="reportStudentSearch" placeholder="Search by student name..." autocomplete="off"></label>
      <label class="report-date-field"><span>Date</span><input type="date" id="reportDate"></label>
      <button class="btn btn-secondary" id="run" type="button">Run Report</button>
      <button class="text-button report-clear" id="clearReportFilters" type="button">Clear</button>
      <button class="btn btn-secondary" id="printReport" type="button">Print</button>
    </div>
    <div class="kpis"><article class="card kpi"><small>Total Collection</small><strong id="reportTotal"></strong></article><article class="card kpi"><small>Transactions</small><strong id="reportCount"></strong></article></div>
    <div class="mobile-section-title"><strong>Collection records</strong></div><div id="reportMobileRows" class="mobile-record-list"></div>
    <div class="card table-card report-table-card desktop-data-view"><div class="table-scroll"><table><thead><tr><th>Receipt</th><th>Date</th><th>Student</th><th>Student ID</th><th>Class</th><th>Mode</th><th>Amount</th></tr></thead><tbody id="reportRows"></tbody></table></div></div>
  </section>`;

  const search = root.querySelector('#reportStudentSearch');
  const selectedDate = root.querySelector('#reportDate');
  const rows = root.querySelector('#reportRows');
  const total = root.querySelector('#reportTotal');
  const count = root.querySelector('#reportCount');

  const applyFilters = () => {
    filtered = filterReportPayments(data.payments, search.value, selectedDate.value);
    rows.innerHTML = filtered.map(payment => `<tr><td>${escapeHTML(payment.receiptNumber)}</td><td>${date(payment.paymentDate)}</td><td>${escapeHTML(payment.studentId?.name || 'Student')}</td><td>${escapeHTML(payment.studentId?.studentId || '—')}</td><td>${escapeHTML(payment.studentId?.standard || '—')}-${escapeHTML(payment.studentId?.division || '—')}</td><td>${escapeHTML(payment.paymentMode)}</td><td>${money(payment.amount)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No transactions match these filters.</td></tr>';
    root.querySelector('#reportMobileRows').innerHTML = filtered.map(reportMobileCard).join('') || mobileEmpty('No matching collections','Try another student or date.');
    const summary = summarizeReportPayments(filtered);
    total.textContent = money(summary.total);
    count.textContent = String(summary.count);
  };

  root.querySelector('#run').onclick = applyFilters;
  search.oninput = applyFilters;
  selectedDate.onchange = applyFilters;
  root.querySelector('#clearReportFilters').onclick = () => {
    search.value = '';
    selectedDate.value = '';
    applyFilters();
    search.focus();
  };
  root.querySelector('#printReport').onclick = () => window.print();
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([buildReportCsv(filtered)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'collection-report.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  root.querySelector('#csv').onclick = exportCsv;
  root.querySelector('#csvDesktop').onclick = exportCsv;
  applyFilters();
}
