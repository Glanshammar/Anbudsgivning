interface User {
  username: string;
  email: string;
  password: string;
}

export const registerUser = async (user: User) => {
  try {
    const response = await fetch("http://localhost:5000/api/users/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });
    const data = await response.json();
    console.log(data);
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
