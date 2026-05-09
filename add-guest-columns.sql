-- Add guest columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50);

-- Make user_id nullable to allow guest bookings
ALTER TABLE bookings 
ALTER COLUMN user_id DROP NOT NULL;

-- Update user_name and user_email to be nullable for guest bookings
ALTER TABLE bookings 
ALTER COLUMN user_name DROP NOT NULL,
ALTER COLUMN user_email DROP NOT NULL;

-- Add a booking reference column for easy lookup
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(20) UNIQUE;

-- Create a function to generate booking references
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate booking references
CREATE OR REPLACE FUNCTION set_booking_reference()
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
EXECUTE FUNCTION set_booking_reference();
