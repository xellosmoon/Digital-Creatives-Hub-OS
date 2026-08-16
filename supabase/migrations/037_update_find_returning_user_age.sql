-- Update find_returning_user function to include age column
CREATE OR REPLACE FUNCTION find_returning_user(p_mobile VARCHAR)
RETURNS TABLE(
  full_name VARCHAR,
  email VARCHAR,
  gender VARCHAR,
  age INTEGER,
  sector VARCHAR,
  organization VARCHAR,
  designation VARCHAR,
  creative_domain VARCHAR,
  creative_domains TEXT[]
) AS $$
  SELECT
    full_name, email, gender, age, sector, organization, designation, creative_domain, creative_domains
  FROM hub_attendance
  WHERE mobile_number = p_mobile
  ORDER BY check_in_time DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;
