import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LocationData {
  city: string;
  state: string;
  fullName: string;
  type?: "city" | "college";
  institutionType?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface LocationDetectionResult {
  success: boolean;
  location?: LocationData;
  error?: string;
  source: "gps" | "stored" | "ip" | "fallback";
}

class LocationService {
  private static readonly LOCATION_CACHE_KEY = "cached_location";
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Detect user location with multiple fallback strategies
   */
  async detectLocation(): Promise<LocationDetectionResult> {
    try {
      // Strategy 1: Try GPS location
      const gpsResult = await this.getGPSLocation();
      if (gpsResult.success) {
        await this.cacheLocation(gpsResult.location!);
        return gpsResult;
      }

      // Strategy 2: Try cached location
      const cachedResult = await this.getCachedLocation();
      if (cachedResult.success) {
        return cachedResult;
      }

      // Strategy 3: Try IP-based location
      const ipResult = await this.getIPLocation();
      if (ipResult.success) {
        await this.cacheLocation(ipResult.location!);
        return ipResult;
      }

      // Strategy 4: Fallback to major cities
      return this.getFallbackLocation();
    } catch (error) {
      console.warn("Location detection failed:", error);
      return this.getFallbackLocation();
    }
  }

  /**
   * Get location using device GPS
   */
  private async getGPSLocation(): Promise<LocationDetectionResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return {
          success: false,
          error: "Location permission denied",
          source: "gps",
        };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address && address[0]) {
        const addr = address[0];
        return {
          success: true,
          location: {
            city: addr.city || addr.subregion || "Unknown City",
            state: addr.region || addr.isoCountryCode || "Unknown State",
            fullName: `${addr.city || "Unknown"}, ${addr.region || addr.isoCountryCode || "Unknown"}`,
            coordinates: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
          },
          source: "gps",
        };
      }

      return {
        success: false,
        error: "Could not reverse geocode location",
        source: "gps",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "GPS location failed",
        source: "gps",
      };
    }
  }

  /**
   * Get cached location if still valid
   */
  private async getCachedLocation(): Promise<LocationDetectionResult> {
    try {
      const cached = await AsyncStorage.getItem(LocationService.LOCATION_CACHE_KEY);
      if (!cached) {
        return { success: false, error: "No cached location", source: "stored" };
      }

      const { location, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp > LocationService.CACHE_DURATION) {
        return { success: false, error: "Cached location expired", source: "stored" };
      }

      return {
        success: true,
        location,
        source: "stored",
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to read cached location",
        source: "stored",
      };
    }
  }

  /**
   * Get location using IP geolocation
   */
  private async getIPLocation(): Promise<LocationDetectionResult> {
    try {
      const response = await fetch("https://ipapi.co/json/");

      if (!response.ok) {
        throw new Error("IP location service unavailable");
      }

      const data = await response.json();

      if (data.city && data.region) {
        return {
          success: true,
          location: {
            city: data.city,
            state: data.region,
            fullName: `${data.city}, ${data.region}`,
            coordinates:
              data.latitude && data.longitude
                ? {
                    latitude: parseFloat(data.latitude),
                    longitude: parseFloat(data.longitude),
                  }
                : undefined,
          },
          source: "ip",
        };
      }

      return {
        success: false,
        error: "IP location data incomplete",
        source: "ip",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "IP location failed",
        source: "ip",
      };
    }
  }

  /**
   * Fallback to major US cities based on common usage
   */
  private getFallbackLocation(): LocationDetectionResult {
    const fallbackCities = [
      { city: "New York", state: "NY", coords: { latitude: 40.7128, longitude: -74.006 } },
      { city: "Los Angeles", state: "CA", coords: { latitude: 34.0522, longitude: -118.2437 } },
      { city: "Chicago", state: "IL", coords: { latitude: 41.8781, longitude: -87.6298 } },
      { city: "Houston", state: "TX", coords: { latitude: 29.7604, longitude: -95.3698 } },
      { city: "Phoenix", state: "AZ", coords: { latitude: 33.4484, longitude: -112.074 } },
      { city: "Philadelphia", state: "PA", coords: { latitude: 39.9526, longitude: -75.1652 } },
      { city: "San Antonio", state: "TX", coords: { latitude: 29.4241, longitude: -98.4936 } },
      { city: "San Diego", state: "CA", coords: { latitude: 32.7157, longitude: -117.1611 } },
      { city: "Dallas", state: "TX", coords: { latitude: 32.7767, longitude: -96.797 } },
      { city: "San Jose", state: "CA", coords: { latitude: 37.3382, longitude: -121.8863 } },
    ];

    // Select a random major city as fallback
    const randomCity = fallbackCities[Math.floor(Math.random() * fallbackCities.length)];

    if (!randomCity) {
      // Fallback to first city if random selection fails
      const defaultCity = fallbackCities[0];
      if (!defaultCity) {
        return {
          success: false,
          error: "No fallback cities available",
          source: "fallback",
        };
      }
      return {
        success: true,
        location: {
          city: defaultCity.city,
          state: defaultCity.state,
          fullName: `${defaultCity.city}, ${defaultCity.state}`,
          coordinates: defaultCity.coords,
        },
        source: "fallback",
      };
    }

    return {
      success: true,
      location: {
        city: randomCity.city,
        state: randomCity.state,
        fullName: `${randomCity.city}, ${randomCity.state}`,
        coordinates: randomCity.coords,
      },
      source: "fallback",
    };
  }

  /**
   * Cache location data
   */
  private async cacheLocation(location: LocationData): Promise<void> {
    try {
      const cacheData = {
        location,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(LocationService.LOCATION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to cache location:", error);
    }
  }

  /**
   * Clear cached location
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LocationService.LOCATION_CACHE_KEY);
    } catch (error) {
      console.warn("Failed to clear location cache:", error);
    }
  }
}

export const locationService = new LocationService();
