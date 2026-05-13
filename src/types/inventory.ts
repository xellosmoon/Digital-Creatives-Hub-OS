// ============================================================
// DCIH Inventory & Borrowing System – TypeScript Interfaces
// ============================================================

export type AssetCategory =
  | 'interactive_display'
  | 'drawing_tablet'
  | 'computer'
  | 'action_camera'
  | 'camera'
  | 'smartphone'
  | 'drone'
  | 'webcam';

export type LocationMode = 'inside_only' | 'outside_only' | 'both';
export type BorrowLocation = 'inside' | 'outside';
export type ItemStatus = 'available' | 'borrowed' | 'maintenance' | 'broken' | 'retired';
export type BorrowingStatus = 'pending' | 'approved' | 'active' | 'returned' | 'overdue' | 'cancelled';

// ----- Database Row Types -----

export interface Asset {
  id: string;
  name: string;
  slug: string;
  category: AssetCategory;
  description: string | null;
  image_url: string | null;
  total_quantity: number;
  location_mode: LocationMode;
  requires_notice: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Joined from items table (virtual) */
  items?: Item[];
  /** Joined from pricing_config (virtual) */
  pricing?: PricingTier[];
}

export interface Item {
  id: string;
  asset_id: string;
  serial_number: string | null;
  asset_tag: string | null;
  status: ItemStatus;
  condition_notes: string | null;
  current_location: string; // e.g. "DCIH Storage", "Room 204", "MSU-IIT Campus"
  created_at: string;
  updated_at: string;
  /** Joined */
  asset?: Asset;
}

export interface PricingTier {
  id: string;
  asset_id: string;
  location: BorrowLocation;
  duration_hours: number;
  duration_label: string;
  price: number;
  created_at: string;
}

export interface Borrowing {
  id: string;
  borrowing_reference: string;
  user_id: string | null;
  item_id: string;
  asset_id: string;
  usage_type: BorrowLocation;           // drives pricing (inside/outside)
  destination_location: string | null;   // actual place: "Room 204", "MSU-IIT Campus"
  start_time: string;
  end_time: string;
  actual_return_time: string | null;
  duration_hours: number;
  matched_tier_hours: number;
  total_price: number;
  status: BorrowingStatus;
  purpose: string | null;
  notes: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  /** Joined */
  item?: Item;
  asset?: Asset;
  /** @deprecated alias kept for backward compat in older components */
  location?: BorrowLocation;
}

// ----- Derived / UI Types -----

export interface AssetAvailability {
  asset: Asset;
  totalItems: number;
  availableItems: number;
  borrowedItems: number;
  maintenanceItems: number;
  brokenItems: number;
}

export interface PriceEstimate {
  durationHours: number;
  matchedTier: PricingTier;
  totalPrice: number;
}

export interface BorrowingFormData {
  assetId: string;
  usageType: BorrowLocation;          // pricing driver
  destinationLocation: string;        // mandatory text: where the item goes
  startTime: string;   // ISO string
  endTime: string;     // ISO string
  purpose: string;
  notes: string;
}

// Category metadata for display
export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  interactive_display: 'Interactive Display',
  drawing_tablet: 'Drawing Tablet',
  computer: 'Computer',
  action_camera: 'Action Camera',
  camera: 'Camera',
  smartphone: 'Smartphone',
  drone: 'Drone',
  webcam: 'Webcam',
};

export const CATEGORY_ICONS: Record<AssetCategory, string> = {
  interactive_display: 'Monitor',
  drawing_tablet: 'PenTool',
  computer: 'Cpu',
  action_camera: 'Video',
  camera: 'Camera',
  smartphone: 'Smartphone',
  drone: 'Navigation',
  webcam: 'Webcam',
};
