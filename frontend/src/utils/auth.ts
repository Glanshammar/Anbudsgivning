interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  msg: string;
  success: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Authenticates user with backend and establishes session
 * Uses cookies for session management (Flask-Login compatible)
 */
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Critical: ensures cookies are sent and received for session management
    body: JSON.stringify(credentials),
  });

  try {
    let errorMessage = "Inloggningen misslyckades";
    if (!response.ok) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If response is not JSON, keep default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { msg: data.message, success: true };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Logs out user and destroys session
 */
export const logout = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/api/user/logout`, {
      method: "POST",
      credentials: "include", // Include session cookies for logout
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
};

/**
 * Check if user is authenticated by verifying session status
 * Used by components to conditionally render content
 */
export const isAuthenticated = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false; // Prevent SSR issues

  try {
    const response = await fetch(`${API_BASE_URL}/api/status/api`, {
      method: "GET",
      credentials: "include", // Ensures session cookies are sent
    });

    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Retrieves current user information from Flask-Login session
 */
export const getCurrentUser = async (): Promise<Record<string, unknown>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
      method: "GET",
      credentials: "include", // Include session cookies
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
