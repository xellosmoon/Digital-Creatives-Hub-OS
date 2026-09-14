-- Fix notifications table to allow inserts without authentication
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Allow anyone to create notifications (for guest bookings)
CREATE POLICY "Anyone can create notifications" ON notifications
  FOR INSERT 
  WITH CHECK (true);

-- Test insert
INSERT INTO notifications (recipient, type, title, message)
VALUES ('test@example.com', 'test', 'Test Notification', 'This is a test')
RETURNING id;
