import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, location: { city: string; state: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          error: null 
        });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      clearError: () => {
        set({ error: null });
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          
          // Mock login for development
          const mockUser: User = {
            id: "mock_user_id",
            email,
            anonymousId: `anon_${Date.now()}`,
            location: {
              city: "Alexandria",
              state: "VA"
            },
            genderPreference: "all",
            createdAt: new Date()
          };

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          set({ 
            user: mockUser, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Login failed",
            isLoading: false 
          });
        }
      },

      register: async (email, password, location) => {
        try {
          set({ isLoading: true, error: null });
          
          // Mock registration for development
          const mockUser: User = {
            id: `user_${Date.now()}`,
            email,
            anonymousId: `anon_${Date.now()}`,
            location,
            genderPreference: "all",
            createdAt: new Date()
          };

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          set({ 
            user: mockUser, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Registration failed",
            isLoading: false 
          });
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Logout failed",
            isLoading: false 
          });
        }
      }
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user data, not loading states
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;