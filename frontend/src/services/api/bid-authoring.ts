/**
 * Interface for bid authoring data structure
 * Contains all sections needed for a complete bid document
 */
export interface BidAuthoringData {
  personuppgifter: {
    companyName: string;
    orgNumber: string;
    address: string;
    contactPerson: string;
    email: string;
    phone: string;
  };
  summary: string; // Executive summary of the bid
  keySkills: string; // Key competencies and skills
  history: string; // Company history and relevant experience
  status: number; // Draft status (0 = draft, 1 = completed, etc.)
  last_modified?: string;
}

export interface BidAuthoringRequest {
  tender_id: string;
  bid_data: BidAuthoringData;
}

// Configuration - set to true to use mock data instead of backend
const USE_DUMMY = true;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Default company data template
 * Used when no existing bid data is found - can be fetched from user profile in future
 */
const DEFAULT_COMPANY_DATA = {
  companyName: "Mitt Företag AB",
  orgNumber: "556123-4567",
  address: "Huvudgatan 1, 123 45 Stockholm",
  contactPerson: "Anna Andersson",
  email: "anna@mittforetag.se",
  phone: "08-123 456 78",
};

// Mock bid authoring data - simulates stored bid data for different tenders
const mockBidAuthoringData: Record<string, BidAuthoringData> = {
  "Projekt 2": {
    personuppgifter: DEFAULT_COMPANY_DATA,
    summary:
      "Vi föreslår en innovativ lösning som kombinerar teknisk expertis med hållbar utveckling för att leverera högkvalitativa resultat.",
    keySkills:
      "• Teknisk expertis inom IT och automation\n• Projektledning enligt Agile metoder\n• Kvalitetssäkring och testning\n• Hållbar systemutveckling",
    history:
      "• 15+ års erfarenhet av liknande projekt\n• Levererat 50+ framgångsrika system\n• 95% kundnöjdhet\n• Certifierade enligt ISO 9001",
    status: 1,
    last_modified: "2025-01-20T10:30:00Z",
  },
  "Projekt 22": {
    personuppgifter: DEFAULT_COMPANY_DATA,
    summary:
      "Komplett IT-plattform med fokus på användardata och systemintegration.",
    keySkills:
      "• Databassystem och integration\n• API-utveckling\n• Säkerhet och dataskydd\n• Skalbar arkitektur",
    history:
      "• Specialist på datahantering\n• GDPR-kompatibla lösningar\n• Säkra integrationslösningar",
    status: 0,
    last_modified: "2025-01-15T14:20:00Z",
  },
};

/**
 * Mock implementation for getting bid authoring data
 */
const mockGetBidAuthoringData = async (
  tenderId: string
): Promise<BidAuthoringData | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const existingData = mockBidAuthoringData[tenderId];

      if (existingData) {
        console.log(
          `🎭 Mock: Found bid authoring data for tender: ${tenderId}`
        );
        resolve(existingData);
      } else {
        console.log(
          `🎭 Mock: No data found, returning default structure for: ${tenderId}`
        );
        resolve({
          personuppgifter: DEFAULT_COMPANY_DATA,
          summary: "",
          keySkills: "• Teknisk expertis\n• Projektledning\n• Kvalitetssäkring",
          history:
            "• Tidigare projekt och erfarenheter\n• Framgångsrika leveranser\n• Nöjda kunder",
          status: 0,
        });
      }
    }, 300);
  });
};

/**
 * Real backend implementation for getting bid authoring data
 */
