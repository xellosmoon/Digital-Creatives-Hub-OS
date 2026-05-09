-- Insert sample spaces
INSERT INTO spaces (name, type, capacity, hourly_rate, location, amenities, description, is_active, privacy_level) VALUES
('Creative Studio A', 'studio', 10, 500.00, 'Building A, 2nd Floor', ARRAY['WiFi', 'Whiteboard', 'Projector', 'Air Conditioning'], 'A bright and spacious studio perfect for creative work and small team meetings.', true, 'public'),
('Conference Room 1', 'meeting_room', 20, 800.00, 'Building B, 1st Floor', ARRAY['WiFi', 'TV Screen', 'Video Conference', 'Whiteboard'], 'Professional conference room with state-of-the-art video conferencing equipment.', true, 'public'),
('Open Workspace', 'coworking', 30, 200.00, 'Main Building, Ground Floor', ARRAY['WiFi', 'Coffee Machine', 'Printer', 'Lockers'], 'Collaborative open space for freelancers and remote workers.', true, 'public'),
('Private Office 1', 'private_office', 4, 600.00, 'Building A, 3rd Floor', ARRAY['WiFi', 'Desk', 'Filing Cabinet', 'Air Conditioning'], 'Quiet private office for focused work.', true, 'members_only'),
('Event Hall', 'event_space', 100, 2000.00, 'Main Building, Ground Floor', ARRAY['WiFi', 'Sound System', 'Stage', 'Lighting', 'Projector'], 'Large event space suitable for workshops, seminars, and networking events.', true, 'public');

-- Add some availability for the spaces (Monday to Friday, 9 AM to 6 PM)
INSERT INTO space_availability (space_id, day_of_week, start_time, end_time, is_available)
SELECT 
    s.id,
    day_num,
    '09:00:00'::TIME,
    '18:00:00'::TIME,
    true
FROM spaces s
CROSS JOIN generate_series(1, 5) AS day_num;
