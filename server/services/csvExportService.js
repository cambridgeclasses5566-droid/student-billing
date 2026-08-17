const formulaPrefix = /^[=+\-@]/;

export function escapeCsvText(value) {
  let text = String(value ?? '');
  if (formulaPrefix.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function normalizeWhatsAppNumber(value) {
  const display = String(value ?? '').replace(/\D/g, '');
  if (!display) return null;
  let whatsapp = display;
  if (/^[6-9]\d{9}$/.test(display)) whatsapp = `91${display}`;
  else if (/^0[6-9]\d{9}$/.test(display)) whatsapp = `91${display.slice(1)}`;
  else if (/^91[6-9]\d{9}$/.test(display)) whatsapp = display;
  else if (!/^\d{11,15}$/.test(display) || display.startsWith('0')) return { display, whatsapp: null };
  return /^\d{11,15}$/.test(whatsapp) ? { display, whatsapp } : { display, whatsapp: null };
}

export function excelPhoneFormula(value) {
  const phone = normalizeWhatsAppNumber(value);
  if (!phone) return '';
  return phone.whatsapp
    ? `=HYPERLINK("https://wa.me/${phone.whatsapp}","${phone.display}")`
    : `="${phone.display}"`;
}

const escapeFormula = value => `"${String(value).replaceAll('"', '""')}"`;

export function buildClassStudentsCsv({ cls, students, summaries }) {
  const header = ['Student ID','Student Name','Class / Batch','Mobile','Payable','Paid','Remaining','Status','Standard','Division','Academic Year'];
  const rows = students.map(student => {
    const billing = summaries.get(String(student._id));
    return [
      student.studentId, student.name, cls.name,
      { formula: excelPhoneFormula(student.mobile) },
      billing?.finalPayableFees ?? 0, billing?.totalPaid ?? 0, billing?.remainingAmount ?? 0,
      billing?.status ?? 'Unpaid', student.standard, student.division, student.academicYear
    ];
  });
  return [header, ...rows].map(row => row.map(cell => cell && typeof cell === 'object' && 'formula' in cell ? escapeFormula(cell.formula) : escapeCsvText(cell)).join(',')).join('\r\n');
}
