/**
 * Bid interface representing a proposal document linked to a tender
 * A bid is created when a tender moves to BID_AUTHORING state
 */
export interface Bid {
  id: string;
  tender_name: string; // Links to the original tender's project_name
  title: string;
  description: string; // Inherited from the original tender
  state: string;
  created_date: string;
  last_modified: string;
  submitted_date?: string; // Date when bid was submitted (transitions to SUBMITTED state)
  authoring_started_date?: string; // Date when bid entered AUTHORING or REVIEWING state
  author: string;
  content?: any; // The actual bid document content
  deadline: string; // Inherited from the original tender
  branch: string; // Business sector inherited from the original tender
}

/**
 * Bid lifecycle states - represents the authoring and submission process
 */
export const BID_STATES = {
  NOT_STARTED: "not-started", // Bid document created but work not begun
  AUTHORING: "authoring", // Actively writing the bid
  REVIEWING: "reviewing", // Under internal review
  SUBMITTED: "submitted", // Submitted to client
  ONGOING_DIALOG: "ongoing-dialog", // Client communication phase
  WON_LOST: "won-lost", // Final outcome determined
} as const;

export const BID_STATE_LABELS = {
  [BID_STATES.NOT_STARTED]: "Not Started",
  [BID_STATES.AUTHORING]: "Authoring",
  [BID_STATES.REVIEWING]: "Reviewing",
  [BID_STATES.SUBMITTED]: "Submitted",
  [BID_STATES.ONGOING_DIALOG]: "Ongoing Dialog",
  [BID_STATES.WON_LOST]: "Won/Lost",
} as const;

/**
 * Interface for monthly bid submission data
 */
export interface MonthlyBidSubmission {
  month: string; // Format: "2024-01"
  monthName: string; // Format: "Jan 2024"
  count: number;
}

