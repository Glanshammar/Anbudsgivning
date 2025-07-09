export interface Portal {
  site: string;
  url: string;
  username: string;
  password: string;
}

// Configuration
const USE_DUMMY = true;
const API_BASE_URL = "http://localhost:5000";
const REQUEST_TIMEOUT = 15000; // 15 seconds - increased for slow servers
const MAX_RETRIES = 1; // Reduced retries to prevent spam

/**
 * Request Manager class - identical pattern to tenders.ts
 * Prevents duplicate API requests when multiple components need same data
 */
class RequestManager {
  private activeRequests = new Map<string, Promise<any>>();

  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Reuse existing request if already in progress
    if (this.activeRequests.has(key)) {
      console.log(
        `🔄 Request ${key} already in progress, reusing existing promise...`
      );
      return this.activeRequests.get(key)!;
    }

    console.log(`🚀 Starting new request: ${key}`);

    // Create new request with cleanup
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
    return requestPromise;
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

// Dummy data for fallback/development
const dummyPortals: Portal[] = [
  {
    site: "Portal 1",
    url: "https://example-portal1.com",
    username: "testuser1",
    password: "password1",
  },
  {
    site: "Portal 2",
    url: "https://example-portal2.com",
    username: "testuser2",
    password: "password2",
  },
  {
    site: "Portal 3",
    url: "https://example-portal3.com",
    username: "testuser3",
    password: "password3",
  },
];

/**
 * Custom error class for API errors - same pattern as other services
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
 * Fetch with timeout wrapper - prevents hanging requests
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
 * Retry mechanism with exponential backoff
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

      // Don't retry client errors (4xx status codes)
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
 * Fetches all tender portals
 */
export async function getTenderPortals(): Promise<Portal[]> {
  return requestManager.executeRequest("getTenderPortals", async () => {
    if (USE_DUMMY) {
      console.log("Using dummy portal data");
      return new Promise<Portal[]>((resolve) =>
        setTimeout(() => resolve(dummyPortals), 300)
      );
    }

    try {
      console.log("Fetching tender portals...");

      const response = await withRetry(async () => {
        const res = await fetchWithTimeout(
          `${API_BASE_URL}/api/tender_portals`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new ApiError(
            `Failed to fetch portals: ${res.statusText}`,
            res.status
          );
        }

        return res;
      });

      const data = await response.json();
      console.log("Tender portals fetched successfully:", data);

      return Array.isArray(data.portals) ? data.portals : [];
    } catch (error) {
      console.error("Error fetching tender portals:", error);

      if (error instanceof ApiError) {
        // For API errors, don't fallback to dummy data in production
        if (!USE_DUMMY) {
          throw error;
        }
      }

      console.warn("Falling back to dummy portal data");
      return dummyPortals;
    }
  });
}

/**
 * Updates/sets all tender portals (replaces existing)
 */
export async function setTenderPortals(portals: Portal[]): Promise<void> {
  return requestManager.executeRequest("setTenderPortals", async () => {
    if (USE_DUMMY) {
      return;
    }

    try {
      console.log("Setting tender portals...");

      await withRetry(async () => {
        const response = await fetchWithTimeout(
          `${API_BASE_URL}/api/tender_portals`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ portals }),
          }
        );

        if (!response.ok) {
          throw new ApiError(
            `Failed to set portals: ${response.statusText}`,
            response.status
          );
        }

        return response;
      });

      console.log("Tender portals set successfully");
    } catch (error) {
      console.error("Error setting tender portals:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError("Failed to set tender portals");
    }
  });
}

/**
 * Creates a new tender portal
 */
export async function createTenderPortal(portal: Portal): Promise<void> {
  return requestManager.executeRequest("createTenderPortal", async () => {
    if (USE_DUMMY) {
      return;
    }

    try {
      await withRetry(async () => {
        const response = await fetchWithTimeout(
          `${API_BASE_URL}/api/tender_portals`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ portal }),
          }
        );

        if (!response.ok) {
          throw new ApiError(
            `Failed to create portal: ${response.statusText}`,
            response.status
          );
        }

        return response;
      });

      console.log("Tender portal created successfully");
    } catch (error) {
      console.error("Error creating tender portal:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError("Failed to create tender portal");
    }
  });
}
