// Location utilities for LockerRoom MVP
import * as ExpoLocation from "expo-location";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  city: string;
  state: string;
  type?: 'city' | 'college';
  institutionType?: string;
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
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Geocoding function with comprehensive city database
 * @param city City name
 * @param state State abbreviation
 * @returns Approximate coordinates
 */
export function geocodeLocation(city: string, state: string): Coordinates {
  // Comprehensive coordinates database for cities worldwide
  const mockCoordinates: Record<string, Coordinates> = {
    // DMV Area (Washington DC Metro)
    "alexandria,va": { latitude: 38.8048, longitude: -77.0469 },
    "arlington,va": { latitude: 38.8816, longitude: -77.091 },
    "washington,dc": { latitude: 38.9072, longitude: -77.0369 },
    "bethesda,md": { latitude: 38.9847, longitude: -77.12 },
    "rockville,md": { latitude: 39.084, longitude: -77.1528 },
    "fairfax,va": { latitude: 38.8462, longitude: -77.3064 },
    "oxon hill,md": { latitude: 38.8020, longitude: -76.9730 },
    "silver spring,md": { latitude: 38.9906, longitude: -77.0261 },
    "college park,md": { latitude: 38.9807, longitude: -76.9369 },
    "hyattsville,md": { latitude: 38.9559, longitude: -76.9456 },
    "gaithersburg,md": { latitude: 39.1434, longitude: -77.2014 },
    "germantown,md": { latitude: 39.1731, longitude: -77.2717 },
    "bowie,md": { latitude: 38.9426, longitude: -76.7302 },
    "laurel,md": { latitude: 39.0993, longitude: -76.8483 },
    "greenbelt,md": { latitude: 38.9912, longitude: -76.8756 },
    "takoma park,md": { latitude: 38.9779, longitude: -77.0075 },
    "vienna,va": { latitude: 38.9012, longitude: -77.2653 },
    "falls church,va": { latitude: 38.8823, longitude: -77.1711 },
    "mclean,va": { latitude: 38.9342, longitude: -77.1775 },
    "reston,va": { latitude: 38.9687, longitude: -77.3411 },
    "herndon,va": { latitude: 38.9696, longitude: -77.3861 },
    "sterling,va": { latitude: 39.0062, longitude: -77.4286 },
    "leesburg,va": { latitude: 39.1157, longitude: -77.5636 },

    // Major US Cities
    "new york,ny": { latitude: 40.7128, longitude: -74.006 },
    "los angeles,ca": { latitude: 34.0522, longitude: -118.2437 },
    "chicago,il": { latitude: 41.8781, longitude: -87.6298 },
    "houston,tx": { latitude: 29.7604, longitude: -95.3698 },
    "phoenix,az": { latitude: 33.4484, longitude: -112.074 },
    "philadelphia,pa": { latitude: 39.9526, longitude: -75.1652 },
    "san antonio,tx": { latitude: 29.4241, longitude: -98.4936 },
    "san diego,ca": { latitude: 32.7157, longitude: -117.1611 },
    "dallas,tx": { latitude: 32.7767, longitude: -96.797 },
    "san jose,ca": { latitude: 37.3382, longitude: -121.8863 },
    "austin,tx": { latitude: 30.2672, longitude: -97.7431 },
    "jacksonville,fl": { latitude: 30.3322, longitude: -81.6557 },
    "fort worth,tx": { latitude: 32.7555, longitude: -97.3308 },
    "columbus,oh": { latitude: 39.9612, longitude: -82.9988 },
    "charlotte,nc": { latitude: 35.2271, longitude: -80.8431 },
    "san francisco,ca": { latitude: 37.7749, longitude: -122.4194 },
    "indianapolis,in": { latitude: 39.7684, longitude: -86.1581 },
    "seattle,wa": { latitude: 47.6062, longitude: -122.3321 },
    "denver,co": { latitude: 39.7392, longitude: -104.9903 },
    "boston,ma": { latitude: 42.3601, longitude: -71.0589 },
    "el paso,tx": { latitude: 31.7619, longitude: -106.485 },
    "detroit,mi": { latitude: 42.3314, longitude: -83.0458 },
    "nashville,tn": { latitude: 36.1627, longitude: -86.7816 },
    "portland,or": { latitude: 45.5152, longitude: -122.6784 },
    "memphis,tn": { latitude: 35.1495, longitude: -90.049 },
    "oklahoma city,ok": { latitude: 35.4676, longitude: -97.5164 },
    "las vegas,nv": { latitude: 36.1699, longitude: -115.1398 },
    "louisville,ky": { latitude: 38.2527, longitude: -85.7585 },
    "baltimore,md": { latitude: 39.2904, longitude: -76.6122 },
    "milwaukee,wi": { latitude: 43.0389, longitude: -87.9065 },
    "albuquerque,nm": { latitude: 35.0844, longitude: -106.6504 },
    "tucson,az": { latitude: 32.2226, longitude: -110.9747 },
    "fresno,ca": { latitude: 36.7378, longitude: -119.7871 },
    "mesa,az": { latitude: 33.4152, longitude: -111.8315 },
    "sacramento,ca": { latitude: 38.5816, longitude: -121.4944 },
    "kansas city,mo": { latitude: 39.0997, longitude: -94.5786 },
    "colorado springs,co": { latitude: 38.8339, longitude: -104.8214 },
    "miami,fl": { latitude: 25.7617, longitude: -80.1918 },
    "raleigh,nc": { latitude: 35.7796, longitude: -78.6382 },
    "omaha,ne": { latitude: 41.2565, longitude: -95.9345 },
    "long beach,ca": { latitude: 33.7701, longitude: -118.1937 },
    "virginia beach,va": { latitude: 36.8529, longitude: -75.978 },
    "oakland,ca": { latitude: 37.8044, longitude: -122.2711 },
    "minneapolis,mn": { latitude: 44.9778, longitude: -93.265 },
    "tulsa,ok": { latitude: 36.154, longitude: -95.9928 },
    "tampa,fl": { latitude: 27.9506, longitude: -82.4572 },
    "arlington,tx": { latitude: 32.7357, longitude: -97.1081 },
    "new orleans,la": { latitude: 29.9511, longitude: -90.0715 },

    // State Capitals
    "albany,ny": { latitude: 42.6526, longitude: -73.7562 },
    "annapolis,md": { latitude: 38.9784, longitude: -76.5951 },
    "atlanta,ga": { latitude: 33.749, longitude: -84.388 },
    "augusta,me": { latitude: 44.3106, longitude: -69.7795 },
    "baton rouge,la": { latitude: 30.4515, longitude: -91.1871 },
    "bismarck,nd": { latitude: 46.8083, longitude: -100.7837 },
    "boise,id": { latitude: 43.615, longitude: -116.2023 },
    "carson city,nv": { latitude: 39.1638, longitude: -119.7674 },
    "cheyenne,wy": { latitude: 41.14, longitude: -104.8197 },
    "columbia,sc": { latitude: 34.0007, longitude: -81.0348 },
    "concord,nh": { latitude: 43.2081, longitude: -71.5376 },
    "des moines,ia": { latitude: 41.5868, longitude: -93.625 },
    "dover,de": { latitude: 39.1573, longitude: -75.5277 },
    "frankfort,ky": { latitude: 38.2009, longitude: -84.8733 },
    "harrisburg,pa": { latitude: 40.2732, longitude: -76.8839 },
    "hartford,ct": { latitude: 41.7658, longitude: -72.6734 },
    "helena,mt": { latitude: 46.5958, longitude: -112.0362 },
    "honolulu,hi": { latitude: 21.3099, longitude: -157.8581 },
    "jackson,ms": { latitude: 32.2988, longitude: -90.1848 },
    "jefferson city,mo": { latitude: 38.5767, longitude: -92.1735 },
    "juneau,ak": { latitude: 58.3019, longitude: -134.4197 },
    "lansing,mi": { latitude: 42.3314, longitude: -84.5467 },
    "lincoln,ne": { latitude: 40.8136, longitude: -96.7026 },
    "little rock,ar": { latitude: 34.7465, longitude: -92.2896 },
    "madison,wi": { latitude: 43.0731, longitude: -89.4012 },
    "montgomery,al": { latitude: 32.3617, longitude: -86.2792 },
    "montpelier,vt": { latitude: 44.2601, longitude: -72.5806 },
    "olympia,wa": { latitude: 47.0379, longitude: -122.9015 },
    "pierre,sd": { latitude: 44.3683, longitude: -100.351 },
    "providence,ri": { latitude: 41.824, longitude: -71.4128 },
    "richmond,va": { latitude: 37.5407, longitude: -77.436 },
    "saint paul,mn": { latitude: 44.9537, longitude: -93.09 },
    "salem,or": { latitude: 44.9429, longitude: -123.0351 },
    "salt lake city,ut": { latitude: 40.7608, longitude: -111.891 },
    "santa fe,nm": { latitude: 35.687, longitude: -105.9378 },
    "springfield,il": { latitude: 39.7817, longitude: -89.6501 },
    "tallahassee,fl": { latitude: 30.4518, longitude: -84.2807 },
    "topeka,ks": { latitude: 39.0473, longitude: -95.689 },
    "trenton,nj": { latitude: 40.2206, longitude: -74.7565 },
  };

  const key = `${city.toLowerCase()},${state.toLowerCase()}`;
  return mockCoordinates[key] || { latitude: 38.9072, longitude: -77.0369 }; // Default to DC
}

