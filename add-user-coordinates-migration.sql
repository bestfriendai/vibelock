-- Migration to add latitude and longitude coordinates to users table
-- This enables proper distance-based filtering for location features

-- Add coordinate columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for location-based queries (for efficient distance calculations)
CREATE INDEX IF NOT EXISTS idx_users_coordinates ON public.users(latitude, longitude);

-- Add a comment to document the coordinate system
COMMENT ON COLUMN public.users.latitude IS 'User latitude coordinate (WGS84 decimal degrees)';
COMMENT ON COLUMN public.users.longitude IS 'User longitude coordinate (WGS84 decimal degrees)';

-- Note: Existing users will have NULL coordinates initially
-- They will be populated when users update their location or use GPS
-- This allows the system to work globally without hardcoding specific cities

-- Verify the migration
DO $$
DECLARE
    users_with_coords INTEGER;
    total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM public.users;
    SELECT COUNT(*) INTO users_with_coords FROM public.users WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users with coordinates: %', users_with_coords;
    RAISE NOTICE 'Users without coordinates: %', (total_users - users_with_coords);
END $$;
