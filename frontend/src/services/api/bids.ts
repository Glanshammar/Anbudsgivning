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

// Simulated data store - in real app this would be database-backed
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
    author: "Maria Johansson",
    deadline: "2024-01-20",
    branch: "Miljö & Hållbarhet",
  },
];

export const getBidsByState = async (state: string): Promise<Bid[]> => {
  // Simulera API-anrop
  return new Promise((resolve) => {
    setTimeout(() => {
      const filteredBids = bidsData.filter((bid) => bid.state === state);
      resolve(filteredBids);
    }, 300);
  });
};

/**
 * Creates a new bid document linked to a tender
 * Called when a tender transitions to BID_AUTHORING state
 */
export const createBid = async (
  tenderName: string,
  description: string,
  deadline: string,
  branch: string
): Promise<Bid> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newBid: Bid = {
        id: `bid_${Date.now()}`, // Generate unique ID
        tender_name: tenderName,
        title: `${tenderName}`,
        description,
        state: BID_STATES.NOT_STARTED, // All new bids start here
        created_date: new Date().toISOString().split("T")[0],
        last_modified: new Date().toISOString().split("T")[0],
        author: "Du", // In real app this would come from authentication context
        deadline,
        branch,
      };

      bidsData.push(newBid);
      resolve(newBid);
    }, 500);
  });
};

/**
 * Transitions a bid to a new state in the authoring workflow
 */
export const updateBidState = async (
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
      resolve();
    }, 300);
  });
};

export const getBidById = async (bidId: string): Promise<Bid | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bid = bidsData.find((bid) => bid.id === bidId);
      resolve(bid || null);
    }, 200);
  });
};

export const getBidByTenderName = async (
  tenderName: string
): Promise<Bid | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bid = bidsData.find((bid) => bid.tender_name === tenderName);
      resolve(bid || null);
    }, 200);
  });
};

export const updateBidContent = async (
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
      resolve();
    }, 300);
  });
};

export const deleteBid = async (bidId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      bidsData = bidsData.filter((bid) => bid.id !== bidId);
      resolve();
    }, 300);
  });
};
