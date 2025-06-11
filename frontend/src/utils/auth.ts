interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  msg: string;
  success: boolean;
}

// TEMPORARY DEBUG MODE - Set to true to bypass authentication
const DEBUG_BYPASS_AUTH = false; // Change this to false when Firebase is fixed

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Login function
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  // TEMPORARY: Mock successful login in debug mode
  if (DEBUG_BYPASS_AUTH) {
    console.log("🚨 DEBUG MODE: Login bypassed");
    // Set a mock session in localStorage for consistency
    if (typeof window !== "undefined") {
      localStorage.setItem("debug_session", "mock_user_session");
      localStorage.setItem(
        "debug_user",
        JSON.stringify({
          id: "debug_user_123",
          username: credentials.username || "debug_user",
          email: "debug@example.com",
        })
      );
    }
    return { msg: "Debug login successful", success: true };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/user/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    return { msg: data.message, success: true };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Logout function
export const logout = async (): Promise<void> => {
  // TEMPORARY: Clear debug session in debug mode
  if (DEBUG_BYPASS_AUTH) {
    console.log("🚨 DEBUG MODE: Logout bypassed");
    if (typeof window !== "undefined") {
      localStorage.removeItem("debug_session");
      localStorage.removeItem("debug_user");
    }
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/api/user/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
};

// Check if user is authenticated by checking session status
export const isAuthenticated = async (): Promise<boolean> => {
  // TEMPORARY: Always return true in debug mode if debug session exists
  if (DEBUG_BYPASS_AUTH) {
    if (typeof window !== "undefined") {
      const hasDebugSession = localStorage.getItem("debug_session");
      console.log(
        "🚨 DEBUG MODE: Auth check bypassed -",
        hasDebugSession ? "authenticated" : "not authenticated"
      );
      return !!hasDebugSession;
    }
    return true; // Default to authenticated in debug mode on server
  }

  if (typeof window === "undefined") return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/status/api`, {
      method: "GET",
      credentials: "include", // Ensures cookies are sent
    });

    return response.ok;
  } catch {
    return false;
  }
};

// Get current user info from flask-login
export const getCurrentUser = async (): Promise<any> => {
  // TEMPORARY: Return mock user in debug mode
  if (DEBUG_BYPASS_AUTH) {
    if (typeof window !== "undefined") {
      const debugUser = localStorage.getItem("debug_user");
      if (debugUser) {
        console.log("🚨 DEBUG MODE: Returning mock user");
        return JSON.parse(debugUser);
      }
    }
    return {
      id: "debug_user_123",
      username: "debug_user",
      email: "debug@example.com",
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to get user info");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting user info:", error);
    throw error;
  }
};
