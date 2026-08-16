-- Add age column to hub_attendance table
ALTER TABLE hub_attendance 
ADD COLUMN age INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN hub_attendance.age IS 'Age of the visitor in years';
