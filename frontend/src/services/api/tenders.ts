export interface Tender {
  project_name: string;
  branch: string;
  deadline: string;
  end_date: string;
  start_date: string;
}

const USE_DUMMY = false;

const dummyTenders: Tender[] = [
  {
    project_name: "Projekt 1",
    branch: "Bygg & Anläggning",
    deadline: "2025-06-05",
    end_date: "2025-06-05",
    start_date: "2025-05-04",
  },
  {
    project_name: "Projekt 2",
    branch: "Energi",
    deadline: "2025-06-05",
    end_date: "2025-05-15",
    start_date: "2025-05-08",
  },
  {
    project_name: "Projekt 3",
    branch: "Fastighetsskötsel",
    deadline: "2025-06-05",
    end_date: "2025-05-25",
    start_date: "2025-05-20",
  },
];

export async function getTenders(): Promise<Tender[]> {
  if (USE_DUMMY) {
    console.log("Using dummy tender data");
    return new Promise((resolve) =>
      setTimeout(() => resolve(dummyTenders), 500)
    );
  } else {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/tenders", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.error("Tenders fetch error:", errorText);
      } catch (e) {
        console.error("Could not read error text:", e);
      }
      console.warn("Falling back to dummy tender data");
      return dummyTenders;
    }

    const data = await response.json();
<<<<<<< HEAD
    console.log("API response:", data); // For debugging

    // API returns { tenders: [...] } so we need to extract the tenders-array
    if (data && Array.isArray(data.tenders)) {
      // If data.tenders is an array, return it directly
      return data.tenders.map((tender: any, index: number) => ({
        id: `tender-${index}`, // Create a synthetic ID if there is none
        ...tender,
      }));
    } else if (typeof data === "object" && data !== null) {
      // Backward compatibility for old API format
      return Object.entries(data).map(([id, tenderData]: [string, any]) => ({
        id,
        ...tenderData,
      }));
=======
    if (data && data.tenders && Array.isArray(data.tenders)) {
      return data.tenders;
>>>>>>> development
    }

    // Fallback
    console.warn("Unexpected API response format", data);
    return [];
  }
}

export async function createTenders(tenders: Tender[]): Promise<any> {
  if (USE_DUMMY) {
    console.log("Using dummy mode - tenders would be created:", tenders);
    return { success: true };
  }

  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:5000/api/tenders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tenders }),
  });

  if (!response.ok) {
    throw new Error("Failed to create tenders");
  }

  return await response.json();
}

export async function updateTenders(tenders: Tender[]): Promise<any> {
  if (USE_DUMMY) {
    console.log("Using dummy mode - tenders would be updated:", tenders);
    return { success: true };
  }

  const token = localStorage.getItem("token");
  const response = await fetch("http://localhost:5000/api/tenders", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tenders }),
  });

  if (!response.ok) {
    throw new Error("Failed to update tenders");
  }

  return await response.json();
}
