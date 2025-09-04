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
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => {
        set((state) => ({ 
          ...state,
          user, 
          isAuthenticated: !!user,
          error: null 
        }));
      },

      setLoading: (isLoading) => {
        set((state) => ({ ...state, isLoading }));
      },

      setError: (error) => {
        set((state) => ({ ...state, error, isLoading: false }));
      },

      clearError: () => {
        set((state) => ({ ...state, error: null }));
      },

      login: async (email, _password) => {
        try {
          set((state) => ({ ...state, isLoading: true, error: null }));
          
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
          
          set((state) => ({ 
            ...state,
            user: mockUser, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          }));
        } catch (error) {
          set((state) => ({ 
            ...state,
            error: error instanceof Error ? error.message : "Login failed",
            isLoading: false 
          }));
        }
      },

      register: async (email, _password, location) => {
        try {
          set((state) => ({ ...state, isLoading: true, error: null }));
          
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
          
          set((state) => ({ 
            ...state,
            user: mockUser, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          }));
        } catch (error) {
          set((state) => ({ 
            ...state,
            error: error instanceof Error ? error.message : "Registration failed",
            isLoading: false 
          }));
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