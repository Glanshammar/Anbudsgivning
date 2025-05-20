interface ProfileUpdateData {
  email?: string;
  username?: string;
  password?: string;
}

/**
 * Updates the user profile with the provided data
 * @param data ProfileUpdateData - Can include email, username, and/or password
 * @returns The response from the server
 */
export const updateProfile = async (data: ProfileUpdateData) => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch("http://localhost:5000/api/users/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Failed to update profile");
    }

    // If username was updated, update it in localStorage
    if (data.username) {
      localStorage.setItem("username", data.username);
    }

    return responseData;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};
