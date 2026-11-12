/**
 * How gadget borrow hours are counted.
 *
 * A borrow's hours are the hours that were requested (`duration_hours`,
 * worked out from its Start → End window) — the clock stops at the
 * scheduled end, NOT when an admin checks the item back in. If the
 * borrower kept it longer, the admin adds the time (`extend_borrowing`),
 * which moves `end_time` and raises `duration_hours`.
 */

export interface LoanLike {
  status?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_hours?: number | null;
  extra_hours?: number | null;
  actual_return_time?: string | null;
}

/** Loans that actually happen (or are happening): everything but
 *  pending (not decided) and cancelled. "approved" is the in-use state —
 *  nothing in the app ever moves a loan to "active". */
export function isCountedLoan(b: LoanLike): boolean {
  return b.status === 'approved' || b.status === 'active' || b.status === 'returned';
}

/** Still out and past its scheduled end. */
export function isOverdueLoan(b: LoanLike, now: Date = new Date()): boolean {
  return (
    (b.status === 'approved' || b.status === 'active') &&
    !!b.end_time &&
    new Date(b.end_time).getTime() < now.getTime()
  );
}

/** The hours that count for a loan. */
export function loanHours(b: LoanLike): number {
  return Number(b.duration_hours ?? 0) || 0;
}

/** Hours it came back after the scheduled end (0 if on time / not returned).
 *  Informational — these hours aren't counted unless the admin adds them. */
export function lateReturnHours(b: LoanLike): number {
  if (!b.actual_return_time || !b.end_time) return 0;
  const ms = new Date(b.actual_return_time).getTime() - new Date(b.end_time).getTime();
  return ms > 60_000 ? ms / 3_600_000 : 0;
}

/** 3 → "3 hrs", 1 → "1 hr", 2.5 → "2.5 hrs". */
export function formatHours(h: number): string {
  const rounded = Math.round(h * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} hr${rounded === 1 ? '' : 's'}`;
}
