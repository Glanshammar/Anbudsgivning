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
  DISCARDED: "discarded", // Project was discarded/cancelled
} as const;

export const BID_STATE_LABELS = {
  [BID_STATES.NOT_STARTED]: "Not Started",
  [BID_STATES.AUTHORING]: "Authoring",
  [BID_STATES.REVIEWING]: "Reviewing",
  [BID_STATES.SUBMITTED]: "Submitted",
  [BID_STATES.ONGOING_DIALOG]: "Ongoing Dialog",
  [BID_STATES.WON_LOST]: "Won/Lost",
  [BID_STATES.DISCARDED]: "Discarded",
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
    created_date: "2025-01-15",
    last_modified: "2025-01-15",
    author: "Anna Svensson",
    deadline: "2025-03-15",
    branch: "IT & Teknik",
  },
  {
    id: "bid_2",
    tender_name: "Projekt 23",
    title: "Projekt 23",
    description:
      "Implementation av molnbaserad lösning för dataanalys och rapportering med realtidsuppkoppling.",
    state: BID_STATES.AUTHORING,
    created_date: "2025-01-10",
    last_modified: "2025-01-15",
    authoring_started_date: "2025-01-12",
    author: "Anna Svensson",
    content:
      "Vi föreslår en skalbar molnlösning baserad på Microsoft Azure som kan hantera stora datamängder i realtid. Vår lösning inkluderar avancerade analysverktyg och automatiserade rapporter som ger er organisation djupare insikter i verksamheten.",
    deadline: "2025-02-15",
    branch: "IT & Teknik",
  },
  {
    id: "bid_3",
    tender_name: "Projekt 24",
    title: "Projekt 24",
    description:
      "Byggprojekt för ny kontorsbyggnad med fokus på hållbarhet och energieffektivitet.",
    state: BID_STATES.REVIEWING,
    created_date: "2025-01-05",
    last_modified: "2025-01-12",
    authoring_started_date: "2025-01-08",
    author: "Erik Larsson",
    deadline: "2025-02-20",
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
  // Additional 2025 bids for better statistics
  {
    id: "bid_19",
    tender_name: "Projekt 40",
    title: "Projekt 40",
    description: "AI-baserad trafikoptimering",
    state: BID_STATES.WON_LOST,
    created_date: "2025-01-15",
    last_modified: "2025-01-25",
    submitted_date: "2025-01-25",
    authoring_started_date: "2025-01-18",
    author: "Anna Svensson",
    deadline: "2025-02-10",
    branch: "IT & Teknik",
  },
  {
    id: "bid_20",
    tender_name: "Projekt 41",
    title: "Projekt 41",
    description: "Grön energipark med vindkraft",
    state: BID_STATES.WON_LOST,
    created_date: "2025-01-20",
    last_modified: "2025-01-30",
    submitted_date: "2025-01-30",
    authoring_started_date: "2025-01-22",
    author: "Maria Johansson",
    deadline: "2025-02-20",
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
  // Discarded projects for testing KPI statistics
  {
    id: "bid_19",
    tender_name: "Projekt 40",
    title: "Projekt 40",
    description: "Utbyggnad av fiber i glesbygd",
    state: BID_STATES.DISCARDED,
    created_date: "2024-01-20",
    last_modified: "2024-01-22",
    author: "Erik Larsson",
    deadline: "2024-03-01",
    branch: "IT & Teknik",
  },
  {
    id: "bid_20",
    tender_name: "Projekt 41",
    title: "Projekt 41",
    description: "Renovering av kommunhus",
    state: BID_STATES.DISCARDED,
    created_date: "2024-02-15",
    last_modified: "2024-02-18",
    authoring_started_date: "2024-02-16",
    author: "Maria Johansson",
    deadline: "2024-04-10",
    branch: "Bygg & Anläggning",
  },
  {
    id: "bid_21",
    tender_name: "Projekt 42",
    title: "Projekt 42",
    description: "Smart city sensorer",
    state: BID_STATES.DISCARDED,
    created_date: "2024-03-10",
    last_modified: "2024-03-15",
    authoring_started_date: "2024-03-12",
    author: "Anna Svensson",
    deadline: "2024-05-20",
    branch: "IT & Teknik",
  },
  {
    id: "bid_22",
    tender_name: "Projekt 43",
    title: "Projekt 43",
    description: "Digitalisering av arkiv",
    state: BID_STATES.DISCARDED,
    created_date: "2024-06-05",
    last_modified: "2024-06-08",
    author: "Erik Larsson",
    deadline: "2024-08-15",
    branch: "IT & Teknik",
  },
  {
    id: "bid_23",
    tender_name: "Projekt 44",
    title: "Projekt 44",
    description: "Miljörapportering system",
    state: BID_STATES.DISCARDED,
    created_date: "2024-11-10",
    last_modified: "2024-11-12",
    authoring_started_date: "2024-11-11",
    author: "Maria Johansson",
    deadline: "2025-01-30",
    branch: "Miljö & Hållbarhet",
  },
  // 2025 discarded projects - created earlier but discarded in 2025
  {
    id: "bid_24",
    tender_name: "Projekt 45",
    title: "Projekt 45",
    description: "Blockchain för offentlig sektor",
    state: BID_STATES.DISCARDED,
    created_date: "2024-11-15",
    last_modified: "2025-01-10", // Discarded in January 2025
    author: "Anna Svensson",
    deadline: "2025-03-15",
    branch: "IT & Teknik",
  },
  {
    id: "bid_25",
    tender_name: "Projekt 46",
    title: "Projekt 46",
    description: "Automatiserad parkeringsövervakning",
    state: BID_STATES.DISCARDED,
    created_date: "2024-12-05",
    last_modified: "2025-02-14", // Discarded in February 2025
    author: "Erik Larsson",
    deadline: "2025-04-20",
    branch: "Transport",
  },
  {
    id: "bid_26",
    tender_name: "Projekt 47",
    title: "Projekt 47",
    description: "Digitala vårdtjänster",
    state: BID_STATES.DISCARDED,
    created_date: "2024-12-20",
    last_modified: "2025-03-07", // Discarded in March 2025
    authoring_started_date: "2025-01-15",
    author: "Maria Johansson",
    deadline: "2025-05-10",
    branch: "Hälsa & Vård",
  },
  {
    id: "bid_27",
    tender_name: "Projekt 48",
    title: "Projekt 48",
    description: "Drönare för miljöövervakning",
    state: BID_STATES.DISCARDED,
    created_date: "2024-11-30",
    last_modified: "2025-04-20", // Discarded in April 2025
    authoring_started_date: "2025-02-10",
    author: "Anna Svensson",
    deadline: "2025-06-25",
    branch: "Miljö & Hållbarhet",
  },
  {
    id: "bid_28",
    tender_name: "Projekt 49",
    title: "Projekt 49",
    description: "Virtuell realitet för utbildning",
    state: BID_STATES.DISCARDED,
    created_date: "2024-10-15",
    last_modified: "2025-05-24", // Discarded in May 2025
    authoring_started_date: "2025-03-01",
    author: "Erik Larsson",
    deadline: "2025-07-30",
    branch: "Utbildning",
  },
  {
    id: "bid_29",
    tender_name: "Projekt 50",
    title: "Projekt 50",
    description: "Quantum computing pilot",
    state: BID_STATES.DISCARDED,
    created_date: "2024-09-20",
    last_modified: "2025-06-17", // Discarded in June 2025
    authoring_started_date: "2025-04-05",
    author: "Maria Johansson",
    deadline: "2025-08-20",
    branch: "IT & Teknik",
  },
  {
    id: "bid_30",
    tender_name: "Projekt 51",
    title: "Projekt 51",
    description: "Biometrisk identifiering",
    state: BID_STATES.DISCARDED,
    created_date: "2024-08-10",
    last_modified: "2025-07-12", // Discarded in July 2025
    authoring_started_date: "2025-05-15",
    author: "Anna Svensson",
    deadline: "2025-09-15",
    branch: "Säkerhet",
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
 * Discard bid by setting state to DISCARDED instead of deleting it
 * This allows tracking of discarded projects for statistics
 */
export const discardBid = async (bidId: string): Promise<void> => {
  return updateBidState(bidId, BID_STATES.DISCARDED);
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
 * Mock implementation for getting average authoring time by year
 */
const mockGetAverageAuthoringTimeByYear = async (
  year: number
): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const submittedBids = bidsData.filter(
        (bid) =>
          (bid.state === BID_STATES.SUBMITTED ||
            bid.state === BID_STATES.ONGOING_DIALOG ||
            bid.state === BID_STATES.WON_LOST) &&
          bid.submitted_date &&
          new Date(bid.submitted_date).getFullYear() === year &&
          bid.authoring_started_date
      );

      if (submittedBids.length === 0) {
        console.log(
          `🎭 Mock: No submitted bids with authoring dates found for year ${year}, using realistic mock value`
        );
        // Use predefined values for years without data based on historical trends
        const yearValues: { [key: number]: number } = {
          2021: 9.2,
          2022: 8.5,
          2023: 7.8,
          2024: 7.5,
          2025: 7.5,
        };

        const mockAuthoringTime = yearValues[year] || 7.5;
        resolve(mockAuthoringTime);
        return;
      }

      const totalDays = submittedBids.reduce((sum, bid) => {
        const startDate = new Date(bid.authoring_started_date!);
        const endDate = new Date(bid.submitted_date!);

        // Debug: Log the dates being processed
        console.log(`🔍 Processing bid ${bid.tender_name}:`);
        console.log(`  Start: ${bid.authoring_started_date} -> ${startDate}`);
        console.log(`  End: ${bid.submitted_date} -> ${endDate}`);

        // Check for invalid dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn(
            `🎭 Mock: Invalid dates for ${bid.tender_name}, using default 7 days`
          );
          return sum + 7;
        }

        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log(`  Diff: ${diffDays} days`);

        // Sanity check: if calculation gives unreasonable results, use reasonable defaults
        if (diffDays > 365 || diffDays < 0 || isNaN(diffDays)) {
          console.warn(
            `🎭 Mock: Unreasonable authoring time calculated for ${bid.tender_name}: ${diffDays} days, using default 7 days`
          );
          return sum + 7; // Default to 7 days for unreasonable values
        }

        return sum + diffDays;
      }, 0);

      const averageDays = totalDays / submittedBids.length;

      console.log(
        `🔍 Mock: Calculated average: ${averageDays} days from ${totalDays} total days and ${submittedBids.length} bids`
      );

      // Final sanity check on the average
      const finalAverageDays = Math.max(1, Math.min(90, averageDays)); // Between 1 and 90 days

      // Emergency brake: If we still have an unreasonable value, force it to 7 days
      if (
        finalAverageDays > 365 ||
        finalAverageDays < 0 ||
        isNaN(finalAverageDays)
      ) {
        console.error(
          `🚨 Mock: EMERGENCY BRAKE - Forcing unreasonable average ${finalAverageDays} to 7 days for year ${year}`
        );
        resolve(7);
        return;
      }

      console.log(
        `🎭 Mock: Average authoring time for ${year}: ${finalAverageDays.toFixed(
          1
        )} days`
      );
      resolve(finalAverageDays);
    }, 300);
  });
};