// Configuration - set to true to use mock data instead of backend
const USE_DUMMY = true;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Mock data store - simulated bids for development/testing
let bidsData: Bid[] = [
  {
    id: "bid_1",
    tender_name: "Projekt 22",
    title: "Projekt 22",
    description:
      "Utveckling av ny IT-plattform för hantering av användardata och integration med externa system.",
    state: BID_STATES.NOT_STARTED,
    created_date: "2024-01-15",
    last_modified: "2024-01-15",
    author: "Anna Svensson",
    deadline: "2024-03-15",
    branch: "IT & Teknik",
  },
  {
    id: "bid_2",
    tender_name: "Projekt 23",
    title: "Projekt 23",
    description:
      "Implementation av molnbaserad lösning för dataanalys och rapportering med realtidsuppkoppling.",
    state: BID_STATES.AUTHORING,
    created_date: "2024-01-10",
    last_modified: "2024-01-15",
    authoring_started_date: "2024-01-12",
    author: "Anna Svensson",
    content:
      "Vi föreslår en skalbar molnlösning baserad på Microsoft Azure som kan hantera stora datamängder i realtid. Vår lösning inkluderar avancerade analysverktyg och automatiserade rapporter som ger er organisation djupare insikter i verksamheten.",
    deadline: "2024-02-15",
    branch: "IT & Teknik",
  },
  {
    id: "bid_3",
    tender_name: "Projekt 24",
    title: "Projekt 24",
    description:
      "Byggprojekt för ny kontorsbyggnad med fokus på hållbarhet och energieffektivitet.",
    state: BID_STATES.REVIEWING,
    created_date: "2024-01-05",
    last_modified: "2024-01-12",
    authoring_started_date: "2024-01-08",
    author: "Erik Larsson",
    deadline: "2024-02-20",
    branch: "Bygg & Anläggning",
  },
  {
    id: "bid_4",
    tender_name: "Projekt 25",
    title: "Projekt 25",
    description:
      "Installation av solcellspark med kapacitet för 50 MW samt underhållsavtal på 10 år.",
    state: BID_STATES.SUBMITTED,
    created_date: "2024-01-01",
    last_modified: "2024-01-10",
    submitted_date: "2024-01-10",
    authoring_started_date: "2024-01-03",
    author: "Maria Johansson",
    deadline: "2024-02-10",
    branch: "Energi",
  },
  {
    id: "bid_5",
    tender_name: "Projekt 26",
    title: "Projekt 26",
    description:
      "Renovering av järnvägsbro inklusive förstärkning av konstruktion och uppdatering av säkerhetssystem.",
    state: BID_STATES.ONGOING_DIALOG,
    created_date: "2023-12-20",
    last_modified: "2024-01-08",
    submitted_date: "2024-01-08",
    authoring_started_date: "2023-12-25",
    author: "Erik Larsson",
    deadline: "2024-01-25",
    branch: "Bygg & Anläggning",
  },
  {
    id: "bid_6",
    tender_name: "Projekt 27",
    title: "Projekt 27",
    description:
      "Miljöprojekt för återställning av våtmarksområde samt installation av informationsskyltar.",
    state: BID_STATES.WON_LOST,
    created_date: "2023-12-15",
    last_modified: "2024-01-05",
    submitted_date: "2024-01-05",
    authoring_started_date: "2023-12-20",
    author: "Maria Johansson",
    deadline: "2024-01-20",
    branch: "Miljö & Hållbarhet",
  },
  // Add more 2024 and 2025 submitted bids for better statistics
  {
    id: "bid_7",
    tender_name: "Projekt 28",
    title: "Projekt 28",
    description: "Digital transformation av kommunal verksamhet",
    state: BID_STATES.SUBMITTED,
    created_date: "2024-03-15",
    last_modified: "2024-04-01",
    submitted_date: "2024-04-01",
    authoring_started_date: "2024-03-20",
    author: "Anna Svensson",
    deadline: "2024-04-15",
    branch: "IT & Teknik",
  },
  {
    id: "bid_8",
    tender_name: "Projekt 29",
    title: "Projekt 29",
    description: "Hållbar energilösning för industriområde",
    state: BID_STATES.WON_LOST,
    created_date: "2024-05-10",
    last_modified: "2024-06-15",
    submitted_date: "2024-06-15",
    authoring_started_date: "2024-05-15",
    author: "Maria Johansson",
    deadline: "2024-07-01",
    branch: "Energi",
  },
  {
    id: "bid_9",
    tender_name: "Projekt 30",
    title: "Projekt 30",
    description: "Modernisering av kollektivtrafik",
    state: BID_STATES.SUBMITTED,
    created_date: "2024-08-01",
    last_modified: "2024-09-10",
    submitted_date: "2024-09-10",
    authoring_started_date: "2024-08-10",
    author: "Erik Larsson",
    deadline: "2024-10-01",
    branch: "Transport",
  },
  {
    id: "bid_10",
    tender_name: "Projekt 31",
    title: "Projekt 31",
    description: "Smart city-initiativ med IoT-sensorer",
    state: BID_STATES.WON_LOST,
    created_date: "2024-10-15",
    last_modified: "2024-11-20",
    submitted_date: "2024-11-20",
    authoring_started_date: "2024-10-20",
    author: "Anna Svensson",
    deadline: "2024-12-01",
    branch: "IT & Teknik",
  },
  // 2025 bids
  {
    id: "bid_11",
    tender_name: "Projekt 32",
    title: "Projekt 32",
    description: "Cyberförsvar för kritisk infrastruktur",
    state: BID_STATES.SUBMITTED,
    created_date: "2025-01-05",
    last_modified: "2025-01-15",
    submitted_date: "2025-01-15",
    authoring_started_date: "2025-01-08",
    author: "Anna Svensson",
    deadline: "2025-02-01",
    branch: "IT & Teknik",
  },
  {
    id: "bid_12",
    tender_name: "Projekt 33",
    title: "Projekt 33",
    description: "Vätgasbaserat transportsystem",
    state: BID_STATES.ONGOING_DIALOG,
    created_date: "2025-01-10",
    last_modified: "2025-01-20",
    submitted_date: "2025-01-20",
    authoring_started_date: "2025-01-12",
    author: "Maria Johansson",
    deadline: "2025-02-15",
    branch: "Energi",
  },
  // Additional 2024 bids for better monthly distribution
  {
    id: "bid_13",
    tender_name: "Projekt 34",
    title: "Projekt 34",
    description: "Smarta trafikljus för stadskärnan",
    state: BID_STATES.WON_LOST,
    created_date: "2024-02-01",
    last_modified: "2024-02-28",
    submitted_date: "2024-02-28",
    authoring_started_date: "2024-02-05",
    author: "Erik Larsson",
    deadline: "2024-03-15",
    branch: "IT & Teknik",
  },
  {
    id: "bid_14",
    tender_name: "Projekt 35",
    title: "Projekt 35",
    description: "Solceller på kommunala byggnader",
    state: BID_STATES.SUBMITTED,
    created_date: "2024-03-10",
    last_modified: "2024-03-25",
    submitted_date: "2024-03-25",
    authoring_started_date: "2024-03-15",
    author: "Maria Johansson",
    deadline: "2024-04-10",
    branch: "Energi",
  },
  {
    id: "bid_15",
    tender_name: "Projekt 36",
    title: "Projekt 36",
    description: "Återvinningscentral med AI-sortering",
    state: BID_STATES.WON_LOST,
    created_date: "2024-04-05",
    last_modified: "2024-04-20",
    submitted_date: "2024-04-20",
    authoring_started_date: "2024-04-08",
    author: "Anna Svensson",
    deadline: "2024-05-05",
    branch: "Miljö & Hållbarhet",
  },
  {
    id: "bid_16",
    tender_name: "Projekt 37",
    title: "Projekt 37",
    description: "Fiber till alla hushåll",
    state: BID_STATES.SUBMITTED,
    created_date: "2024-07-01",
    last_modified: "2024-07-15",
    submitted_date: "2024-07-15",
    authoring_started_date: "2024-07-05",
    author: "Erik Larsson",
    deadline: "2024-08-01",
    branch: "IT & Teknik",
  },
  {
    id: "bid_17",
    tender_name: "Projekt 38",
    title: "Projekt 38",
    description: "Elcykelpool för kommunanställda",
    state: BID_STATES.ONGOING_DIALOG,
    created_date: "2024-11-01",
    last_modified: "2024-11-15",
    submitted_date: "2024-11-15",
    authoring_started_date: "2024-11-05",
    author: "Maria Johansson",
    deadline: "2024-12-01",
    branch: "Transport",
  },
  {
    id: "bid_18",
    tender_name: "Projekt 39",
    title: "Projekt 39",
    description: "Digitala skyltar i kollektivtrafik",
    state: BID_STATES.WON_LOST,
    created_date: "2024-12-01",
    last_modified: "2024-12-20",
    submitted_date: "2024-12-20",
    authoring_started_date: "2024-12-05",
    author: "Anna Svensson",
    deadline: "2025-01-15",
    branch: "IT & Teknik",
  },
];

