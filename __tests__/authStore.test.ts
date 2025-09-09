import { renderHook, act } from "@testing-library/react-hooks";
import useAuthStore from "../src/state/authStore";
import { supabaseAuth, supabaseUsers } from "../src/services/supabase";

jest.mock("../src/services/supabase", () => ({
  supabaseAuth: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getCurrentSession: jest.fn(),
    onAuthStateChanged: jest.fn(),
  },
  supabaseUsers: {
    getUserProfile: jest.fn(),
    createUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
  },
}));

describe("authStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets user and isAuthenticated correctly", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({ id: "test-user", email: "test@example.com" });
    });

    expect(result.current.user).toEqual({ id: "test-user", email: "test@example.com" });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("handles login success", async () => {
    const mockUser = { id: "user1", email: "user@example.com" };
    (supabaseAuth.signIn as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
    (supabaseUsers.getUserProfile as jest.Mock).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login("test@example.com", "password");
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(supabaseAuth.signIn).toHaveBeenCalledWith("test@example.com", "password");
  });

  it("handles login error", async () => {
    (supabaseAuth.signIn as jest.Mock).mockRejectedValue(new Error("Invalid credentials"));

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login("test@example.com", "password");
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
