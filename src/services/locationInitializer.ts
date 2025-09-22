import { locationService } from "./locationService";
import useAuthStore from "../state/authStore";

export class LocationInitializer {
  private static instance: LocationInitializer;
  private hasInitialized = false;

  static getInstance(): LocationInitializer {
    if (!LocationInitializer.instance) {
      LocationInitializer.instance = new LocationInitializer();
    }
    return LocationInitializer.instance;
  }

  async initialize(): Promise<void> {
    if (this.hasInitialized) {
      return;
    }

    try {
      const authState = useAuthStore.getState();
      const user = authState.user;

      if (user && (user.location?.city === "Unknown" || !user.location?.city)) {
        const result = await locationService.detectLocation();

        if (result.success && result.location) {
          await authState.updateUserLocation({
            city: result.location.city,
            state: result.location.state,
            coordinates: result.location.coordinates,
            type: result.location.type,
            fullName: result.location.fullName,
            institutionType: result.location.institutionType,
          });
        }
      }

      this.hasInitialized = true;
    } catch (error) {
      console.error("Location initialization error:", error);
      this.hasInitialized = true;
    }
  }
}

export const locationInitializer = LocationInitializer.getInstance();
