// Location utilities for LockerRoom MVP

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  city: string;
  state: string;
  coordinates?: Coordinates;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in miles
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Mock geocoding function - in production, use a real geocoding service
 * @param city City name
 * @param state State abbreviation
 * @returns Approximate coordinates
 */
export function geocodeLocation(city: string, state: string): Coordinates {
  // Mock coordinates for common cities in the DMV area
  const mockCoordinates: Record<string, Coordinates> = {
    "alexandria,va": { latitude: 38.8048, longitude: -77.0469 },
    "arlington,va": { latitude: 38.8816, longitude: -77.0910 },
    "washington,dc": { latitude: 38.9072, longitude: -77.0369 },
    "bethesda,md": { latitude: 38.9847, longitude: -77.1200 },
    "rockville,md": { latitude: 39.0840, longitude: -77.1528 },
    "fairfax,va": { latitude: 38.8462, longitude: -77.3064 },
    "vienna,va": { latitude: 38.9012, longitude: -77.2653 },
    "falls church,va": { latitude: 38.8823, longitude: -77.1711 },
  };

  const key = `${city.toLowerCase()},${state.toLowerCase()}`;
  return mockCoordinates[key] || { latitude: 38.9072, longitude: -77.0369 }; // Default to DC
}

/**
 * Filter reviews by distance from user location
 * @param reviews Array of reviews
 * @param userLocation User's location
 * @param radiusMiles Maximum distance in miles
 * @returns Filtered reviews within radius
 */
export function filterReviewsByDistance<T extends { reviewedPersonLocation: LocationData }>(
  reviews: T[],
  userLocation: LocationData,
  radiusMiles: number
): T[] {
  if (!userLocation.coordinates) {
    // If no user coordinates, return all reviews
    return reviews;
  }

  return reviews.filter(review => {
    const reviewCoords = review.reviewedPersonLocation.coordinates || 
      geocodeLocation(review.reviewedPersonLocation.city, review.reviewedPersonLocation.state);
    
    const distance = calculateDistance(userLocation.coordinates!, reviewCoords);
    return distance <= radiusMiles;
  });
}

/**
 * Get user's current location using Expo Location
 * Note: This is a placeholder - actual implementation would use expo-location
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    // Mock implementation - in production, use expo-location
    // const { status } = await Location.requestForegroundPermissionsAsync();
    // if (status !== 'granted') return null;
    // const location = await Location.getCurrentPositionAsync({});
    // return {
    //   latitude: location.coords.latitude,
    //   longitude: location.coords.longitude
    // };
    
    // For now, return mock coordinates for Alexandria, VA
    return { latitude: 38.8048, longitude: -77.0469 };
  } catch (error) {
    console.error("Error getting location:", error);
    return null;
  }
}

/**
 * Format distance for display
 * @param miles Distance in miles
 * @returns Formatted string
 */
export function formatDistance(miles: number): string {
  if (miles < 1) {
    return "< 1 mi";
  } else if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  } else {
    return `${Math.round(miles)} mi`;
  }
}