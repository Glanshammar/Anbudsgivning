export interface Portal {
  url: string;
  username: string;
  password: string;
}

export const getPortals = async () => {
  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:5000/api/tender_portals", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error("Failed to fetch portals");
  }
  return Array.isArray(data.portals) ? data.portals : [];
};

export const setTenderPortals = async (portals: Portal[]) => {
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