/**
 * Mock implementation for getting bids by state
 */
const mockGetBidsByState = async (state: string): Promise<Bid[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filteredBids = bidsData.filter((bid) => bid.state === state);
      console.log(
        `🎭 Mock: Found ${filteredBids.length} bids in state: ${state}`
      );
      resolve(filteredBids);
    }, 300);
  });
};

/**
 * Real backend implementation for getting bids by state
 */
const realGetBidsByState = async (state: string): Promise<Bid[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bids/state/${state}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bids: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bids by state:", error);
    throw error;
  }
};

/**
 * Get bids filtered by state - uses mock or real based on USE_DUMMY flag
 */
export const getBidsByState = async (state: string): Promise<Bid[]> => {
  if (USE_DUMMY) {
    return mockGetBidsByState(state);
  } else {
    return realGetBidsByState(state);
  }
};

/**
 * Mock implementation for creating a new bid
 */
const mockCreateBid = async (
  tenderName: string,
  description: string,
  deadline: string,
  branch: string
): Promise<Bid> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newBid: Bid = {
        id: `bid_${Date.now()}`,
        tender_name: tenderName,
        title: `${tenderName}`,
        description,
        state: BID_STATES.NOT_STARTED,
        created_date: new Date().toISOString().split("T")[0],
        last_modified: new Date().toISOString().split("T")[0],
        author: "Du", // TODO: Get from auth context
        deadline,
        branch,
      };

      bidsData.push(newBid);
      console.log(`🎭 Mock: Created new bid for tender: ${tenderName}`);
      resolve(newBid);
    }, 500);
  });
};

