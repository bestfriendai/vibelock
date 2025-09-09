const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Haversine distance calculation
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

async function testLocationFiltering() {
  console.log('🧪 Testing Location Filtering...\n');

  try {
    // Test user location (Rockville, MD)
    const userLocation = {
      city: 'Rockville',
      state: 'MD',
      coordinates: {
        latitude: 39.0840,
        longitude: -77.1528
      }
    };

    console.log('👤 User Location:', userLocation);

    // Get reviews from nearby areas (DC, Baltimore, etc.) and some distant ones
    const { data: reviews, error } = await supabase
      .from('reviews_firebase')
      .select('*')
      .eq('status', 'approved')
      .not('reviewed_person_location->coordinates', 'is', null)
      .in('reviewed_person_location->>city', ['Washington', 'Baltimore', 'New York', 'Philadelphia', 'Cleveland'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    console.log(`\n📊 Found ${reviews.length} reviews to test\n`);

    // Test distance filtering with different radii
    const testRadii = [10, 25, 50, 100, 500];

    for (const radius of testRadii) {
      console.log(`🎯 Testing ${radius} mile radius:`);
      
      const filteredReviews = reviews.filter(review => {
        const reviewLocation = review.reviewed_person_location;
        
        if (!reviewLocation || !reviewLocation.coordinates) {
          console.log(`  ❌ Missing coordinates for ${reviewLocation?.city}, ${reviewLocation?.state}`);
          return false;
        }

        const distance = calculateDistance(
          userLocation.coordinates,
          reviewLocation.coordinates
        );

        const withinRadius = distance <= radius;
        
        console.log(`  ${withinRadius ? '✅' : '❌'} ${reviewLocation.city}, ${reviewLocation.state} - ${distance.toFixed(1)} miles`);
        
        return withinRadius;
      });

      console.log(`  📈 Result: ${filteredReviews.length}/${reviews.length} reviews within ${radius} miles\n`);
    }

    // Test specific cities and their distances
    console.log('🏙️  Distance to major cities:');
    
    const testCities = [
      { name: 'Washington, DC', coords: { latitude: 38.9072, longitude: -77.0369 } },
      { name: 'Baltimore, MD', coords: { latitude: 39.2904, longitude: -76.6122 } },
      { name: 'New York, NY', coords: { latitude: 40.7128, longitude: -74.0060 } },
      { name: 'Philadelphia, PA', coords: { latitude: 39.9526, longitude: -75.1652 } },
      { name: 'Los Angeles, CA', coords: { latitude: 34.0522, longitude: -118.2437 } }
    ];

    testCities.forEach(city => {
      const distance = calculateDistance(userLocation.coordinates, city.coords);
      console.log(`  📍 ${city.name}: ${distance.toFixed(1)} miles`);
    });

    // Check data structure consistency
    console.log('\n🔍 Data Structure Analysis:');
    reviews.forEach((review, index) => {
      const location = review.reviewed_person_location;
      console.log(`  Review ${index + 1}:`);
      console.log(`    Name: ${review.reviewed_person_name}`);
      console.log(`    Location: ${location?.city}, ${location?.state}`);
      console.log(`    Has Coordinates: ${!!location?.coordinates}`);
      if (location?.coordinates) {
        console.log(`    Coordinates: ${location.coordinates.latitude}, ${location.coordinates.longitude}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error testing location filtering:', error);
  }
}

testLocationFiltering();
