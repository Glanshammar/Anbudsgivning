export interface Tender {
  project_name: string;
  description: string;
  branch: string;
  tender_document_link: string;
  deadline: string;
  end_date: string;
  start_date: string;
  state: string; // Keep for backward compatibility
  states?: string[]; // New: array of states for multiple simultaneous states - allows tenders to exist in multiple workflows
  bid_data?: Record<string, unknown>;
  submission_date?: string;
}

// Define all states as constants
export const TENDER_STATES = {
  NYINKOMMET: "nyinkommet",
  UNDER_UTREDNING: "under_utredning",
  SKA_BJUDAS_PA: "ska_bjudas_pa",
  BID_AUTHORING: "bid_authoring", // Special state: tenders here also remain in SKA_BJUDAS_PA for multi-state visibility
  SENT_BIDS: "sent_bids",
} as const;

export type TenderState = (typeof TENDER_STATES)[keyof typeof TENDER_STATES];

// Mapping for Swedish display names
export const TENDER_STATE_LABELS = {
  [TENDER_STATES.NYINKOMMET]: "Inbox",
  [TENDER_STATES.UNDER_UTREDNING]: "Under Review",
  [TENDER_STATES.SKA_BJUDAS_PA]: "Preparing Bid",
  [TENDER_STATES.BID_AUTHORING]: "Bid Authoring",
  [TENDER_STATES.SENT_BIDS]: "Submitted Bids",
} as const;

// Configuration
const USE_DUMMY = true;
const API_BASE_URL = "http://localhost:5000";
const REQUEST_TIMEOUT = 15000; // 15 seconds - increased for slow servers
const MAX_RETRIES = 1; // Reduced retries to prevent spam

/**
 * Global request manager to prevent duplicate API requests
 * This ensures that if multiple components try to fetch the same data simultaneously,
 * only one actual API call is made and the result is shared
 */
class RequestManager {
  private activeRequests = new Map<string, Promise<unknown>>();

  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If request is already in progress, return the existing promise
    if (this.activeRequests.has(key)) {
      console.log(
        `🔄 Request ${key} already in progress, reusing existing promise...`
      );
      return this.activeRequests.get(key)! as T;
    }

    console.log(`🚀 Starting new request: ${key}`);

    // Create new request
    const requestPromise = requestFn()
      .then((result) => {
        console.log(`✅ Request ${key} completed successfully`);
        return result;
      })
      .catch((error) => {
        console.log(`❌ Request ${key} failed:`, error.message);
        throw error;
      })
      .finally(() => {
        // Clean up when request completes
        console.log(`🧹 Cleaning up request: ${key}`);
        this.activeRequests.delete(key);
      });

    this.activeRequests.set(key, requestPromise);
    return requestPromise as T;
  }

  cancelAll() {
    console.log(
      `🛑 Cancelling all ${this.activeRequests.size} active requests`
    );
    this.activeRequests.clear();
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}

const requestManager = new RequestManager();

