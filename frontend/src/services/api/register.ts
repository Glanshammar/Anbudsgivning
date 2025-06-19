interface User {
  username: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  message: string;
  success: boolean;
}

const API_BASE_URL = "http://localhost:5000";

export const registerUser = async (user: User): Promise<RegisterResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(user),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol."
      );
    }

    return data;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};