/**
 * Real backend implementation for creating a new bid
 */
const realCreateBid = async (
  tenderName: string,
  description: string,
  deadline: string,
  branch: string
): Promise<Bid> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        tender_name: tenderName,
        description,
        deadline,
        branch,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create bid: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating bid:", error);
    throw error;
  }
};

/**
 * Creates a new bid document linked to a tender - uses mock or real based on USE_DUMMY flag
 * Called when a tender transitions to BID_AUTHORING state
 */
export const createBid = async (
  tenderName: string,
  description: string,
  deadline: string,
  branch: string
): Promise<Bid> => {
  if (USE_DUMMY) {
    return mockCreateBid(tenderName, description, deadline, branch);
  } else {
    return realCreateBid(tenderName, description, deadline, branch);
  }
};

/**
 * Mock implementation for updating bid state
 */
const mockUpdateBidState = async (
  bidId: string,
  newState: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const bidIndex = bidsData.findIndex((bid) => bid.id === bidId);
      if (bidIndex === -1) {
        reject(new Error("Bid not found"));
        return;
      }

      bidsData[bidIndex].state = newState;
      bidsData[bidIndex].last_modified = new Date().toISOString().split("T")[0];

      // Set authoring_started_date when transitioning to AUTHORING or REVIEWING state
      if (
        (newState === BID_STATES.AUTHORING ||
          newState === BID_STATES.REVIEWING) &&
        !bidsData[bidIndex].authoring_started_date
      ) {
        bidsData[bidIndex].authoring_started_date = new Date()
          .toISOString()
          .split("T")[0];
      }

      // Set submitted_date when transitioning to SUBMITTED state
      if (
        newState === BID_STATES.SUBMITTED &&
        !bidsData[bidIndex].submitted_date
      ) {
        bidsData[bidIndex].submitted_date = new Date()
          .toISOString()
          .split("T")[0];
      }

      console.log(`🎭 Mock: Updated bid ${bidId} to state: ${newState}`);
      resolve();
    }, 300);
  });
};

/**
 * Real backend implementation for updating bid state
 */
const realUpdateBidState = async (
  bidId: string,
  newState: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bids/${bidId}/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ state: newState }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update bid state: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error updating bid state:", error);
    throw error;
  }
};

/**
 * Transitions a bid to a new state - uses mock or real based on USE_DUMMY flag
 */
export const updateBidState = async (
  bidId: string,
  newState: string
): Promise<void> => {
  if (USE_DUMMY) {
    return mockUpdateBidState(bidId, newState);
  } else {
    return realUpdateBidState(bidId, newState);
  }
};

/**
 * Mock implementation for getting bid by ID
 */
const mockGetBidById = async (bidId: string): Promise<Bid | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bid = bidsData.find((bid) => bid.id === bidId);
      console.log(
        `🎭 Mock: ${bid ? "Found" : "Did not find"} bid with ID: ${bidId}`
      );
      resolve(bid || null);
    }, 200);
  });
};

/**
 * Real backend implementation for getting bid by ID
 */
