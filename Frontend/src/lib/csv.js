// ============================================================
// FILE: src/lib/csv.js
// CSV that opens cleanly in Excel, Google Sheets and Numbers:
// quoted where needed, CRLF line ends, and a UTF-8 byte-order mark so
// Hindi and Gujarati names survive Excel's default encoding.
// ============================================================

const cell = (value) => {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** rows: objects; columns: [{ key, label }] or [{ label, value: (row) => ... }]. */
export function toCsv(rows, columns) {
  const head = columns.map((c) => cell(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => cell(c.value ? c.value(row) : row[c.key])).join(','));
  return `﻿${[head, ...body].join('\r\n')}\r\n`;
}

/** Save text as a file in the browser. */
export function download(filename, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
