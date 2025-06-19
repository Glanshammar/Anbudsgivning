export interface BidAuthoringData {
  personuppgifter: {
    companyName: string;
    orgNumber: string;
    address: string;
    contactPerson: string;
    email: string;
    phone: string;
  };
  summary: string;
  keySkills: string;
  history: string;
  status: number;
  last_modified?: string;
}

export interface BidAuthoringRequest {
  tender_id: string;
  bid_data: BidAuthoringData;
}

const API_BASE_URL = "http://localhost:5000";

// Default company data (can be fetched from company profile later)
const DEFAULT_COMPANY_DATA = {
  companyName: "Mitt Företag AB",
  orgNumber: "556123-4567",
  address: "Huvudgatan 1, 123 45 Stockholm",
  contactPerson: "Anna Andersson",
  email: "anna@mittforetag.se",
  phone: "08-123 456 78",
};

/**
 * Get bid authoring data for a specific tender
 */
export async function getBidAuthoringData(
  tenderId: string
): Promise<BidAuthoringData | null> {
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

    if (response.status === 401) {
      console.error("❌ Authentication required - user not logged in");
      throw new Error("Du måste vara inloggad för att komma åt denna resurs.");
    }

    if (response.status === 404) {
      console.log(
        "ℹ️ No bid authoring data exists yet, returning default structure"
      );
      // No bid authoring data exists yet, return default structure
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

    // If it's a network error, provide more specific error message
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
}

/**
 * Save bid authoring data for a specific tender
 */
export async function saveBidAuthoringData(
  tenderId: string,
  bidData: BidAuthoringData
): Promise<void> {
  try {
    const requestData: BidAuthoringRequest = {
      tender_id: tenderId,
      bid_data: bidData,
    };

    const response = await fetch(`${API_BASE_URL}/api/bid-authoring`, {
      method: "PUT", // Use PUT for create/update
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
}

/**
 * Delete bid authoring data for a specific tender
 */
export async function deleteBidAuthoringData(tenderId: string): Promise<void> {
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
}

/**
 * Get all bid authoring data
 */
export async function getAllBidAuthoringData(): Promise<
  Record<string, BidAuthoringData>
> {
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
}
