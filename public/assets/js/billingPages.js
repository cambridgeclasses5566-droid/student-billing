import { get, put, post, del, upload } from './api.js';
import { escapeHTML, toast, busy, date } from './ui.js';
import { formatCurrency } from './currency.js';
import { openRecordPaymentModal, paymentModeLabel } from './paymentForm.js';
import { renderPaymentStatusBadge } from './paymentStatus.js';
import { paymentMobileCard, mobileEmpty, studentInitials, avatarTone } from './mobileUI.js';

if (!document.querySelector('link[data-billing-pages]')) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/assets/css/billing-pages.css'; link.dataset.billingPages = 'true'; document.head.append(link); }

// Billing views are rendered dynamically; normalize their controls without changing existing event hooks.
const billingControlObserver = new MutationObserver(() => {
  const filters = document.querySelector('.payment-history-filters:not(.payment-filter-grid)');
  if (!filters) return;
  filters.classList.add('payment-filter-grid');
  const search = filters.querySelector('#historySearch');
  search.type = 'search';
  search.classList.add('filter-input', 'history-search');
  search.setAttribute('aria-label', 'Search payment history');
  [['#historyClass', 'Filter by class'], ['#historyMode', 'Filter by payment mode'], ['#historySource', 'Filter by payment source']].forEach(([selector, label]) => {
    const control = filters.querySelector(selector);
    control.classList.add('filter-select');
    control.setAttribute('aria-label', label);
  });
  filters.querySelectorAll('input[type="date"]').forEach(control => control.classList.add('filter-date'));
  const clearButton = filters.querySelector('#clearHistoryFilters');
  clearButton.className = 'btn-filter-clear';
  const actions = document.createElement('div');
  actions.className = 'filter-actions';
  clearButton.before(actions);
  actions.append(clearButton);
  const filterBar = document.createElement('div');
  filterBar.className = 'payment-filter-bar';
  filters.before(filterBar);
  filterBar.append(filters);
});
billingControlObserver.observe(document.body, { childList: true, subtree: true });
const statusBadge = renderPaymentStatusBadge;




export async function renderCollectPaymentPage(root) {
  let token=0,timer,activeIndex=-1;
  root.innerHTML=`<header class="page-header"><div><p class="eyebrow">PAYMENT RECEIVED</p><h1>Collect Student Payment</h1><p>Find a student and record money your institute has already received.</p></div></header><div class="student-payment-notice"><strong>Record received fees directly.</strong><span>Use this after receiving cash, UPI, bank transfer, card, cheque, or another payment.</span></div><div class="card collect-payment-search collect-payment-search-card"><div class="search-field-wrap"><label class="field-label" for="collectPaymentSearch">Search student</label><input id="collectPaymentSearch" class="filter-input billing-search" type="search" role="combobox" aria-autocomplete="list" aria-controls="collectStudentResults" aria-expanded="false" placeholder="Search by student name, ID, mobile, guardian, or email" autocomplete="off"><div id="collectStudentResults" class="collect-student-results" role="listbox" hidden></div></div></div>`;
  const input=root.querySelector('#collectPaymentSearch'),results=root.querySelector('#collectStudentResults'),wrap=root.querySelector('.search-field-wrap');
  const options=()=>[...results.querySelectorAll('[role="option"]')];
  const closeResults=()=>{results.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');activeIndex=-1};
  const openResults=()=>{results.hidden=false;input.setAttribute('aria-expanded','true')};
  const setActive=index=>{const list=options();if(!list.length)return;activeIndex=(index+list.length)%list.length;list.forEach((option,position)=>{const active=position===activeIndex;option.classList.toggle('is-active',active);option.setAttribute('aria-selected',String(active))});const selected=list[activeIndex];input.setAttribute('aria-activedescendant',selected.id);selected.scrollIntoView({block:'nearest'})};
  const selectStudent=async id=>{closeResults();try{const {student,fees}=await get(`/students/${id}/billing-summary`);openRecordPaymentModal(student,fees,{onSuccess:async()=>{}})}catch(error){toast(error.message,'error')}};
  const renderResults=students=>{const payable=students.filter(student=>student.remaining>0);activeIndex=-1;results.innerHTML=payable.map((student,index)=>`<button type="button" id="collect-student-option-${index}" class="collect-student-result" role="option" aria-selected="false" data-collect-student="${student._id}"><span class="collect-student-avatar ${avatarTone(student.name)}" aria-hidden="true">${studentInitials(student.name)}</span><span class="collect-student-identity"><strong>${escapeHTML(student.name)}</strong><small>${escapeHTML(student.studentId)} &middot; ${escapeHTML(student.currentClass?.name||'Unassigned')}</small>${student.mobile?`<small>${escapeHTML(student.mobile)}</small>`:''}</span><span class="collect-student-balance"><strong>${formatCurrency(student.remaining)}</strong><small>Remaining</small></span></button>`).join('')||'<div class="collect-search-empty">No students found</div>';openResults()};
  const search=async()=>{const current=++token,term=input.value.trim();if(term.length<2){closeResults();return}results.innerHTML='<div class="collect-search-empty">Searching...</div>';openResults();try{const data=await get(`/billing/students?page=1&limit=25&search=${encodeURIComponent(term)}`);if(current===token)renderResults(data.students)}catch(error){if(current===token){results.innerHTML=`<div class="collect-search-empty">${escapeHTML(error.message)}</div>`;openResults()}}};
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,300)});
  input.addEventListener('focus',()=>{if(input.value.trim().length>=2&&results.childElementCount)openResults()});
  input.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeResults();return}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(results.hidden){if(input.value.trim().length>=2)search();return}setActive(activeIndex+(event.key==='ArrowDown'?1:-1));return}if(event.key==='Enter'&&!results.hidden){const list=options();if(list.length){event.preventDefault();selectStudent(list[Math.max(0,activeIndex)].dataset.collectStudent)}}});
  results.addEventListener('click',event=>{const option=event.target.closest('[data-collect-student]');if(option)selectStudent(option.dataset.collectStudent)});
  const outsideHandler=event=>{if(!input.isConnected){document.removeEventListener('pointerdown',outsideHandler,true);return}if(!wrap.contains(event.target))closeResults()};
  document.addEventListener('pointerdown',outsideHandler,true);
  input.focus();
}

