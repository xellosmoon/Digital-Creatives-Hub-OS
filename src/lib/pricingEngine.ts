// ============================================================
// DCIH Pricing Engine – Tiered, Location-Aware Rate Calculator
// ============================================================
import { differenceInMinutes } from 'date-fns';
import type { PricingTier, BorrowLocation, Asset, PriceEstimate } from '../types/inventory';

/**
 * Resolve the effective location for a given asset.
 * - "inside_only" assets always charge "inside" rates.
 * - "outside_only" assets always charge "outside" rates.
 * - "both" assets use the user-selected location.
 */
export function resolveLocation(
  asset: Pick<Asset, 'location_mode'>,
  userChoice: BorrowLocation
): BorrowLocation {
  if (asset.location_mode === 'inside_only') return 'inside';
  if (asset.location_mode === 'outside_only') return 'outside';
  return userChoice;
}

/**
 * Compute the total borrowing duration in fractional hours
 * from two ISO date-time strings.
 */
export function computeDurationHours(startISO: string, endISO: string): number {
  const mins = differenceInMinutes(new Date(endISO), new Date(startISO));
  if (mins <= 0) return 0;
  return mins / 60;
}

/**
 * Given a set of pricing tiers and a raw duration, find the tier
 * that is ≥ the raw duration (round-up logic).
 *
 * Algorithm:
 *   1. Filter tiers for the resolved location.
 *   2. Sort tiers ascending by duration_hours.
 *   3. Pick the first tier whose duration_hours >= rawHours.
 *   4. If rawHours exceeds ALL tiers, use the largest tier and
 *      compute a proportional rate (ceiling multiples of the max tier).
 */
export function matchTier(
  tiers: PricingTier[],
  location: BorrowLocation,
  rawHours: number
): PricingTier | null {
  const filtered = tiers
    .filter((t) => t.location === location)
    .sort((a, b) => a.duration_hours - b.duration_hours);

  if (filtered.length === 0) return null;

  // Find the first tier that covers the requested duration
  const match = filtered.find((t) => t.duration_hours >= rawHours);
  if (match) return match;

  // Duration exceeds largest tier – return largest (caller handles multiples)
  return filtered[filtered.length - 1];
}

/**
 * Master pricing function.
 *
 * @returns PriceEstimate with the matched tier and computed total price.
 *          Returns null if no applicable tiers exist.
 *
 * Overflow logic (duration exceeds max tier):
 *   totalPrice = ceil(rawHours / maxTierHours) × maxTierPrice
 */
export function calculateTotalRate(
  tiers: PricingTier[],
  asset: Pick<Asset, 'location_mode'>,
  userLocation: BorrowLocation,
  startISO: string,
  endISO: string
): PriceEstimate | null {
  const location = resolveLocation(asset, userLocation);
  const rawHours = computeDurationHours(startISO, endISO);
  if (rawHours <= 0) return null;

  const tier = matchTier(tiers, location, rawHours);
  if (!tier) return null;

  let totalPrice: number;

  if (rawHours <= tier.duration_hours) {
    // Duration fits within (or exactly matches) this tier
    totalPrice = tier.price;
  } else {
    // Duration exceeds the maximum tier – compute multiples
    const multiples = Math.ceil(rawHours / tier.duration_hours);
    totalPrice = multiples * tier.price;
  }

  return {
    durationHours: rawHours,
    matchedTier: tier,
    totalPrice,
  };
}

/**
 * Return all available tiers for an asset + location,
 * sorted ascending by duration. Useful for the UI price table.
 */
export function getAvailableTiers(
  tiers: PricingTier[],
  asset: Pick<Asset, 'location_mode'>,
  userLocation: BorrowLocation
): PricingTier[] {
  const location = resolveLocation(asset, userLocation);
  return tiers
    .filter((t) => t.location === location)
    .sort((a, b) => a.duration_hours - b.duration_hours);
}

/**
 * Format a peso amount for display: ₱1,200.00
 */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
