interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  msg: string;
  success: boolean;
}

const API_BASE_URL = "http://localhost:5000";

// Login function - flask-login will handle session creation
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // This ensures cookies are sent and received
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Inloggningen misslyckades");
  }

  const data = await response.json();
  return data;
};

// Logout function - flask-login will clear session
export const logout = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensures cookies are sent for authentication
    });

    // Even if the request fails, we should redirect to login
    // because the user wants to log out
  } catch (error) {
    console.error("Logout request failed:", error);
    // Continue with logout even if request fails
  }

  // Redirect to login page
  window.location.href = "/login";
};

// Check if user is authenticated by checking session status
export const isAuthenticated = async (): Promise<boolean> => {
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