export async function renderPaymentHistoryPage(root) {
  const {payments}=await get('/billing/payments'),classes=[...new Map(payments.map(item=>[`${item.studentId?.standard}-${item.studentId?.division}`,`${item.studentId?.standard}-${item.studentId?.division}`])).values()].filter(value=>value!=='undefined-undefined');root.innerHTML=`<header class="page-header mobile-page-header"><div><p class="eyebrow">STUDENT FEE COLLECTION</p><div class="mobile-title-row"><h1>Payment History</h1><a class="btn btn-primary" href="#fee-collection">Collect Payment</a></div><p>Search manual payments and verified UPI request receipts.</p></div><a class="btn btn-primary desktop-page-action" href="#fee-collection">Collect Payment</a></header><div class="payment-history-filters mobile-filter-panel"><input id="historySearch" placeholder="Search receipt, student, ID, reference, or UTR"><select id="historyClass"><option value="">All classes</option>${classes.map(value=>`<option>${escapeHTML(value)}</option>`).join('')}</select><select id="historyMode"><option value="">All payment modes</option>${[['cash','Cash'],['upi','Google Pay / UPI'],['bank_transfer','Bank Transfer'],['card','Card'],['cheque','Cheque'],['other','Other']].map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select><select id="historySource"><option value="">All sources</option><option value="manual">Manual</option><option value="request">Verified UPI Request</option></select><input id="historyStart" type="date" aria-label="Start date"><input id="historyEnd" type="date" aria-label="End date"><button class="btn btn-ghost" id="clearHistoryFilters">Clear</button></div><div class="directory-summary mobile-results-head"><strong id="historyCount"></strong><span class="mobile-sort-chip">⇅ Latest</span></div><div id="historyMobileRows" class="mobile-record-list"></div><div class="card table-card desktop-data-view"><div class="table-scroll"><table><thead><tr><th>Receipt Number</th><th>Student</th><th>Class</th><th>Amount</th><th>Mode</th><th>Reference / UTR</th><th>Date</th><th>Source</th><th>Actions</th></tr></thead><tbody id="historyRows"></tbody></table></div></div>`;const controls={search:root.querySelector('#historySearch'),className:root.querySelector('#historyClass'),mode:root.querySelector('#historyMode'),source:root.querySelector('#historySource'),start:root.querySelector('#historyStart'),end:root.querySelector('#historyEnd')},draw=()=>{const term=controls.search.value.toLowerCase(),rows=payments.filter(item=>{const className=`${item.studentId?.standard}-${item.studentId?.division}`,source=item.feeRequestId?'request':'manual',paymentDate=new Date(item.paymentDate);return(!term||`${item.receiptNumber} ${item.studentId?.name} ${item.studentId?.studentId} ${item.transactionReference}`.toLowerCase().includes(term))&&(!controls.className.value||className===controls.className.value)&&(!controls.mode.value||item.paymentMode===controls.mode.value)&&(!controls.source.value||source===controls.source.value)&&(!controls.start.value||paymentDate>=new Date(controls.start.value))&&(!controls.end.value||paymentDate<=new Date(`${controls.end.value}T23:59:59`))});root.querySelector('#historyCount').textContent=`${rows.length} payments`;root.querySelector('#historyRows').innerHTML=rows.map(item=>`<tr><td><strong>${escapeHTML(item.receiptNumber)}</strong></td><td>${escapeHTML(item.studentId?.name)}</td><td>${escapeHTML(item.studentId?.standard)}-${escapeHTML(item.studentId?.division)}</td><td>${formatCurrency(item.amount)}</td><td>${escapeHTML(paymentModeLabel(item.paymentMode))}</td><td>${escapeHTML(item.transactionReference||'—')}</td><td>${date(item.paymentDate)}</td><td>${item.feeRequestId?'Verified UPI Request':'Manual'}</td><td><button class="btn btn-secondary btn-small" data-action="receipt" data-id="${item._id}">View Receipt</button></td></tr>`).join('')||'<tr><td colspan="9" class="empty">No payments match these filters.</td></tr>';root.querySelector('#historyMobileRows').innerHTML=rows.map(item=>paymentMobileCard(item,paymentModeLabel(item.paymentMode))).join('')||mobileEmpty('No matching payments','Try changing the payment filters.');};Object.values(controls).forEach(control=>control.addEventListener(control.tagName==='INPUT'&&control.type!=='date'?'input':'change',draw));root.querySelector('#clearHistoryFilters').onclick=()=>{Object.values(controls).forEach(control=>control.value='');draw()};draw();
}
