interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  msg: string;
  success: boolean;
  user?: User;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  company_id: string;
  company_name: string;
  role: string;
}

// Configuration - set to true to use mock data instead of backend
const USE_DUMMY = true;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Mock user data - simulate different companies and users
const mockUsers: User[] = [
  {
    id: "user_1",
    username: "admin",
    email: "admin@byggab.se",
    name: "Adam Admin",
    company_id: "company_1",
    company_name: "Bygg AB",
    role: "admin",
  },
  {
    id: "user_2",
    username: "erik",
    email: "erik@byggab.se",
    name: "Erik Larsson",
    company_id: "company_1",
    company_name: "Bygg AB",
    role: "user",
  },
  {
    id: "user_3",
    username: "maria",
    email: "maria@teknikab.se",
    name: "Maria Johansson",
    company_id: "company_2",
    company_name: "Teknik AB",
    role: "user",
  },
  {
    id: "user_4",
    username: "test",
    email: "test@test.se",
    name: "Test Testsson",
    company_id: "company_1",
    company_name: "Bygg AB",
    role: "user",
  },
];

// Simple session storage to track current user
let currentUser: User | null = null;

/**
 * Mock authentication function
 * Accepts any username/password combination for demo purposes
 */
const mockLogin = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // For demo: accept any non-empty username/password
      if (!credentials.username.trim() || !credentials.password.trim()) {
        resolve({
          msg: "Användarnamn och lösenord krävs",
          success: false,
        });
        return;
      }

      // Try to find user by username, default to first user if not found
      const user =
        mockUsers.find((u) => u.username === credentials.username) ||
        mockUsers[0];

      // Set current user in session
      currentUser = user;

      // Store user in localStorage for persistence across browser sessions
      if (typeof window !== "undefined") {
        localStorage.setItem("mockUser", JSON.stringify(user));
      }

      resolve({
        msg: `Välkommen tillbaka, ${user.name}!`,
        success: true,
        user: user,
      });
    }, 500); // Simulate network delay
  });
};

/**
 * Real backend authentication (when USE_DUMMY = false)
 */
const realLogin = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
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
    return { msg: data.message, success: true, user: data.user };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Main login function - uses mock or real based on USE_DUMMY flag
 */
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  if (USE_DUMMY) {
    console.log("🎭 Using mock authentication");
    return mockLogin(credentials);
  } else {
    console.log("🔐 Using real backend authentication");
    return realLogin(credentials);
  }
};

/**
 * Mock logout function
 */
const mockLogout = async (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      currentUser = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("mockUser");
      }
      console.log("🎭 Mock user logged out");
      resolve();
    }, 200);
  });
};

/**
 * Real backend logout
 */
const realLogout = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/api/user/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
};

/**
 * Main logout function - uses mock or real based on USE_DUMMY flag
 */
export const logout = async (): Promise<void> => {
  if (USE_DUMMY) {
    return mockLogout();
  } else {
    return realLogout();
  }
};

/**
 * Mock authentication check
 */
const mockIsAuthenticated = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }

      // Check if user exists in localStorage
      const storedUser = localStorage.getItem("mockUser");
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser);
          resolve(true);
        } catch {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    }, 100);
  });
};

/**
 * Real backend authentication check
 */
const realIsAuthenticated = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/status/api`, {
      method: "GET",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Check if user is authenticated - uses mock or real based on USE_DUMMY flag
 */
export const isAuthenticated = async (): Promise<boolean> => {
  if (USE_DUMMY) {
    return mockIsAuthenticated();
  } else {
    return realIsAuthenticated();
  }
};

/**
 * Mock get current user
 */
const mockGetCurrentUser = async (): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (typeof window === "undefined") {
        reject(new Error("Not available on server side"));
        return;
      }

      const storedUser = localStorage.getItem("mockUser");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          currentUser = user;
          resolve(user);
        } catch {
          reject(new Error("Invalid stored user data"));
        }
      } else if (currentUser) {
        resolve(currentUser);
      } else {
        reject(new Error("No authenticated user"));
      }
    }, 100);
  });
};

/**
 * Real backend get current user
 */
const realGetCurrentUser = async (): Promise<User> => {
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

/**
 * Get current authenticated user - uses mock or real based on USE_DUMMY flag
 */
export const getCurrentUser = async (): Promise<User> => {
  if (USE_DUMMY) {
    return mockGetCurrentUser();
  } else {
    return realGetCurrentUser();
  }
};

/**
 * Get all available mock users (for development/testing)
 * Only available when USE_DUMMY = true
 */
export const getMockUsers = (): User[] => {
  if (USE_DUMMY) {
    return [...mockUsers];
  }
  return [];
};

/**
 * Set mock user for testing (bypasses login)
 * Only available when USE_DUMMY = true
 */
export const setMockUser = (userId: string): boolean => {
  if (!USE_DUMMY) return false;

  const user = mockUsers.find((u) => u.id === userId);
  if (user) {
    currentUser = user;
    if (typeof window !== "undefined") {
      localStorage.setItem("mockUser", JSON.stringify(user));
    }
    return true;
  }
  return false;
};
