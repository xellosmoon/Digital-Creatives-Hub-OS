// ============================================================
// DCIH Hub Capacity & Packages – TypeScript Interfaces
// ============================================================

export type PackageBillingMode = 'hourly' | 'daily' | 'hourly_or_daily';

export type HubBookingStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'rejected';

// ----- Database Row Types -----

export interface HubZone {
  id: string;
  name: string;           // e.g. 'q2_tech'
  label: string;          // e.g. 'Quadrant 2 – Tech Zone'
  seats: number;
  description: string | null;
  equipment_summary: string | null;
  is_bookable: boolean;
  created_at: string;
}

export interface HubCapacityConfig {
  id: string;
  total_seats: number;           // 28
  manual_adjustment: number;     // admin override (+/-)
  adjustment_reason: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface RentalPackage {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  billing_mode: PackageBillingMode;
  hourly_rate: number | null;
  daily_rate: number | null;
  seats_consumed: number;
  requires_student_flag: boolean;
  weekend_only: boolean;
  is_bundle: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface PackageRequiredAsset {
  id: string;
  package_id: string;
  asset_category: string;
  quantity_needed: number;
  created_at: string;
}

export interface DailyOccupancy {
  id: string;
  occupancy_date: string;       // ISO date
  total_booked_seats: number;
  workshop_block_q2: boolean;
  workshop_block_q4: boolean;
  notes: string | null;
  updated_at: string;
}

export interface HubBooking {
  id: string;
  user_id: string | null;
  package_id: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  facebook_page: string | null;
  organization: string | null;
  booking_date: string;         // ISO date
  start_time: string;           // ISO timestamp
  end_time: string;             // ISO timestamp
  seats_used: number;
  total_price: number;
  status: HubBookingStatus;
  is_workshop: boolean;
  workshop_zones: string[];
  purpose: Purpose[] | null;
  notes: string | null;
  booking_reference: string;
  created_at: string;
  updated_at: string;
  admin_contacted: boolean;
  admin_contacted_at: string | null;
  /** Joined */
  package?: RentalPackage;
}

/**
 * The shape returned by the admin bookings list query (a narrower,
 * differently-typed projection of HubBooking used by AdminBookings.tsx
 * and BookingApprovalCard.tsx) — declared once here so the two don't
 * drift out of sync with each other.
 */
export interface AdminBookingRow {
  id: string;
  booking_reference: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_used: number;
  total_price: number;
  status: string;
  purpose: string | string[] | null;
  notes: string | null;
  is_workshop: boolean;
  created_at: string;
  admin_contacted: boolean;
  admin_contacted_at: string | null;
  booking_type: string | null;
  group_size: number | null;
  organization: string | null;
  gathering_type: string | null;
  package?: {
    id: string;
    slug: string;
    name: string;
    hourly_rate: number | null;
    daily_rate: number | null;
    billing_mode: string;
    seats_consumed: number;
    is_bundle: boolean;
  } | null;
  borrowings?: { id: string; asset: { name: string } | null }[];
}

// ----- Derived / UI Types -----

export interface HubLiveStatus {
  totalSeats: number;
  manualAdjustment: number;
  bookedSeats: number;
  availableSeats: number;
  workshopBlockQ2: boolean;
  workshopBlockQ4: boolean;
  isFullHubBlocked: boolean;
}

export interface PackageAvailability {
  package: RentalPackage;
  isAvailable: boolean;
  unavailableReason?: string;
  requiredAssets?: PackageRequiredAsset[];
}

export interface HubBookingFormData {
  packageId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  notes: string;
  attendees: number;
  isWorkshop: boolean;
  workshopZones: string[];
}

export interface HubPriceEstimate {
  packageSlug: string;
  billingMode: PackageBillingMode;
  hours: number;
  totalPrice: number;
  breakdown: string;
}

// Zone name constants
export const ZONE_NAMES = {
  Q2_TECH: 'q2_tech',
  Q4_CREATIVE: 'q4_creative',
  Q1_STAFF: 'q1_staff',
  Q3_LOUNGE: 'q3_lounge',
} as const;

// Package slug constants
export const PACKAGE_SLUGS = {
  COWORKING_HOURLY: 'coworking_hourly',
  STUDENT_PASS: 'student_pass',
  COWORKER_LITE: 'coworker_lite',
  WEEKEND_CREATOR: 'weekend_creator',
  CREATIVE_SUITE: 'creative_suite',
  PRODUCTION_ACCESS: 'production_access',
} as const;

export const BUNDLE_SLUGS: string[] = [
  PACKAGE_SLUGS.CREATIVE_SUITE,
  PACKAGE_SLUGS.PRODUCTION_ACCESS,
];

// ============================================================
// Attendance & Check-in Types
// ============================================================

// 9 Official PCIDA Creative Domains (RA 11904)
export const PCIDA_DOMAINS = [
  'Audio & Music',
  'Film & Animation',
  'Visual Arts',
  'Digital Interactive Media',
  'Design',
  'Publishing',
  'Advertising',
  'Cultural & Heritage',
  'Performing Arts',
  'Other',
] as const;

export type PCIDADomain = (typeof PCIDA_DOMAINS)[number];

// Sector options - shared between bookings and check-in, so the same
// column holds consistent values regardless of which form wrote it.
export const SECTOR_OPTIONS = [
  'Teacher/Academe',
  'Government Employee',
  'MSME/Entrepreneur',
  'Private Sector Employee',
  'Freelancer/Remote Worker',
  'Creative Professional',
  'Startup Founder/Innovator',
  'Civil Society/NGO',
  'Student/Researcher',
  'Other',
] as const;

export type Sector = (typeof SECTOR_OPTIONS)[number];

// Gender options - shared between bookings and check-in
export const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const;

export type Gender = (typeof GENDER_OPTIONS)[number];

// Purpose options - shared between bookings and check-in
export const PURPOSE_OPTIONS = [
  'Explore',
  'Coworking',
  'Meeting',
  'Equipment Use',
  'Content Creation',
  'Research',
  'Collaboration',
  'Event',
  'Virtual Office',
  'Other',
] as const;

// Purpose of visit options (alias for backward compatibility)
export const PURPOSE_OF_VISIT_OPTIONS = PURPOSE_OPTIONS;

export type Purpose = (typeof PURPOSE_OPTIONS)[number];
export type PurposeOfVisit = Purpose;

export type AttendanceStatus = 'pending_entrance' | 'active' | 'checked_out' | 'rejected';

export interface HubAttendance {
  id: string;
  mobile_number: string | null;
  full_name: string;
  gender: string | null;
  email: string | null;
  sector: string | null;
  organization: string | null;
  designation: string | null;
  creative_domain: string | null;
  creative_domains: string[] | null;
  purpose_of_visit: string[] | null;
  status: AttendanceStatus;
  check_in_time: string;
  confirmed_at: string | null;
  check_out_time: string | null;
  confirmed_by: string | null;
  checked_out_by: string | null;
  privacy_consented: boolean;
  consent_timestamp: string | null;
  is_walk_in: boolean;
  manually_added_by: string | null;
  notes: string | null;
  created_at: string;
  /** Event ID from events table */
  event_id: string | null;
  /** Joined event data from events table */
  event?: { id: string; title: string; start_time: string } | null;
}