/**
 * Real backend implementation for getting average authoring time by year
 */
const realGetAverageAuthoringTimeByYear = async (
  year: number
): Promise<number> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bids/average-authoring-time/${year}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch average authoring time for year: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.averageDays || 0;
  } catch (error) {
    console.error("Error fetching average authoring time by year:", error);
    throw error;
  }
};

/**
 * Get average authoring time by year - uses mock or real based on USE_DUMMY flag
 */
export const getAverageAuthoringTimeByYear = async (
  year: number
): Promise<number> => {
  if (USE_DUMMY) {
    return mockGetAverageAuthoringTimeByYear(year);
  } else {
    return realGetAverageAuthoringTimeByYear(year);
  }
};

/**
 * Mock implementation for getting hit rate by year
 */
const mockGetHitRateByYear = async (year: number): Promise<number> => {
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

      const wonBids = submittedBids.filter(
        (bid) => bid.state === BID_STATES.WON_LOST
      );

      if (submittedBids.length === 0) {
        // Use predefined values for years without data based on historical trends
        const yearValues: { [key: number]: number } = {
          2021: 42.5,
          2022: 45.0,
          2023: 47.5,
          2024: 50.0,
          2025: 50.0,
        };

        const mockHitRate = yearValues[year] || 50.0;
        console.log(
          `🎭 Mock: Hit rate for ${year}: ${mockHitRate.toFixed(
            1
          )}% (predefined value)`
        );
        resolve(mockHitRate);
        return;
      }

      const hitRate = (wonBids.length / submittedBids.length) * 100;
      console.log(`🎭 Mock: Hit rate for ${year}: ${hitRate.toFixed(1)}%`);
      resolve(hitRate);
    }, 300);
  });
};

