/**
 * Calendar-date arithmetic in a school's configured business timezone.
 *
 * Every timestamp CampusWear stores is `timestamptz`, i.e. an absolute instant. "Today" is not a
 * property of an instant — it only exists relative to a timezone. The dashboard previously derived
 * it with `new Date().toISOString().slice(0, 10)`, which is the UTC calendar date, so a sale
 * completed at 04:30 in Manila (20:30 UTC the previous day) was attributed to the wrong day. In
 * Asia/Manila that misfiles every sale between 00:00 and 08:00 local.
 *
 * Resolution uses the platform's own IANA database through Intl, which handles DST and historical
 * offset changes. No date library is needed: date-fns v4's core has no IANA support and
 * date-fns-tz is not installed.
 */

/**
 * Used only when a school's timezone is missing or not a valid IANA name.
 *
 * UTC is chosen deliberately over the browser's timezone: stored timestamps are UTC, so this is
 * deterministic and identical on every device, whereas a browser fallback would make the same
 * order count as "today" for one member of staff and not another. It is never silent — callers can
 * compare against this constant to detect that resolution failed.
 */
export const FALLBACK_BUSINESS_TIME_ZONE = "UTC";

/** True when the runtime accepts the name as an IANA zone. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    // Intl throws RangeError for an unknown zone; anything unusable falls back rather than crashing
    // a whole dashboard over one bad configuration value.
    return false;
  }
}

/** The zone that will actually be used, after validating what the school supplied. */
export function resolveBusinessTimeZone(timeZone: string | null | undefined): string {
  const candidate = timeZone?.trim();
  if (!candidate) return FALLBACK_BUSINESS_TIME_ZONE;
  return isValidTimeZone(candidate) ? candidate : FALLBACK_BUSINESS_TIME_ZONE;
}

/**
 * The calendar date at `instant`, as seen in `timeZone`, formatted `YYYY-MM-DD`.
 *
 * Parts are read by name rather than by parsing a formatted string, so the result does not depend
 * on the runtime's locale ordering.
 */
export function businessDateIn(instant: Date | string | number, timeZone: string | null | undefined): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`businessDateIn received an invalid instant: ${String(instant)}`);
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveBusinessTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(entry => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Whether two instants fall on the same calendar date in the given business timezone. */
export function isSameBusinessDate(
  a: Date | string | number,
  b: Date | string | number,
  timeZone: string | null | undefined,
): boolean {
  return businessDateIn(a, timeZone) === businessDateIn(b, timeZone);
}
