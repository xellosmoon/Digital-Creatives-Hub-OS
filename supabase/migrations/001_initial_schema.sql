-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create space types table
CREATE TABLE space_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  hourly_rate DECIMAL(10,2),
  amenities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spaces table
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_type_id UUID REFERENCES space_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create space display settings table
CREATE TABLE space_display_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_type_id UUID REFERENCES space_types(id) ON DELETE CASCADE,
  show_booking_names BOOLEAN DEFAULT false,
  show_booking_count BOOLEAN DEFAULT true,
  show_booking_purpose BOOLEAN DEFAULT false,
  anonymous_label TEXT DEFAULT 'Booked',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  purpose TEXT,
  attendees INTEGER,
  notes TEXT,
  booking_reference TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure either user_id OR guest_email exists
  CONSTRAINT booking_has_contact CHECK (
    user_id IS NOT NULL OR guest_email IS NOT NULL
  )
);

-- Create admin notifications table
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('new_booking', 'urgent_booking', 'booking_cancelled')),
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create guest conversions tracking table
CREATE TABLE guest_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_guest_bookings INTEGER DEFAULT 0,
  first_booking_date TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_bookings_space_id ON bookings(space_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_guest_email ON bookings(guest_email);
CREATE INDEX idx_bookings_booking_reference ON bookings(booking_reference);
CREATE INDEX idx_spaces_space_type_id ON spaces(space_type_id);
CREATE INDEX idx_admin_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX idx_admin_notifications_is_read ON admin_notifications(is_read);

-- Create function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate booking reference
CREATE OR REPLACE FUNCTION trigger_generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_reference_trigger
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_booking_reference();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_space_display_settings_updated_at BEFORE UPDATE ON space_display_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_display_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_conversions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Space types policies (public read)
CREATE POLICY "Anyone can view space types"
  ON space_types FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage space types"
  ON space_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Spaces policies (public read)
CREATE POLICY "Anyone can view active spaces"
  ON spaces FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage spaces"
  ON spaces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Space display settings policies
CREATE POLICY "Anyone can view space display settings"
  ON space_display_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage space display settings"
  ON space_display_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Bookings policies
CREATE POLICY "Anyone can create a booking"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own pending bookings"
  ON bookings FOR UPDATE
  USING (
    (auth.uid() = user_id AND status = 'pending') OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all bookings"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin notifications policies
CREATE POLICY "Admins can view their notifications"
  ON admin_notifications FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "System can create notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update their notifications"
  ON admin_notifications FOR UPDATE
  USING (auth.uid() = admin_id);

-- Guest conversions policies
CREATE POLICY "Only admins can view guest conversions"
  ON guest_conversions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default space types
INSERT INTO space_types (name, description, capacity, hourly_rate, amenities) VALUES
  ('Hot Desk', 'Flexible coworking desk in open area', 1, 5.00, '["WiFi", "Power Outlet", "Shared Printer"]'),
  ('Meeting Room', 'Private room for meetings', 8, 25.00, '["WiFi", "Whiteboard", "TV Screen", "Video Conference"]'),
  ('Event Space', 'Large space for workshops and events', 50, 100.00, '["WiFi", "Projector", "Sound System", "Chairs", "Tables"]'),
  ('Creative Studio', 'Space for creative work and production', 10, 50.00, '["WiFi", "Work Tables", "Storage", "Natural Light"]');

-- Insert default space display settings
INSERT INTO space_display_settings (space_type_id, show_booking_names, show_booking_count, anonymous_label)
SELECT id, false, true, 
  CASE 
    WHEN name = 'Hot Desk' THEN 'people coworking'
    WHEN name = 'Meeting Room' THEN 'Booked for meeting'
    WHEN name = 'Event Space' THEN 'Event scheduled'
    WHEN name = 'Creative Studio' THEN 'Creative session'
    ELSE 'Booked'
  END
FROM space_types;

-- Insert sample spaces
INSERT INTO spaces (space_type_id, name, floor) 
SELECT st.id, 'Desk ' || generate_series(1, 10), 'Ground Floor'
FROM space_types st WHERE st.name = 'Hot Desk';

INSERT INTO spaces (space_type_id, name, floor)
SELECT st.id, 'Meeting Room ' || generate_series(1, 3), 'First Floor'
FROM space_types st WHERE st.name = 'Meeting Room';

INSERT INTO spaces (space_type_id, name, floor)
SELECT st.id, 'Main Event Hall', 'Ground Floor'
FROM space_types st WHERE st.name = 'Event Space';

INSERT INTO spaces (space_type_id, name, floor)
SELECT st.id, 'Studio A', 'Second Floor'
FROM space_types st WHERE st.name = 'Creative Studio';
