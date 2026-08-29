/** Converts native input values to strict form numbers while keeping blank input invalid. */
export function toFormNumber(value: unknown): number {
  if (value === "" || value === null || value === undefined) return Number.NaN;
  return Number(value);
}
