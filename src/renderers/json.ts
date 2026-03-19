import { FullReport } from '../types';

/**
 * JSON replacer that converts Date objects to ISO strings.
 * Standard JSON.stringify serialises Dates as strings already, but this
 * makes the intent explicit and handles edge-cases where a Date might end
 * up in a nested structure.
 */
function dateReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

/**
 * Render the full report as pretty-printed JSON.
 * Dates are serialised as ISO-8601 strings.
 * @param report - Full analytics report.
 * @returns JSON string with 2-space indentation.
 */
export function renderJson(report: FullReport): string {
  return JSON.stringify(report, dateReplacer, 2);
}