/**
 * Real backend implementation for getting hit rate by year
 */
const realGetHitRateByYear = async (year: number): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bids/hit-rate/${year}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch hit rate for year: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.hitRate || 0;
  } catch (error) {
    console.error("Error fetching hit rate by year:", error);
    throw error;
  }
};

/**
 * Get hit rate by year - uses mock or real based on USE_DUMMY flag
 */
export const getHitRateByYear = async (year: number): Promise<number> => {
  if (USE_DUMMY) {
    return mockGetHitRateByYear(year);
  } else {
    return realGetHitRateByYear(year);
  }
};

/**
 * Mock implementation for getting qualifying tenders by year
 */
const mockGetQualifyingTendersByYear = async (
  year: number
): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Get all bids created in the specified year
      const yearBids = bidsData.filter(
        (bid) => new Date(bid.created_date).getFullYear() === year
      );

      if (yearBids.length === 0) {
        // Use predefined values for years without data based on historical trends
        const yearValues: { [key: number]: number } = {
          2021: 12.5,
          2022: 14.0,
          2023: 15.5,
          2024: 16.0,
          2025: 16.0,
        };

        const mockQualifyingRate = yearValues[year] || 16.0;
        console.log(
          `🎭 Mock: Qualifying tenders for ${year}: ${mockQualifyingRate.toFixed(
            1
          )}% (predefined value)`
        );
        resolve(mockQualifyingRate);
        return;
      }

      // For this mock, we'll assume a ratio based on current data
      // In real implementation, this would compare against tenders from that year
      const totalTenders = 25; // Mock value for year

      const qualifyingRate = (yearBids.length / totalTenders) * 100;
      console.log(
        `🎭 Mock: Qualifying tenders for ${year}: ${qualifyingRate.toFixed(1)}%`
      );
      resolve(qualifyingRate);
    }, 300);
  });
};