// Dummy data for fallback
const dummyTenders: Tender[] = [
  {
    project_name: "Projekt 1",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas.",
    branch: "Bygg & Anläggning",
    tender_document_link: "https://example.com/projekt1.pdf",
    deadline: "2025-06-13",
    end_date: "2025-08-26",
    start_date: "2025-07-04",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 2",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam.",
    branch: "Energi",
    tender_document_link: "https://example.com/projekt2.pdf",
    deadline: "2025-06-18",
    end_date: "2025-08-18",
    start_date: "2025-07-08",
    state: TENDER_STATES.UNDER_UTREDNING,
    states: [TENDER_STATES.UNDER_UTREDNING],
  },
  {
    project_name: "Projekt 3",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt3.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 4",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt4.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 5",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt5.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 6",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt6.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 7",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt7.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 8",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt8.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.SKA_BJUDAS_PA,
    states: [TENDER_STATES.SKA_BJUDAS_PA],
  },
  {
    project_name: "Projekt 9",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt9.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 10",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt10.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 11",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt11.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 12",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt12.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 13",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt13.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 14",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt14.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 15",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt15.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 16",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt16.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 17",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt17.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 18",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt18.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 19",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt19.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 20",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt20.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
  {
    project_name: "Projekt 21",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus leo eu aenean sed diam urna tempor pulvinar vivamus fringilla lacus nec metus bibendum egestas iaculis massa.",
    branch: "Fastighetsskötsel",
    tender_document_link: "https://example.com/projekt21.pdf",
    deadline: "2025-06-14",
    end_date: "2025-08-25",
    start_date: "2025-07-20",
    state: TENDER_STATES.NYINKOMMET,
    states: [TENDER_STATES.NYINKOMMET],
  },
];

/**
 * Custom error class for API-specific errors
 * Distinguishes between operational errors (expected) and programming errors
 */
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = "ApiError";
    Error.captureStackTrace(this, ApiError);
  }
}

/**
 * Utility function to add timeout to fetch requests
 * Prevents requests from hanging indefinitely
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timeout", 408);
    }
    throw error;
  }
}

/**
 * Retry wrapper for API calls with exponential backoff
 * Handles transient failures gracefully
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors (client errors, authentication, etc.)
      if (error instanceof ApiError && error.status && error.status < 500) {
        throw error;
      }

      if (attempt < retries) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 8000); // Exponential backoff capped at 8 seconds
        console.log(
          `API call failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${
            retries + 1
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Fetches all tenders
 */
export async function createTender(
  tender: Omit<Tender, "state">
): Promise<Tender> {
  const requestKey = `create-tender-${tender.project_name}`;

  return requestManager.executeRequest(requestKey, async () => {
    console.log(`🔄 Creating new tender: ${tender.project_name}...`);

    if (USE_DUMMY) {
      console.log(`✅ Dummy mode: Created tender ${tender.project_name}`);
      const newTender: Tender = {
        ...tender,
        state: TENDER_STATES.NYINKOMMET,
      };
      return new Promise<Tender>((resolve) =>
        setTimeout(() => resolve(newTender), 300)
      );
    }

    return await withRetry(async () => {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tenders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          tenders: [
            {
              ...tender,
              state: TENDER_STATES.NYINKOMMET,
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new ApiError("Authentication required", 401);
        }
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      console.log(`✅ Successfully created tender: ${tender.project_name}`);
      return data.tender || { ...tender, state: TENDER_STATES.NYINKOMMET };
    });
  });
}

/**
 * Fetches all tenders
 */
export async function updateTenderState(
  tenderId: string,
  newState: TenderState
): Promise<void> {
  const requestKey = `update-tender-${tenderId}-${newState}`;

  return requestManager.executeRequest(requestKey, async () => {
    console.log(`🔄 Updating tender ${tenderId} to state ${newState}...`);

    if (USE_DUMMY) {
      // update the dummy data
      const tenderIndex = dummyTenders.findIndex(
        (tender) => tender.project_name === tenderId
      );
      if (tenderIndex !== -1) {
        dummyTenders[tenderIndex].state = newState;
        dummyTenders[tenderIndex].states = [newState];
        console.log(`✅ Dummy mode: Updated tender ${tenderId} to ${newState}`);
      } else {
        console.warn(`⚠️ Dummy mode: Tender ${tenderId} not found`);
      }
      return;
    }

    await withRetry(async () => {
      await fetchWithTimeout(
        `${API_BASE_URL}/api/tenders/${encodeURIComponent(tenderId)}/state`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ state: newState }),
        }
      );
      console.log(`✅ Successfully updated tender ${tenderId} to ${newState}`);
    });
  });
}

/**
 * Hämta tenders baserat på state
 * Supports both single state and multi-state system for backward compatibility
 */
