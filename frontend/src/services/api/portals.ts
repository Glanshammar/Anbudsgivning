export interface Portal {
  url: string;
  username: string;
  password: string;
}

const USE_DUMMY = false;
const API_BASE_URL = "http://localhost:5000";

// Dummy-data
const dummyPortals: Portal[] = [
  {
    url: "https://example-portal1.com",
    username: "testuser1",
    password: "password1",
  },
  {
    url: "https://example-portal2.com",
    username: "testuser2",
    password: "password2",
  },
];

export const getPortals = async (): Promise<Portal[]> => {
  if (USE_DUMMY) {
    console.log("Using dummy portal data");
    return new Promise((resolve) =>
      setTimeout(() => resolve(dummyPortals), 500)
    );
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/tender_portals`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensures cookies are sent for authentication
    });

    if (!response.ok) {
      console.error(
        "Portal fetch error:",
        response.status,
        response.statusText
      );
      console.warn("Falling back to dummy portal data");
      return dummyPortals;
    }

    const data = await response.json();
    return Array.isArray(data.portals) ? data.portals : [];
  } catch (error) {
    console.error("Error fetching portals:", error);
    console.warn("Falling back to dummy portal data");
    return dummyPortals;
  }
};

export const setTenderPortals = async (portals: Portal[]): Promise<any> => {
  if (USE_DUMMY) {
    console.log("Using dummy mode - portals set to:", portals);
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/tender_portals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensures cookies are sent for authentication
      body: JSON.stringify({ portals }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create portals: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("API response:", data); // For debugging
    return data;
  } catch (error) {
    console.error("Error creating portals:", error);
    throw error;
  }
};