// Simple in-memory cache for geocoding results to avoid repeated lookups
const geoCache = new Map<string, Coordinates>();

/**
 * Geocode city/state using mock database first, then fall back to device geocoding.
 * Caches results by normalized key "city,state".
 */
export async function geocodeCityStateCached(city: string, state?: string): Promise<Coordinates | null> {
  try {
    const key = `${(city || "").trim().toLowerCase()},${(state || "").trim().toLowerCase()}`;
    if (geoCache.has(key)) return geoCache.get(key)!;

    // Try mock lookup first
    let coords = geocodeLocation(city, state || "");
    const isDCDefault = coords.latitude === 38.9072 && coords.longitude === -77.0369;
    const isDCKey = key === "washington,dc";

    if (!isDCDefault || isDCKey) {
      geoCache.set(key, coords);
      return coords;
    }

    // Fallback to device geocoding for worldwide support
    const query = state ? `${city}, ${state}` : city;
    const results = await ExpoLocation.geocodeAsync(query);
    if (results && results.length > 0) {
      coords = { latitude: results[0].latitude, longitude: results[0].longitude };
      geoCache.set(key, coords);
      return coords;
    }
    return null;
  } catch (error) {
    console.warn("geocodeCityStateCached failed:", error);
    return null;
  }
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
  radiusMiles: number,
): T[] {
  // Backward-compatible synchronous path using mock geocoder
  const userCoords = userLocation.coordinates || geocodeLocation(userLocation.city, userLocation.state);
  return reviews.filter((review) => {
    const reviewCoords =
      review.reviewedPersonLocation.coordinates ||
      geocodeLocation(review.reviewedPersonLocation.city, review.reviewedPersonLocation.state);
    const distance = calculateDistance(userCoords, reviewCoords);
    return distance <= radiusMiles;
  });
}