const realGetBidById = async (bidId: string): Promise<Bid | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bids/${bidId}`, {
      method: "GET",
      credentials: "include",
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch bid: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bid by ID:", error);
    throw error;
  }
};

/**
 * Get bid by ID - uses mock or real based on USE_DUMMY flag
 */
export const getBidById = async (bidId: string): Promise<Bid | null> => {
  if (USE_DUMMY) {
    return mockGetBidById(bidId);
  } else {
    return realGetBidById(bidId);
  }
};

/**
 * Mock implementation for getting bid by tender name
 */
const mockGetBidByTenderName = async (
  tenderName: string
): Promise<Bid | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bid = bidsData.find((bid) => bid.tender_name === tenderName);
      console.log(
        `🎭 Mock: ${
          bid ? "Found" : "Did not find"
        } bid for tender: ${tenderName}`
      );
      resolve(bid || null);
    }, 200);
  });
};

/**
 * Real backend implementation for getting bid by tender name
 */
const realGetBidByTenderName = async (
  tenderName: string
): Promise<Bid | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bids/tender/${encodeURIComponent(tenderName)}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch bid by tender name: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bid by tender name:", error);
    throw error;
  }
};

/**
 * Get bid by tender name - uses mock or real based on USE_DUMMY flag
 */
export const getBidByTenderName = async (
  tenderName: string
): Promise<Bid | null> => {
  if (USE_DUMMY) {
    return mockGetBidByTenderName(tenderName);
  } else {
    return realGetBidByTenderName(tenderName);
  }
};

/**
 * Mock implementation for updating bid content
 */
const mockUpdateBidContent = async (
  bidId: string,
  content: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const bidIndex = bidsData.findIndex((bid) => bid.id === bidId);
      if (bidIndex === -1) {
        reject(new Error("Bid not found"));
        return;
      }

      bidsData[bidIndex].content = content;
      bidsData[bidIndex].last_modified = new Date().toISOString().split("T")[0];
      console.log(`🎭 Mock: Updated content for bid: ${bidId}`);
      resolve();
    }, 300);
  });
};

/**
 * Real backend implementation for updating bid content
 */
const realUpdateBidContent = async (
  bidId: string,
  content: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bids/${bidId}/content`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update bid content: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error updating bid content:", error);
    throw error;
  }
};

/**
 * Update bid content - uses mock or real based on USE_DUMMY flag
 */
export const updateBidContent = async (
  bidId: string,
  content: string
): Promise<void> => {
  if (USE_DUMMY) {
    return mockUpdateBidContent(bidId, content);
  } else {
    return realUpdateBidContent(bidId, content);
  }
};

/**
 * Mock implementation for deleting bid
 */
const mockDeleteBid = async (bidId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const bidExists = bidsData.some((bid) => bid.id === bidId);
      if (!bidExists) {
        reject(new Error("Bid not found"));
        return;
      }

      bidsData = bidsData.filter((bid) => bid.id !== bidId);
      console.log(`🎭 Mock: Deleted bid: ${bidId}`);
      resolve();
    }, 300);
  });
};

/**
 * Real backend implementation for deleting bid
 */
const realDeleteBid = async (bidId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bids/${bidId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete bid: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error deleting bid:", error);
    throw error;
  }
};

/**
 * Delete bid - uses mock or real based on USE_DUMMY flag
 */
export const deleteBid = async (bidId: string): Promise<void> => {
  if (USE_DUMMY) {
    return mockDeleteBid(bidId);
  } else {
    return realDeleteBid(bidId);
  }
};

/**
 * Mock implementation for getting submitted bids by year
 */
const mockGetSubmittedBidsByYear = async (year: number): Promise<Bid[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const submittedBids = bidsData.filter(
        (bid) =>
          (bid.state === BID_STATES.SUBMITTED ||
            bid.state === BID_STATES.ONGOING_DIALOG ||
            bid.state === BID_STATES.WON_LOST) &&
          bid.submitted_date &&
          new Date(bid.submitted_date).getFullYear() === year
      );
      console.log(
        `🎭 Mock: Found ${submittedBids.length} submitted bids for year: ${year}`
      );
      resolve(submittedBids);
    }, 300);
  });
};

