import { type User } from "./login";

interface ProfileUpdateData {
  email?: string;
  username?: string;
  password?: string;
  name?: string;
}

interface ProfileResponse {
  message: string;
  user?: User;
}

// Configuration - set to true to use mock data instead of backend
const USE_DUMMY = true;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Mock profile update function
 */
const mockUpdateProfile = async (
  data: ProfileUpdateData
): Promise<ProfileResponse> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (typeof window === "undefined") {
        reject(new Error("Not available on server side"));
        return;
      }

      // Get current user from localStorage
      const storedUser = localStorage.getItem("mockUser");
      if (!storedUser) {
        reject(new Error("No authenticated user"));
        return;
      }

      try {
        const currentUser: User = JSON.parse(storedUser);

        // Update user data with provided fields
        const updatedUser: User = {
          ...currentUser,
          ...(data.email && { email: data.email }),
          ...(data.username && { username: data.username }),
          ...(data.name && { name: data.name }),
          // Note: In a real app, password would be hashed and not stored in the user object
        };

        // Save updated user back to localStorage
        localStorage.setItem("mockUser", JSON.stringify(updatedUser));

        console.log("🎭 Mock profile updated:", data);
        resolve({
          message: "Profil uppdaterad framgångsrikt",
          user: updatedUser,
        });
      } catch (error) {
        reject(new Error("Failed to update mock profile"));
      }
    }, 300); // Simulate network delay
  });
};

/**
 * Real backend profile update
 */
const realUpdateProfile = async (
  data: ProfileUpdateData
): Promise<ProfileResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Failed to update profile");
    }

    return responseData;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

/**
 * Updates the user profile - uses mock or real based on USE_DUMMY flag
 */
export const updateProfile = async (
  data: ProfileUpdateData
): Promise<ProfileResponse> => {
  if (USE_DUMMY) {
    console.log("🎭 Using mock profile update");
    return mockUpdateProfile(data);
  } else {
    console.log("🔐 Using real backend profile update");
    return realUpdateProfile(data);
  }
};

/**
 * Mock get profile function
 */
const mockGetProfile = async (): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (typeof window === "undefined") {
        reject(new Error("Not available on server side"));
        return;
      }

      const storedUser = localStorage.getItem("mockUser");
      if (!storedUser) {
        reject(new Error("No authenticated user"));
        return;
      }

      try {
        const user: User = JSON.parse(storedUser);
        console.log("🎭 Mock profile retrieved");
        resolve(user);
      } catch (error) {
        reject(new Error("Failed to get mock profile"));
      }
    }, 200); // Simulate network delay
  });
};

/**
 * Real backend get profile
 */
const realGetProfile = async (): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Failed to get profile");
    }

    return responseData;
  } catch (error) {
    console.error("Error getting profile:", error);
    throw error;
  }
};

/**
 * Gets the current user profile - uses mock or real based on USE_DUMMY flag
 */
export const getProfile = async (): Promise<User> => {
  if (USE_DUMMY) {
    return mockGetProfile();
  } else {
    return realGetProfile();
  }
};
