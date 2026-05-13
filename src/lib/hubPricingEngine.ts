// ============================================================
// DCIH Hub Pricing Engine – Package-Based Rate Calculator
// ============================================================
import { differenceInMinutes, isWeekend, parseISO } from 'date-fns';
import type { RentalPackage, HubPriceEstimate } from '../types/hub';
import { formatPeso } from './pricingEngine';

export { formatPeso };

/**
 * Compute hours between two ISO timestamps.
 */
export function computeHours(startISO: string, endISO: string): number {
  const mins = differenceInMinutes(new Date(endISO), new Date(startISO));
  return mins > 0 ? mins / 60 : 0;
}

/**
 * Calculate the total price for a given package + time range.
 *
 * Logic:
 * - hourly: hours × hourly_rate
 * - daily: daily_rate (flat)
 * - hourly_or_daily: min(hours × hourly_rate, daily_rate)
 */
export function calculatePackagePrice(
  pkg: RentalPackage,
  startISO: string,
  endISO: string
): HubPriceEstimate | null {
  const hours = computeHours(startISO, endISO);
  if (hours <= 0) return null;

  let totalPrice = 0;
  let breakdown = '';

  switch (pkg.billing_mode) {
    case 'hourly': {
      const rate = pkg.hourly_rate ?? 0;
      totalPrice = Math.ceil(hours) * rate;
      breakdown = `${Math.ceil(hours)}h × ${formatPeso(rate)}/hr`;
      break;
    }
    case 'daily': {
      totalPrice = pkg.daily_rate ?? 0;
      breakdown = `${formatPeso(totalPrice)} / day`;
      break;
    }
    case 'hourly_or_daily': {
      const hourlyTotal = Math.ceil(hours) * (pkg.hourly_rate ?? 0);
      const dailyTotal = pkg.daily_rate ?? Infinity;
      if (hourlyTotal <= dailyTotal) {
        totalPrice = hourlyTotal;
        breakdown = `${Math.ceil(hours)}h × ${formatPeso(pkg.hourly_rate ?? 0)}/hr`;
      } else {
        totalPrice = dailyTotal;
        breakdown = `${formatPeso(dailyTotal)} / day (capped)`;
      }
      break;
    }
  }

  return {
    packageSlug: pkg.slug,
    billingMode: pkg.billing_mode,
    hours,
    totalPrice,
    breakdown,
  };
}

/**
 * Validate whether a package can be booked on a given date.
 * Returns an error string or null if valid.
 */
export function validatePackageDate(
  pkg: RentalPackage,
  bookingDateISO: string
): string | null {
  if (pkg.weekend_only) {
    const date = parseISO(bookingDateISO);
    if (!isWeekend(date)) {
      return 'This package is only available on weekends (Sat–Sun).';
    }
  }
  return null;
}

/**
 * Check if a user meets the student requirement for a package.
 */
export function validateStudentAccess(
  pkg: RentalPackage,
  isVerifiedStudent: boolean
): string | null {
  if (pkg.requires_student_flag && !isVerifiedStudent) {
    return 'This package requires a verified student flag on your account.';
  }
  return null;
}
