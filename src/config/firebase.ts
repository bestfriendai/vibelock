// Firebase configuration for LockerRoom MVP
// Using demo configuration for development

// Mock Firebase configuration for development
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "lockerroom-demo.firebaseapp.com",
  projectId: "lockerroom-demo",
  storageBucket: "lockerroom-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// For now, we'll create mock implementations
// These will be replaced with actual Firebase imports once the build system is properly configured

export const db = {
  collection: (path: string) => ({
    add: async (data: any) => ({ id: `mock_${Date.now()}` }),
    doc: (id: string) => ({
      set: async (data: any) => {},
      get: async () => ({ exists: true, data: () => ({}) }),
      update: async (data: any) => {},
      delete: async () => {}
    }),
    where: (field: string, operator: string, value: any) => ({
      get: async () => ({ docs: [] })
    }),
    orderBy: (field: string, direction?: string) => ({
      limit: (count: number) => ({
        get: async () => ({ docs: [] })
      })
    }),
    get: async () => ({ docs: [] })
  })
};

export const auth = {
  currentUser: null,
  signInWithEmailAndPassword: async (email: string, password: string) => ({ user: { uid: "mock_user" } }),
  createUserWithEmailAndPassword: async (email: string, password: string) => ({ user: { uid: "mock_user" } }),
  signOut: async () => {},
  onAuthStateChanged: (callback: (user: any) => void) => {
    // Mock auth state
    return () => {};
  }
};

export default { firebaseConfig };