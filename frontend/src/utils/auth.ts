interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  msg: string;
  success: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Login function
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

// Logout function
export const logout = async (): Promise<void> => {
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
export const getCurrentUser = async (): Promise<Record<string, unknown>> => {
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
