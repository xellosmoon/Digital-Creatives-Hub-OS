-- Fix RLS policy for bookings to allow guest bookings

-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;

-- Create a new policy that allows anyone to create bookings
CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT 
  WITH CHECK (true);

-- Ensure other policies are correct
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Anyone can view bookings" ON bookings
  FOR SELECT 
  USING (
    -- Users can see their own bookings
    (auth.uid() = user_id) 
    OR 
    -- Guests can see bookings by their email
    (guest_email IS NOT NULL AND guest_email = current_setting('request.jwt.claims', true)::json->>'email')
    OR
    -- Admins can see all bookings
    (auth.jwt() ->> 'role' = 'admin')
    OR
    -- For public calendar view (only approved bookings)
    (status = 'approved')
  );

-- Update policy for modifications
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE 
  USING (
    (auth.uid() = user_id) 
    OR 
    (auth.jwt() ->> 'role' = 'admin')
  );

-- Add policy for deletion (admin only)
CREATE POLICY "Only admins can delete bookings" ON bookings
  FOR DELETE 
  USING (auth.jwt() ->> 'role' = 'admin');
