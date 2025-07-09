// Import the login API service
import {
  login as apiLogin,
  logout as apiLogout,
  isAuthenticated as apiIsAuthenticated,
  getCurrentUser as apiGetCurrentUser,
  type User,
} from "@/services/api/login";

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  msg: string;
  success: boolean;
  user?: User;
}

/**
 * Authenticates user using the API service (mock or real backend)
 */
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    return await apiLogin(credentials);
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Logs out user using the API service (mock or real backend)
 */
export const logout = async (): Promise<void> => {
  try {
    await apiLogout();
  } catch (error) {
    console.error("Logout error:", error);
  }
};

/**
 * Check if user is authenticated using the API service (mock or real backend)
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    return await apiIsAuthenticated();
  } catch {
    return false;
  }
};

/**
 * Retrieves current user information using the API service (mock or real backend)
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    return await apiGetCurrentUser();
  } catch (error) {
    console.error("Error getting user info:", error);
    throw error;
  }
};
