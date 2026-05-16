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
  booking_date: string;         // ISO date
  start_time: string;           // ISO timestamp
  end_time: string;             // ISO timestamp
  seats_used: number;
  total_price: number;
  status: HubBookingStatus;
  is_workshop: boolean;
  workshop_zones: string[];
  purpose: string | null;
  notes: string | null;
  booking_reference: string;
  created_at: string;
  updated_at: string;
  admin_contacted: boolean;
  admin_contacted_at: string | null;
  /** Joined */
  package?: RentalPackage;
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

export type AttendanceStatus = 'pending_entrance' | 'active' | 'checked_out';

export interface HubAttendance {
  id: string;
  mobile_number: string;
  full_name: string;
  gender: string | null;
  email: string | null;
  sector: string | null;
  organization: string | null;
  designation: string | null;
  creative_domain: string;
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
}
