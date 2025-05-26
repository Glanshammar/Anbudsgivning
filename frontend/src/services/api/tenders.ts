export interface Tender {
  project_name: string;
  branch: string;
  deadline: string;
  end_date: string;
  start_date: string;
}

// Configuration
const USE_DUMMY = false;
const API_BASE_URL = "http://localhost:5000";
const REQUEST_TIMEOUT = 15000; // 15 seconds - increased for slow servers
const MAX_RETRIES = 1; // Reduced retries to prevent spam

// Global request manager to prevent duplicate requests
class RequestManager {
  private activeRequests = new Map<string, Promise<any>>();

  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If request is already in progress, return the existing promise
    if (this.activeRequests.has(key)) {
      console.log(
        `🔄 Request ${key} already in progress, reusing existing promise...`
      );
      return this.activeRequests.get(key)!;
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

// Dummy data for fallback
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
export async function getTenders(): Promise<Tender[]> {
  return requestManager.executeRequest("getTenders", async () => {
    if (USE_DUMMY) {
      console.log("Using dummy tender data");
      return new Promise<Tender[]>((resolve) =>
        setTimeout(() => resolve(dummyTenders), 300)
      );
    }

    try {
      console.log("Fetching tenders...");

      const response = await withRetry(async () => {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/tenders`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!res.ok) {
          throw new ApiError(
            `Failed to fetch tenders: ${res.statusText}`,
            res.status
          );
        }

        return res;
      });

      const data = await response.json();
      console.log("Tenders fetched successfully:", data);

      if (data && data.tenders && Array.isArray(data.tenders)) {
        return data.tenders;
      }

      console.warn("Unexpected tenders API response format", data);
      return [];
    } catch (error) {
      console.error("Error fetching tenders:", error);

      if (error instanceof ApiError) {
        // For API errors, don't fallback to dummy data in production
        if (!USE_DUMMY) {
          throw error;
        }
      }

      console.warn("Falling back to dummy tender data");
      return dummyTenders;
    }
  });
}
