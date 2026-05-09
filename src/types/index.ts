export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface SpaceType {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  hourly_rate: number | null;
  amenities: string[];
  created_at: string;
}

export interface Space {
  id: string;
  space_type_id: string;
  name: string;
  floor: string | null;
  is_active: boolean;
  created_at: string;
  space_type?: SpaceType;
}

export interface SpaceDisplaySettings {
  id: string;
  space_type_id: string;
  show_booking_names: boolean;
  show_booking_count: boolean;
  show_booking_purpose: boolean;
  anonymous_label: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string | null;
  space_id: string;
  guest_email: string | null;
  guest_phone: string | null;
  guest_name: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  purpose: string | null;
  attendees: number | null;
  notes: string | null;
  booking_reference: string;
  created_at: string;
  updated_at: string;
  space?: Space;
  profile?: Profile;
}

export interface AdminNotification {
  id: string;
  admin_id: string;
  booking_id: string;
  notification_type: 'new_booking' | 'urgent_booking' | 'booking_cancelled';
  is_read: boolean;
  sent_at: string;
  booking?: Booking;
}

export interface GuestConversion {
  id: string;
  guest_email: string;
  user_id: string;
  converted_at: string;
  total_guest_bookings: number;
  first_booking_date: string | null;
}