export async function getTendersByState(state: TenderState): Promise<Tender[]> {
  return requestManager.executeRequest(
    `getTendersByState-${state}`,
    async () => {
      if (USE_DUMMY) {
        console.log(`Dummy: Getting tenders with state ${state}`);
        const filtered = dummyTenders.filter((tender) => {
          // Check both old state property and new states array for multi-state support
          return tender.state === state || tender.states?.includes(state);
        });
        return new Promise<Tender[]>((resolve) =>
          setTimeout(() => resolve(filtered), 300)
        );
      }

      try {
        console.log(`Fetching tenders with state ${state}...`);

        const response = await withRetry(async () => {
          const res = await fetchWithTimeout(
            `${API_BASE_URL}/api/tenders/by-state/${state}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            }
          );

          if (!res.ok) {
            if (res.status === 401) {
              throw new ApiError("Authentication required", 401);
            }
            throw new ApiError(
              `HTTP ${res.status}: ${res.statusText}`,
              res.status
            );
          }

          return res;
        });

        const data = await response.json();
        console.log(
          `✅ Successfully fetched ${
            data.tenders?.length || 0
          } tenders with state ${state}`
        );
        return data.tenders || [];
      } catch (error) {
        console.error(`❌ Failed to get tenders by state ${state}:`, error);

        // For authentication errors, return empty array
        if (error instanceof ApiError && error.status === 401) {
          return [];
        }

        // Fallback to filtered dummy data if enabled
        if (USE_DUMMY) {
          return dummyTenders.filter((tender) => {
            // Check both old state property and new states array
            return tender.state === state || tender.states?.includes(state);
          });
        }

        throw error;
      }
    }
  );
}

/**
 * Add a state to a tender (for multiple states simultaneously)
 * This is key for the multi-state system where tenders can exist in multiple workflows
 * Example: A tender can be both "ska_bjudas_pa" and "bid_authoring" at the same time
 */
export async function addTenderState(
  tenderId: string,
  newState: TenderState
): Promise<void> {
  const requestKey = `add-tender-state-${tenderId}-${newState}`;

  return requestManager.executeRequest(requestKey, async () => {
    console.log(`🔄 Adding state ${newState} to tender ${tenderId}...`);

    if (USE_DUMMY) {
      const tenderIndex = dummyTenders.findIndex(
        (tender) => tender.project_name === tenderId
      );
      if (tenderIndex !== -1) {
        const tender = dummyTenders[tenderIndex];
        // Initialize states array if it doesn't exist (backward compatibility)
        if (!tender.states) {
          tender.states = [tender.state];
        }
        // Add new state if not already present
        if (!tender.states.includes(newState)) {
          tender.states.push(newState);
          // Update primary state to the most recent one
          tender.state = newState;
        }
        console.log(
          `✅ Dummy mode: Added state ${newState} to tender ${tenderId}`
        );
      } else {
        console.warn(`⚠️ Dummy mode: Tender ${tenderId} not found`);
      }
      return;
    }

    // TODO: Implement real API call when backend supports multi-state system
    console.log(`Would add state ${newState} to tender ${tenderId} via API`);
  });
}

/**
 * Delete/remove a tender
 */
export async function deleteTender(tenderId: string): Promise<void> {
  const requestKey = `delete-tender-${tenderId}`;

  return requestManager.executeRequest(requestKey, async () => {
    console.log(`🔄 Deleting tender ${tenderId}...`);

    if (USE_DUMMY) {
      // Remove from dummy data
      const tenderIndex = dummyTenders.findIndex(
        (tender) => tender.project_name === tenderId
      );
      if (tenderIndex !== -1) {
        dummyTenders.splice(tenderIndex, 1);
        console.log(`✅ Dummy mode: Deleted tender ${tenderId}`);
      } else {
        console.warn(`⚠️ Dummy mode: Tender ${tenderId} not found`);
      }
      return;
    }

    // TODO: Implement real API call when backend is ready
    console.log(`Would delete tender ${tenderId} via API`);
  });
}