/**
 * Real backend implementation for getting submitted bids by year
 */
const realGetSubmittedBidsByYear = async (year: number): Promise<Bid[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bids/submitted/${year}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch submitted bids: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching submitted bids by year:", error);
    throw error;
  }
};

/**
 * Get submitted bids filtered by year - uses mock or real based on USE_DUMMY flag
 */
export const getSubmittedBidsByYear = async (year: number): Promise<Bid[]> => {
  if (USE_DUMMY) {
    return mockGetSubmittedBidsByYear(year);
  } else {
    return realGetSubmittedBidsByYear(year);
  }
};

/**
 * Mock implementation for calculating average authoring time
 */
const mockGetAverageAuthoringTime = async (): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const submittedBids = bidsData.filter(
        (bid) =>
          (bid.state === BID_STATES.SUBMITTED ||
            bid.state === BID_STATES.ONGOING_DIALOG ||
            bid.state === BID_STATES.WON_LOST) &&
          bid.authoring_started_date &&
          bid.submitted_date
      );

      if (submittedBids.length === 0) {
        console.log(`🎭 Mock: No submitted bids with authoring dates found`);
        resolve(0);
        return;
      }

      const totalDays = submittedBids.reduce((sum, bid) => {
        const startDate = new Date(bid.authoring_started_date!);
        const endDate = new Date(bid.submitted_date!);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0);

      const averageDays = totalDays / submittedBids.length;

      console.log(
        `🎭 Mock: Calculated average authoring time: ${averageDays.toFixed(
          1
        )} days from ${submittedBids.length} bids`
      );
      resolve(averageDays);
    }, 300);
  });
};

/**
 * Real backend implementation for calculating average authoring time
 */
const realGetAverageAuthoringTime = async (): Promise<number> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bids/average-authoring-time`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch average authoring time: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.averageDays || 0;
  } catch (error) {
    console.error("Error fetching average authoring time:", error);
    throw error;
  }
};

/**
 * Get average authoring time in days - uses mock or real based on USE_DUMMY flag
 */
export const getAverageAuthoringTime = async (): Promise<number> => {
  if (USE_DUMMY) {
    return mockGetAverageAuthoringTime();
  } else {
    return realGetAverageAuthoringTime();
  }
};

/**
 * Mock implementation for getting monthly bid submissions for the last 12 months
 */
const mockGetMonthlyBidSubmissions = async (): Promise<
  MonthlyBidSubmission[]
> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const monthlyData: MonthlyBidSubmission[] = [];

      // Generate data for the last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        // Count submitted bids for this month
        const submittedBidsInMonth = bidsData.filter(
          (bid) =>
            (bid.state === BID_STATES.SUBMITTED ||
              bid.state === BID_STATES.ONGOING_DIALOG ||
              bid.state === BID_STATES.WON_LOST) &&
            bid.submitted_date &&
            bid.submitted_date.startsWith(monthKey)
        ).length;

        monthlyData.push({
          month: monthKey,
          monthName,
          count: submittedBidsInMonth,
        });
      }

      console.log(
        `🎭 Mock: Generated monthly bid submission data for last 12 months`
      );
      resolve(monthlyData);
    }, 300);
  });
};

/**
 * Real backend implementation for getting monthly bid submissions
 */
const realGetMonthlyBidSubmissions = async (): Promise<
  MonthlyBidSubmission[]
> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bids/monthly-submissions`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch monthly bid submissions: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching monthly bid submissions:", error);
    throw error;
  }
};

/**
 * Get monthly bid submission data for the last 12 months - uses mock or real based on USE_DUMMY flag
 */
export const getMonthlyBidSubmissions = async (): Promise<
  MonthlyBidSubmission[]
> => {
  if (USE_DUMMY) {
    return mockGetMonthlyBidSubmissions();
  } else {
    return realGetMonthlyBidSubmissions();
  }
};