/**
 * Worldwide-capable distance filtering using cached geocoding fallbacks.
 * Uses device geocoding when mock mapping is unavailable.
 */
export async function filterReviewsByDistanceAsync<T extends { reviewedPersonLocation: LocationData }>(
  reviews: T[],
  userLocation: LocationData,
  radiusMiles: number,
): Promise<T[]> {
  // Determine user coordinates
  let userCoords: Coordinates | null = userLocation.coordinates || null;
  if (!userCoords) {
    userCoords = await geocodeCityStateCached(userLocation.city, userLocation.state);
  }
  if (!userCoords) {
    // If we cannot geocode user location, return all reviews since server-side filtering should have pre-filtered by city/state
    console.warn("filterReviewsByDistanceAsync: missing user coordinates; returning server-filtered results without distance filtering");
    return reviews;
  }

  const filtered: T[] = [];
  // Deduplicate geocoding calls for review locations
  const neededKeys = new Set<string>();
  for (const r of reviews) {
    if (!r.reviewedPersonLocation.coordinates) {
      const key = `${(r.reviewedPersonLocation.city || "").trim().toLowerCase()},${(r.reviewedPersonLocation.state || "").trim().toLowerCase()}`;
      neededKeys.add(key);
    }
  }

  // Warm up cache sequentially (keeps it simple, avoids rate limits)
  for (const key of Array.from(neededKeys)) {
    const [city, state] = key.split(",");
    // Avoid re-fetch if cached
    if (!geoCache.has(key)) {
      await geocodeCityStateCached(city, state);
    }
  }

  for (const review of reviews) {
    let reviewCoords: Coordinates | null = review.reviewedPersonLocation.coordinates || null;
    if (!reviewCoords) {
      reviewCoords = await geocodeCityStateCached(
        review.reviewedPersonLocation.city,
        review.reviewedPersonLocation.state,
      );
    }
    if (!reviewCoords) {
      // If we can't geocode this review, conservatively exclude it from distance-based results
      continue;
    }
    const distance = calculateDistance(userCoords, reviewCoords);
    if (distance <= radiusMiles) {
      filtered.push(review);
    }
  }

  return filtered;
}

/**
 * Get user's current location using Expo Location
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    // Check if location services are enabled
    const servicesEnabled = await ExpoLocation.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      console.warn("Location services are disabled");
      return null;
    }

    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("Location permission not granted");
      return null;
    }

    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
      timeInterval: 15000, // 15 seconds timeout
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error("Error getting location:", error);
    return null;
  }
}

/**
 * Convert coordinates to city/state using reverse geocoding
 */
export async function reverseGeocodeLocation(coordinates: Coordinates): Promise<LocationData | null> {
  try {
    const addresses = await ExpoLocation.reverseGeocodeAsync(coordinates);
    if (addresses.length > 0) {
      const address = addresses[0];
      return {
        city: address.city || "Unknown City",
        state: address.region || "Unknown State",
        coordinates,
      };
    }
    return null;
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
}

/**
 * Search for locations using geocoding
 */
export async function searchLocations(query: string): Promise<LocationData[]> {
  try {
    const locations = await ExpoLocation.geocodeAsync(query);
    const results: LocationData[] = [];

    for (const location of locations.slice(0, 10)) {
      // Limit to 10 results
      try {
        const addresses = await ExpoLocation.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        if (addresses.length > 0) {
          const address = addresses[0];
          results.push({
            city: address.city || "Unknown City",
            state: address.region || "Unknown State",
            coordinates: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
          });
        }
      } catch (reverseError) {
        // Skip this location if reverse geocoding fails
        continue;
      }
    }

    return results;
  } catch (error) {
    console.error("Error searching locations:", error);
    return [];
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
