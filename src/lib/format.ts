/**
 * lib/format.ts — presentation helpers shared by the templates.
 */

/**
 * Format a timestamp as `YYYY-MM-DD HH:mm`.
 *
 * Deliberately locale-neutral rather than run through Intl: a numeric date
 * ordering is unambiguous in all three languages, Intl has thin data for `rw`,
 * and a resident comparing a date on screen against one read out over the phone
 * should not see two different orderings.
 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Date only, for the compact feed rows. */
export function formatDate(value: Date | string | null | undefined): string {
  const full = formatDateTime(value);
  return full === '' ? '' : (full.split(' ')[0] as string);
}
