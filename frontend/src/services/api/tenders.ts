export interface Tender {
  project_name: string;
  branch: string;
  deadline: string;
  end_date: string;
  start_date: string;
}

const USE_DUMMY = false;
const API_BASE_URL = "http://localhost:5000";

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
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/tenders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensures cookies are sent for authentication
    });

    if (!response.ok) {
      console.error(
        "Tenders fetch error:",
        response.status,
        response.statusText
      );
      console.warn("Falling back to dummy tender data");
      return dummyTenders;
    }

    const data = await response.json();
    console.log("API response:", data); // For debugging

    if (data && data.tenders && Array.isArray(data.tenders)) {
      return data.tenders;
    }

    // Fallback
    console.warn("Unexpected API response format", data);
    return [];
  } catch (error) {
    console.error("Error fetching tenders:", error);
    console.warn("Falling back to dummy tender data");
    return dummyTenders;
  }
}

export async function createTenders(tenders: Tender[]): Promise<any> {
  if (USE_DUMMY) {
    console.log("Using dummy mode - tenders would be created:", tenders);
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/tenders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensures cookies are sent for authentication
      body: JSON.stringify({ tenders }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create tenders: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("API response:", data); // For debugging
    return data;
  } catch (error) {
    console.error("Error creating tenders:", error);
    throw error;
  }
}

export async function updateTenders(tenders: Tender[]): Promise<any> {
  if (USE_DUMMY) {
    console.log("Using dummy mode - tenders would be updated:", tenders);
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/tenders`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensures cookies are sent for authentication
      body: JSON.stringify({ tenders }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update tenders: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("API response:", data); // For debugging
    return data;
  } catch (error) {
    console.error("Error updating tenders:", error);
    throw error;
  }
}
