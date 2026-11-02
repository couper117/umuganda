/**
 * lib/insights.ts — arithmetic for the insights page.
 *
 * Kept apart from the SQL so the parts most likely to be subtly wrong (a median
 * of nothing, a chart with gaps in its days, a percentage of zero) can be tested
 * without a database.
 */

/** Median of a list, or null for an empty one. Never a made-up zero. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** "45 min", "6 h", "3.5 days", or an em dash when there is no data. */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.max(Math.round(minutes), 0)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${(hours / 24).toFixed(1).replace(/\.0$/, '')} days`;
}

/** A whole-number percentage, or an em dash when the denominator is zero. */
export function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';
}

function localDay(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface DayPoint {
  day: string;
  created: number;
  resolved: number;
}

/**
 * One entry per calendar day, oldest first, ending today. SQL only returns days
 * that had reports, and a chart that skips the empty ones lies about the shape
 * of the month.
 */
export function fillDays(
  created: ReadonlyArray<{ day: string; count: number }>,
  resolved: ReadonlyArray<{ day: string; count: number }>,
  days: number,
  now: Date,
): DayPoint[] {
  const c = new Map(created.map((r) => [r.day, r.count]));
  const r = new Map(resolved.map((x) => [x.day, x.count]));
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    // setDate rather than subtracting milliseconds, so a clock change cannot
    // produce the same calendar day twice.
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const day = localDay(d);
    out.push({ day, created: c.get(day) ?? 0, resolved: r.get(day) ?? 0 });
  }
  return out;
}

export interface ChartBar {
  day: string;
  label: string;
  x: number;
  width: number;
  createdHeight: number;
  resolvedHeight: number;
  created: number;
  resolved: number;
  /** Only some days are labelled on the axis, or they would collide. */
  showLabel: boolean;
}

export interface ChartModel {
  width: number;
  height: number;
  max: number;
  bars: ChartBar[];
  gridlines: Array<{ y: number; value: number }>;
}

/**
 * A whole-number step that gives at most five gridlines. These are counts of
 * reports, so an axis reading "3.8" would be describing something impossible.
 */
function niceStep(top: number): number {
  const mag = 10 ** Math.max(Math.floor(Math.log10(top)) - 1, 0);
  for (const factor of [1, 2, 5, 10, 20, 50]) {
    if (top / (factor * mag) <= 5) return factor * mag;
  }
  return 100 * mag;
}

/** The lowest multiple of the step at or above the data, at least 5. */
function niceScale(n: number): { max: number; step: number } {
  const step = niceStep(Math.max(n, 5));
  return { max: Math.max(Math.ceil(n / step) * step, step), step };
}

/** Geometry for the server-rendered SVG. All values are numbers: nothing from a
 *  report reaches the markup, so the chart cannot carry injected content. */
export function chartModel(points: readonly DayPoint[], width = 760, height = 200): ChartModel {
  const { max, step } = niceScale(Math.max(5, ...points.map((p) => Math.max(p.created, p.resolved))));
  const slot = points.length === 0 ? width : width / points.length;
  const barWidth = Math.max(Math.floor((slot - 2) / 2), 1);
  const scale = (v: number): number => (v / max) * height;
  const labelEvery = Math.max(Math.ceil(points.length / 6), 1);

  return {
    width,
    height,
    max,
    bars: points.map((p, i) => ({
      day: p.day,
      label: p.day.slice(5),
      x: Math.round(i * slot * 100) / 100,
      width: barWidth,
      createdHeight: Math.round(scale(p.created) * 100) / 100,
      resolvedHeight: Math.round(scale(p.resolved) * 100) / 100,
      created: p.created,
      resolved: p.resolved,
      showLabel: (points.length - 1 - i) % labelEvery === 0,
    })),
    gridlines: Array.from({ length: Math.round(max / step) }, (_, i) => {
      const value = (i + 1) * step;
      return { y: Math.round(height - scale(value)), value };
    }),
  };
}
