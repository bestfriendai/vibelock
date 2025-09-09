const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Distance calculation function
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

async function filterReviewsByDistance(reviews, userLocation, radiusMiles) {
  return reviews.filter(review => {
    const reviewLocation = review.reviewed_person_location;
    
    if (!reviewLocation || !reviewLocation.coordinates) {
      return false;
    }

    const distance = calculateDistance(
      userLocation.coordinates,
      reviewLocation.coordinates
    );

    return distance <= radiusMiles;
  });
}

async function testNewLocationLogic() {
  console.log('🧪 Testing New Location-First Logic...\n');

  try {
    // Test user location (Washington, DC)
    const userLocation = {
      city: 'Washington',
      state: 'DC',
      coordinates: {
        latitude: 38.9072,
        longitude: -77.0369
      }
    };

    const filters = {
      category: 'all',
      radius: 25, // 25 miles to include Baltimore
      sortBy: 'recent'
    };

    console.log('👤 User Location:', userLocation);
    console.log('🎛️  Filters:', filters);

    // Step 1: Get ALL reviews with coordinates (like the new app logic)
    console.log('\n📡 Step 1: Fetching all reviews with coordinates...');
    
    const { data: allReviews, error } = await supabase
      .from('reviews_firebase')
      .select('*')
      .eq('status', 'approved')
      .not('reviewed_person_location->coordinates', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('❌ Query failed:', error);
      return;
    }

    console.log('✅ Total reviews with coordinates:', allReviews.length);

    // Step 2: Filter by distance
    console.log('\n📏 Step 2: Filtering by distance...');
    
    const withinRadius = await filterReviewsByDistance(allReviews, userLocation, filters.radius);
    
    console.log(`✅ Reviews within ${filters.radius} miles:`, withinRadius.length);

    // Step 3: Show results by city
    console.log('\n🏙️  Step 3: Results by city:');
    
    const cityCounts = {};
    withinRadius.forEach(review => {
      const location = review.reviewed_person_location;
      const cityKey = `${location.city}, ${location.state}`;
      cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
    });

    Object.entries(cityCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([city, count]) => {
        console.log(`  📍 ${city}: ${count} reviews`);
      });

    // Step 4: Show sample reviews
    console.log('\n📋 Step 4: Sample reviews (sorted by date):');
    
    const sortedReviews = withinRadius
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    sortedReviews.forEach((review, i) => {
      const location = review.reviewed_person_location;
      const distance = calculateDistance(userLocation.coordinates, location.coordinates);
      const date = new Date(review.created_at).toLocaleDateString();
      
      console.log(`  ${i + 1}. ${review.reviewed_person_name} - ${location.city}, ${location.state}`);
      console.log(`     Distance: ${distance.toFixed(1)} miles | Date: ${date}`);
    });

    // Step 5: Test different radius values
    console.log('\n🎯 Step 5: Testing different radius values:');
    
    const testRadii = [10, 25, 50, 100];
    
    for (const radius of testRadii) {
      const filtered = await filterReviewsByDistance(allReviews, userLocation, radius);
      console.log(`  ${radius} miles: ${filtered.length} reviews`);
    }

    console.log('\n🎉 New location-first logic test complete!');
    console.log(`\n📊 Summary:`);
    console.log(`  - Total reviews in database: ${allReviews.length}`);
    console.log(`  - Reviews within ${filters.radius} miles: ${withinRadius.length}`);
    console.log(`  - This should now appear in the app! 🚀`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testNewLocationLogic();
