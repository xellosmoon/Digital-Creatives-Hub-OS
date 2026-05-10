-- Fix RLS for notifications table

-- Check if notifications table exists and has RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'notifications';

-- If notifications table exists, fix its policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable insert for all users" ON notifications;

-- Allow anyone to create notifications
CREATE POLICY "Anyone can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    auth.jwt() ->> 'role' = 'admin'
  );

-- Or disable RLS on notifications temporarily
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
