/**
 * lib/csv.ts — spreadsheet export that is safe to open.
 *
 * Report text is written by the public. A location of `=HYPERLINK("http://…")`
 * or `+cmd|' /C calc'!A0` becomes a live formula the moment an officer opens
 * the export in Excel or LibreOffice. Any cell that starts with a character a
 * spreadsheet treats as a formula is prefixed with an apostrophe, which every
 * major spreadsheet reads as "this is text" and does not display.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(',');
}

/** A whole document. The BOM makes Excel read UTF-8 rather than guessing. */
export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return '﻿' + [csvRow(header), ...rows.map(csvRow)].join('\r\n') + '\r\n';
}
