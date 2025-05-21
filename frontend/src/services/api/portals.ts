export interface Portal {
  url: string;
  username: string;
  password: string;
}

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

const USE_DUMMY = false;

export const getPortals = async () => {
  if (USE_DUMMY) {
    console.log("Using dummy portal data");
    return new Promise((resolve) =>
      setTimeout(() => resolve(dummyPortals), 500)
    );
  }

  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:5000/api/tender_portals", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    try {
      const errorText = await response.text();
      console.error("Portal fetch error:", errorText);
    } catch (e) {
      console.error("Could not read error text:", e);
    }
    console.warn("Falling back to dummy portal data");
    return dummyPortals;
  }

  const data = await response.json();
  return Array.isArray(data.portals) ? data.portals : [];
};

export const setTenderPortals = async (portals: Portal[]) => {
  if (USE_DUMMY) {
    console.log("Using dummy mode - portals set to:", portals);
    return { success: true };
  }

  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:5000/api/tender_portals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ portals }),
  });

  if (!response.ok) {
    throw new Error("Failed to create portals");
  }

  return await response.json();
};