const realGetBidAuthoringData = async (
  tenderId: string
): Promise<BidAuthoringData | null> => {
  try {
    console.log("🔍 Fetching bid authoring data for tender:", tenderId);

    const response = await fetch(
      `${API_BASE_URL}/api/bid-authoring?tender_id=${encodeURIComponent(
        tenderId
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    console.log("📡 Response status:", response.status);
    console.log(
      "📡 Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    // Handle authentication failure
    if (response.status === 401) {
      console.error("❌ Authentication required - user not logged in");
      throw new Error("Du måste vara inloggad för att komma åt denna resurs.");
    }

    // Handle case where no bid data exists yet - return sensible defaults
    if (response.status === 404) {
      console.log(
        "ℹ️ No bid authoring data exists yet, returning default structure"
      );
      return {
        personuppgifter: DEFAULT_COMPANY_DATA,
        summary: "",
        keySkills: "• Teknisk expertis\n• Projektledning\n• Kvalitetssäkring",
        history:
          "• Tidigare projekt och erfarenheter\n• Framgångsrika leveranser\n• Nöjda kunder",
        status: 0,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ HTTP error:", response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Successfully fetched bid authoring data:", data);
    return data;
  } catch (error) {
    console.error("💥 Error fetching bid authoring data:", error);

    // Provide user-friendly error messages for network issues
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Kan inte ansluta till servern. Kontrollera att backend-servern körs på port 5000."
      );
    }

    throw error;
  }
};

/**
 * Get bid authoring data for a specific tender - uses mock or real based on USE_DUMMY flag
 * Returns default structure if no data exists yet
 */
export async function getBidAuthoringData(
  tenderId: string
): Promise<BidAuthoringData | null> {
  if (USE_DUMMY) {
    return mockGetBidAuthoringData(tenderId);
  } else {
    return realGetBidAuthoringData(tenderId);
  }
}

/**
 * Mock implementation for saving bid authoring data
 */
const mockSaveBidAuthoringData = async (
  tenderId: string,
  bidData: BidAuthoringData
): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Update the mock data with timestamp
      mockBidAuthoringData[tenderId] = {
        ...bidData,
        last_modified: new Date().toISOString(),
      };

      console.log(`🎭 Mock: Saved bid authoring data for tender: ${tenderId}`);
      resolve();
    }, 500);
  });
};

/**
 * Real backend implementation for saving bid authoring data
 */
const realSaveBidAuthoringData = async (
  tenderId: string,
  bidData: BidAuthoringData
): Promise<void> => {
  try {
    const requestData: BidAuthoringRequest = {
      tender_id: tenderId,
      bid_data: bidData,
    };

    const response = await fetch(`${API_BASE_URL}/api/bid-authoring`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("Bid authoring data saved successfully");
  } catch (error) {
    console.error("Error saving bid authoring data:", error);
    throw error;
  }
};

/**
 * Save bid authoring data for a specific tender - uses mock or real based on USE_DUMMY flag
 * Uses PUT method for create/update operations
 */
export async function saveBidAuthoringData(
  tenderId: string,
  bidData: BidAuthoringData
): Promise<void> {
  if (USE_DUMMY) {
    return mockSaveBidAuthoringData(tenderId, bidData);
  } else {
    return realSaveBidAuthoringData(tenderId, bidData);
  }
}

/**
 * Mock implementation for deleting bid authoring data
 */
const mockDeleteBidAuthoringData = async (tenderId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mockBidAuthoringData[tenderId]) {
        delete mockBidAuthoringData[tenderId];
        console.log(
          `🎭 Mock: Deleted bid authoring data for tender: ${tenderId}`
        );
        resolve();
      } else {
        console.log(`🎭 Mock: No data found to delete for tender: ${tenderId}`);
        resolve(); // Don't reject if no data exists
      }
    }, 300);
  });
};

/**
 * Real backend implementation for deleting bid authoring data
 */
const realDeleteBidAuthoringData = async (tenderId: string): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bid-authoring?tender_id=${encodeURIComponent(
        tenderId
      )}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("Bid authoring data deleted successfully");
  } catch (error) {
    console.error("Error deleting bid authoring data:", error);
    throw error;
  }
};

/**
 * Delete bid authoring data for a specific tender - uses mock or real based on USE_DUMMY flag
 */
export async function deleteBidAuthoringData(tenderId: string): Promise<void> {
  if (USE_DUMMY) {
    return mockDeleteBidAuthoringData(tenderId);
  } else {
    return realDeleteBidAuthoringData(tenderId);
  }
}

/**
 * Mock implementation for getting all bid authoring data
 */
const mockGetAllBidAuthoringData = async (): Promise<
  Record<string, BidAuthoringData>
> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(
        `🎭 Mock: Returning all bid authoring data (${
          Object.keys(mockBidAuthoringData).length
        } items)`
      );
      resolve({ ...mockBidAuthoringData });
    }, 300);
  });
};

/**
 * Real backend implementation for getting all bid authoring data
 */
const realGetAllBidAuthoringData = async (): Promise<
  Record<string, BidAuthoringData>
> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bid-authoring`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching all bid authoring data:", error);
    throw error;
  }
};

/**
 * Get all bid authoring data - uses mock or real based on USE_DUMMY flag
 */
export async function getAllBidAuthoringData(): Promise<
  Record<string, BidAuthoringData>
> {
  if (USE_DUMMY) {
    return mockGetAllBidAuthoringData();
  } else {
    return realGetAllBidAuthoringData();
  }
}
