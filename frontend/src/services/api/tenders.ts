export interface Tender {
  project_name: string;
  description: string;
  branch: string;
  tender_document_link: string;
  deadline: string;
  end_date: string;
  start_date: string;
  state: string;
  bid_data?: Record<string, unknown>;
  submission_date?: string;
}

// Define all states as constants
export const TENDER_STATES = {
  NYINKOMMET: "nyinkommet",
  ATT_FINSORTERA: "att_finsortera",
  BID_NOBID: "bid_nobid",
  SKA_BJUDAS_PA: "ska_bjudas_pa",
  BID_AUTHORING: "bid_authoring",
  SENT_BIDS: "sent_bids",
} as const;

export type TenderState = (typeof TENDER_STATES)[keyof typeof TENDER_STATES];

// Mapping for Swedish display names
export const TENDER_STATE_LABELS = {
  [TENDER_STATES.NYINKOMMET]: "Nyinkommet",
  [TENDER_STATES.ATT_FINSORTERA]: "Att finsortera",
  [TENDER_STATES.BID_NOBID]: "Bid/No bid?!",
  [TENDER_STATES.SKA_BJUDAS_PA]: "Ska bjudas på",
  [TENDER_STATES.BID_AUTHORING]: "Bid Authoring",
  [TENDER_STATES.SENT_BIDS]: "Upphandlingar vi bjudit på",
} as const;

// Configuration
const USE_DUMMY = false;
const API_BASE_URL = "http://localhost:5000";
const REQUEST_TIMEOUT = 15000; // 15 seconds - increased for slow servers
const MAX_RETRIES = 1; // Reduced retries to prevent spam

// Global request manager to prevent duplicate requests
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
    state: TENDER_STATES.ATT_FINSORTERA,
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
    state: TENDER_STATES.BID_NOBID,
  },
];

// Custom error class for API errors
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

// Utility function to create fetch with timeout
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

// Retry wrapper for API calls
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

      // Don't retry on certain errors
      if (error instanceof ApiError && error.status && error.status < 500) {
        throw error;
      }

      if (attempt < retries) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 8000); // Exponential backoff
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
      console.log(`✅ Dummy mode: Updated tender ${tenderId} to ${newState}`);
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
 */
export async function getTendersByState(state: TenderState): Promise<Tender[]> {
  return requestManager.executeRequest(
    `getTendersByState-${state}`,
    async () => {
      if (USE_DUMMY) {
        console.log(`Dummy: Getting tenders with state ${state}`);
        const filtered = dummyTenders.filter(
          (tender) => tender.state === state
        );
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
          return dummyTenders.filter((tender) => tender.state === state);
        }

        throw error;
      }
    }
  );
}
