interface LoginCredentials {
  username: string;
  password: string;
}

export const login = async (credentials: LoginCredentials) => {
  const response = await fetch("http://localhost:5000/api/user/login", {
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

  // Save tokens to localStorage (for client-side authentication)
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("username", credentials.username);

  // Spara token som cookie (för middleware)
  document.cookie = `token=${data.access_token}; path=/; max-age=${
    60 * 60 * 24 * 7
  }`; // 7 dagars giltighetstid

  return data;
};

export const refreshToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/user/refresh-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data = await response.json();

    // Update token in localStorage
    localStorage.setItem("token", data.access_token);

    // Update token in cookies
    document.cookie = `token=${data.access_token}; path=/; max-age=${
      60 * 60 * 24 * 7
    }`; // 7 days validity

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    logout();
    return null;
  }
};

export const logout = () => {
  // Delete tokens from localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("username");

  // Ta bort cookie
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
};

export const isAuthenticated = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  let token = localStorage.getItem("token");

  // Om access token saknas, försök att förnya med refresh token
  if (!token) {
    const newToken = await refreshToken();
    return !!newToken;
  }

  // Token validation (checks if token is expired)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 > Date.now()) {
      return true;
    }

    // Token is expired, try to refresh
    const newToken = await refreshToken();
    return !!newToken;
  } catch {
    return false;
  }
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const getUsername = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("username");
};
