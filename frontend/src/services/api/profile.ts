interface ProfileUpdateData {
  email?: string;
  username?: string;
  password?: string;
}

const API_BASE_URL = "http://localhost:5000";

/**
 * Updates the user profile with the provided data
 * @param data ProfileUpdateData - Can include email, username, and/or password
 * @returns The response from the server
 */
export const updateProfile = async (data: ProfileUpdateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensures cookies are sent for authentication
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
 * Gets the current user profile
 * @returns The user profile data
 */
export const getProfile = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensures cookies are sent for authentication
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
