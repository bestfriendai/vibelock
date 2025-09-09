const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Simulate the exact logic from the app
async function debugAppLogic() {
  console.log('🔍 Debugging app logic...\n');

  try {
    // Simulate user location (Washington, DC as shown in the screenshot)
    const userLocation = {
      city: 'Washington',
      state: 'DC',
      coordinates: {
        latitude: 38.9072,
        longitude: -77.0369
      }
    };

    // Simulate app filters (default from the app)
    const filters = {
      category: 'all',
      radius: 10, // 10mi as shown in screenshot
      sortBy: 'recent'
    };

    console.log('👤 User Location:', userLocation);
    console.log('🎛️  Filters:', filters);

    // Simulate the app's filtering logic
    const categoryToFilter = filters.category || 'all';
    const radiusFilteringActive = typeof filters.radius === 'number' && !!filters.radius && !!userLocation;

    console.log('📊 Filter Analysis:');
    console.log('  Category to filter:', categoryToFilter);
    console.log('  Radius filtering active:', radiusFilteringActive);

    // Build server-side filters (like the app does)
    const serverFilters = {};

    // Apply category filter
    if (categoryToFilter && categoryToFilter !== 'all') {
      serverFilters.category = categoryToFilter;
    }

    // Apply location filters based on strategy
    if (userLocation?.city && userLocation?.state) {
      if (radiusFilteringActive) {
        // For radius filtering: don't apply server-side location filters
        console.log('🌍 Radius filtering active - using worldwide search');
      } else {
        // For non-radius filtering: filter by exact city+state
        serverFilters.city = userLocation.city;
        serverFilters.state = userLocation.state;
      }
    }

    console.log('🔧 Server filters:', serverFilters);

    // Test the query that the app would make
    if (radiusFilteringActive && userLocation) {
      console.log('\n📡 Testing radius filtering query...');
      
      // Strategy 1: Server-side city+state filtering + client-side distance filtering
      const fetchLimit = 200;
      const fetchOffset = 0;
      
      let query = supabase.from('reviews_firebase').select('*').eq('status', 'approved');

      // Apply category filter
      if (serverFilters.category && serverFilters.category !== 'all') {
        query = query.eq('category', serverFilters.category);
      }

      // Apply location filters
      if (serverFilters.state) {
        query = query.eq('reviewed_person_location->>state', serverFilters.state);
      }
      if (serverFilters.city) {
        query = query.eq('reviewed_person_location->>city', serverFilters.city);
      }

      // Apply ordering and pagination
      query = query.order('created_at', { ascending: false }).range(fetchOffset, fetchOffset + fetchLimit - 1);

      const { data: baseSet, error } = await query;

      if (error) {
        console.error('❌ Query failed:', error);
        return;
      }

      console.log('✅ Base set retrieved:', baseSet.length, 'reviews');
      
      if (baseSet.length > 0) {
        console.log('📍 Sample locations:');
        baseSet.slice(0, 5).forEach((review, i) => {
          const loc = review.reviewed_person_location;
          console.log(`  ${i + 1}. ${review.reviewed_person_name} - ${loc?.city}, ${loc?.state}`);
          console.log(`     Has coordinates: ${!!loc?.coordinates}`);
          if (loc?.coordinates) {
            console.log(`     Coords: ${loc.coordinates.latitude}, ${loc.coordinates.longitude}`);
          }
        });
      }

      // Now simulate client-side distance filtering
      console.log('\n📏 Simulating distance filtering...');
      
      const filteredReviews = baseSet.filter(review => {
        const reviewLocation = review.reviewed_person_location;
        
        if (!reviewLocation || !reviewLocation.coordinates) {
          console.log(`  ❌ Missing coordinates for ${reviewLocation?.city}, ${reviewLocation?.state}`);
          return false;
        }

        // Calculate distance (simplified)
        const distance = calculateDistance(
          userLocation.coordinates,
          reviewLocation.coordinates
        );

        const withinRadius = distance <= filters.radius;
        
        console.log(`  ${withinRadius ? '✅' : '❌'} ${reviewLocation.city}, ${reviewLocation.state} - ${distance.toFixed(1)} miles`);
        
        return withinRadius;
      });

      console.log(`\n📈 Final result: ${filteredReviews.length}/${baseSet.length} reviews within ${filters.radius} miles`);

    } else {
      console.log('\n📡 Testing non-radius filtering query...');
      
      let query = supabase.from('reviews_firebase').select('*').eq('status', 'approved');

      // Apply category filter
      if (serverFilters.category && serverFilters.category !== 'all') {
        query = query.eq('category', serverFilters.category);
      }

      // Apply location filters
      if (serverFilters.state) {
        query = query.eq('reviewed_person_location->>state', serverFilters.state);
      }
      if (serverFilters.city) {
        query = query.eq('reviewed_person_location->>city', serverFilters.city);
      }

      // Apply ordering and pagination
      query = query.order('created_at', { ascending: false }).range(0, 19);

      const { data: reviews, error } = await query;

      if (error) {
        console.error('❌ Query failed:', error);
        return;
      }

      console.log('✅ Reviews retrieved:', reviews.length);
    }

  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

// Simple distance calculation
function calculateDistance(coord1, coord2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

debugAppLogic();