/**
 * Real backend implementation for getting qualifying tenders by year
 */
const realGetQualifyingTendersByYear = async (
  year: number
): Promise<number> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bids/qualifying-tenders/${year}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch qualifying tenders for year: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.qualifyingRate || 0;
  } catch (error) {
    console.error("Error fetching qualifying tenders by year:", error);
    throw error;
  }
};

/**
 * Get qualifying tenders by year - uses mock or real based on USE_DUMMY flag
 */
export const getQualifyingTendersByYear = async (
  year: number
): Promise<number> => {
  if (USE_DUMMY) {
    return mockGetQualifyingTendersByYear(year);
  } else {
    return realGetQualifyingTendersByYear(year);
  }
};

/**
 * Mock implementation for getting monthly bid submissions for the last 13 months
 */
const mockGetMonthlyBidSubmissions = async (): Promise<
  MonthlyBidSubmission[]
> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const monthlyData: MonthlyBidSubmission[] = [];

      // Generate data for the last 13 months (includes same month from previous year)
      for (let i = 12; i >= 0; i--) {
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
        `🎭 Mock: Generated monthly bid submission data for last 13 months`
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
 * Get monthly bid submission data for the last 13 months - uses mock or real based on USE_DUMMY flag
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

/**
 * Mock implementation for getting bid completion rate by year
 */
const mockGetBidCompletionRateByYear = async (
  year: number
): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Get all bids created in the specified year
      const yearBids = bidsData.filter(
        (bid) => new Date(bid.created_date).getFullYear() === year
      );

      if (yearBids.length === 0) {
        // Use predefined values for years without data based on historical trends
        const yearValues: { [key: number]: number } = {
          2021: 85.0,
          2022: 90.0,
          2023: 95.0,
          2024: 100.0,
          2025: 100.0,
        };

        const mockCompletionRate = yearValues[year] || 100.0;
        console.log(
          `🎭 Mock: Completion rate for ${year}: ${mockCompletionRate.toFixed(
            1
          )}% (predefined value)`
        );
        resolve(mockCompletionRate);
        return;
      }

      // Calculate completion rate based on bid states
      // Completed bids are only those that have reached the final WON_LOST state
      const completedBids = yearBids.filter(
        (bid) => bid.state === BID_STATES.WON_LOST
      );

      const completionRate = (completedBids.length / yearBids.length) * 100;
      console.log(
        `🎭 Mock: Completion rate for ${year}: ${completionRate.toFixed(1)}% (${
          completedBids.length
        }/${yearBids.length} bids)`
      );
      resolve(Math.round(completionRate * 10) / 10);
    }, 300);
  });
};

