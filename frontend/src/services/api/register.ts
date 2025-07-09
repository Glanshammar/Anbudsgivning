interface User {
  username: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  message: string;
  success: boolean;
}

// Configuration - set to true to use mock data instead of backend
const USE_DUMMY = true;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Mock user registration function
 */
const mockRegisterUser = async (user: User): Promise<RegisterResponse> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Basic validation for demo purposes
      if (
        !user.username.trim() ||
        !user.email.trim() ||
        !user.password.trim()
      ) {
        reject(new Error("Alla fält måste fyllas i"));
        return;
      }

      if (user.password.length < 6) {
        reject(new Error("Lösenordet måste vara minst 6 tecken långt"));
        return;
      }

      if (!user.email.includes("@")) {
        reject(new Error("Ogiltig email-adress"));
        return;
      }

      console.log(`🎭 Mock: User registered successfully: ${user.username}`);
      resolve({
        message: `Användare ${user.username} skapad framgångsrikt!`,
        success: true,
      });
    }, 800); // Simulate network delay
  });
};

/**
 * Real backend user registration
 */
const realRegisterUser = async (user: User): Promise<RegisterResponse> => {
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

/**
 * Register user - uses mock or real based on USE_DUMMY flag
 */
export const registerUser = async (user: User): Promise<RegisterResponse> => {
  if (USE_DUMMY) {
    console.log("🎭 Using mock user registration");
    return mockRegisterUser(user);
  } else {
    console.log("🔐 Using real backend registration");
    return realRegisterUser(user);
  }
};
