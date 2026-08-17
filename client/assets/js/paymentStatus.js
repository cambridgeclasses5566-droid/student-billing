import { escapeHTML } from './ui.js';
const aliases={partial:'partially_paid','partially paid':'partially_paid'};
const labels={unpaid:'Unpaid',partially_paid:'Partially Paid',paid:'Paid'};
const styles={paid:'paid',verified:'paid',partially_paid:'partial',unpaid:'unpaid',awaiting_payment:'pending',awaiting_verification:'verification',rejected:'rejected',cancelled:'cancelled',expired:'expired'};
export function normalizePaymentStatus(status){const value=String(status||'').trim().toLowerCase().replaceAll('-','_');return aliases[value]||value.replaceAll(' ','_')}
export function formatPaymentStatus(status){const normalized=normalizePaymentStatus(status);return labels[normalized]||normalized.split('_').map(word=>word[0]?.toUpperCase()+word.slice(1)).join(' ')}
export function renderPaymentStatusBadge(status,{title=''}={}){const normalized=normalizePaymentStatus(status),label=formatPaymentStatus(normalized);return `<span class="status-badge status-badge--${styles[normalized]||'pending'}" title="${escapeHTML(title||label)}"><span class="status-badge__dot" aria-hidden="true"></span>${escapeHTML(label)}</span>`}