/**
 * Real backend implementation for getting bid completion rate by year
 */
const realGetBidCompletionRateByYear = async (
  year: number
): Promise<number> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bids/completion-rate/${year}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch completion rate for year: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.completionRate || 0;
  } catch (error) {
    console.error("Error fetching completion rate by year:", error);
    throw error;
  }
};

/**
 * Get bid completion rate by year - uses mock or real based on USE_DUMMY flag
 */
export const getBidCompletionRateByYear = async (
  year: number
): Promise<number> => {
  if (USE_DUMMY) {
    return mockGetBidCompletionRateByYear(year);
  } else {
    return realGetBidCompletionRateByYear(year);
  }
};

/**
 * Mock implementation for getting hit rate by month for the last 13 months
 */
const mockGetHitRateByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const monthlyData: { monthName: string; value: number }[] = [];

      // Generate data for the last 13 months (includes same month from previous year)
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        // Count submitted and won bids for this month
        const submittedBidsInMonth = bidsData.filter(
          (bid) =>
            (bid.state === BID_STATES.SUBMITTED ||
              bid.state === BID_STATES.ONGOING_DIALOG ||
              bid.state === BID_STATES.WON_LOST) &&
            bid.submitted_date &&
            bid.submitted_date.startsWith(monthKey)
        );

        const wonBidsInMonth = submittedBidsInMonth.filter(
          (bid) => bid.state === BID_STATES.WON_LOST
        );

        // Calculate hit rate or generate mock data
        let hitRate = 0;
        if (submittedBidsInMonth.length > 0) {
          hitRate = (wonBidsInMonth.length / submittedBidsInMonth.length) * 100;
        } else {
          // Use predefined hit rate for months without data
          hitRate = 45.0; // Stable hit rate for months without data
        }

        monthlyData.push({
          monthName,
          value: Math.round(hitRate * 10) / 10,
        });
      }

      console.log(
        `🎭 Mock: Generated monthly hit rate data for last 13 months`
      );
      resolve(monthlyData);
    }, 300);
  });
};

/**
 * Get hit rate by month for the last 13 months - uses mock or real based on USE_DUMMY flag
 */
export const getHitRateByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  if (USE_DUMMY) {
    return mockGetHitRateByMonth();
  } else {
    // Real implementation would fetch from backend
    return mockGetHitRateByMonth();
  }
};

/**
 * Mock implementation for getting qualifying tenders by month for the last 13 months
 */
const mockGetQualifyingTendersByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const monthlyData: { monthName: string; value: number }[] = [];

      // Generate data for the last 13 months (includes same month from previous year)
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        // Count bids created in this month
        const bidsInMonth = bidsData.filter(
          (bid) => bid.created_date && bid.created_date.startsWith(monthKey)
        );

        // Calculate qualifying rate or generate mock data
        let qualifyingRate = 0;
        if (bidsInMonth.length > 0) {
          const totalTenders = 25; // Mock value for tenders per month
          qualifyingRate = (bidsInMonth.length / totalTenders) * 100;
        } else {
          // Use predefined qualifying rate for months without data
          qualifyingRate = 16.0; // Stable qualifying rate for months without data
        }

        monthlyData.push({
          monthName,
          value: Math.round(qualifyingRate * 10) / 10,
        });
      }

      console.log(
        `🎭 Mock: Generated monthly qualifying tenders data for last 13 months`
      );
      resolve(monthlyData);
    }, 300);
  });
};

/**
 * Get qualifying tenders by month for the last 13 months - uses mock or real based on USE_DUMMY flag
 */
export const getQualifyingTendersByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  if (USE_DUMMY) {
    return mockGetQualifyingTendersByMonth();
  } else {
    // Real implementation would fetch from backend
    return mockGetQualifyingTendersByMonth();
  }
};

/**
 * Mock implementation for getting average authoring time by month for the last 13 months
 */
const mockGetAverageAuthoringTimeByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const monthlyData: { monthName: string; value: number }[] = [];

      // Generate data for the last 13 months (includes same month from previous year)
      for (let i = 12; i >= 0; i--) {
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
            bid.submitted_date.startsWith(monthKey) &&
            bid.authoring_started_date
        );

        // Calculate average authoring time or generate mock data
        let averageTime = 0;
        if (submittedBidsInMonth.length > 0) {
          const totalDays = submittedBidsInMonth.reduce((sum, bid) => {
            const startDate = new Date(bid.authoring_started_date!);
            const endDate = new Date(bid.submitted_date!);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return sum + 7; // Default to 7 days for invalid dates
            }

            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Sanity check
            if (diffDays > 90 || diffDays < 0 || isNaN(diffDays)) {
              return sum + 7; // Default to 7 days for unreasonable values
            }

            return sum + diffDays;
          }, 0);

          averageTime = totalDays / submittedBidsInMonth.length;
        } else {
          // Use predefined authoring time for months without data
          averageTime = 7.5; // Stable authoring time for months without data
        }

        monthlyData.push({
          monthName,
          value: Math.round(averageTime * 10) / 10,
        });
      }

      console.log(
        `🎭 Mock: Generated monthly average authoring time data for last 13 months`
      );
      resolve(monthlyData);
    }, 300);
  });
};

/**
 * Get average authoring time by month for the last 13 months - uses mock or real based on USE_DUMMY flag
 */
export const getAverageAuthoringTimeByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  if (USE_DUMMY) {
    return mockGetAverageAuthoringTimeByMonth();
  } else {
    // Real implementation would fetch from backend
    return mockGetAverageAuthoringTimeByMonth();
  }
};

/**
 * Mock implementation for getting bid completion rate by month for the last 13 months
 */
const mockGetBidCompletionRateByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const monthlyData: { monthName: string; value: number }[] = [];

      // Generate data for the last 13 months (includes same month from previous year)
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        // Count bids created in this month
        const bidsInMonth = bidsData.filter(
          (bid) => bid.created_date && bid.created_date.startsWith(monthKey)
        );

        // Calculate completion rate or generate mock data
        let completionRate = 0;
        if (bidsInMonth.length > 0) {
          const completedBids = bidsInMonth.filter(
            (bid) => bid.state === BID_STATES.WON_LOST
          );

          completionRate = (completedBids.length / bidsInMonth.length) * 100;
        } else {
          // Use predefined completion rate for months without data
          completionRate = 78.0; // Stable completion rate for months without data
        }

        monthlyData.push({
          monthName,
          value: Math.round(completionRate * 10) / 10,
        });
      }

      console.log(
        `🎭 Mock: Generated monthly completion rate data for last 13 months`
      );
      resolve(monthlyData);
    }, 300);
  });
};

/**
 * Get bid completion rate by month for the last 13 months - uses mock or real based on USE_DUMMY flag
 */
export const getBidCompletionRateByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  if (USE_DUMMY) {
    return mockGetBidCompletionRateByMonth();
  } else {
    // Real implementation would fetch from backend
    return mockGetBidCompletionRateByMonth();
  }
};

/**
 * Mock implementation for getting discarded projects by month for the last 13 months
 */
const mockGetDiscardedProjectsByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const monthlyData: { monthName: string; value: number }[] = [];

      // Generate data for the last 13 months (includes same month from previous year)
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        // Count discarded projects in this month (based on when they were discarded)
        const discardedInMonth = bidsData.filter(
          (bid) =>
            bid.state === BID_STATES.DISCARDED &&
            bid.last_modified &&
            bid.last_modified.startsWith(monthKey)
        );

        // Use actual count only - no random generation
        const discardedCount = discardedInMonth.length;

        monthlyData.push({
          monthName,
          value: discardedCount,
        });
      }

      console.log(
        `🎭 Mock: Generated monthly discarded projects data for last 13 months`
      );
      resolve(monthlyData);
    }, 300);
  });
};

/**
 * Get discarded projects by month for the last 13 months - uses mock or real based on USE_DUMMY flag
 */
export const getDiscardedProjectsByMonth = async (): Promise<
  { monthName: string; value: number }[]
> => {
  if (USE_DUMMY) {
    return mockGetDiscardedProjectsByMonth();
  } else {
    // Real implementation would fetch from backend
    return mockGetDiscardedProjectsByMonth();
  }
};
