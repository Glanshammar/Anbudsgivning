interface LoginCredentials {
  username: string;
  password: string;
}

export const login = async (credentials: LoginCredentials) => {
  const response = await fetch("http://localhost:5000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Inloggningen misslyckades");
  }

  const data = await response.json();
  localStorage.setItem("token", data.token);
  return data;
};


export const logout = () => {
  localStorage.removeItem("token");
};

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;

  const token = localStorage.getItem("token");
  if (!token) return false;

  // Token validation (checks if token is expired)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};
