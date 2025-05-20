"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/utils/auth";

interface ApiResponse {
  responseTime: number;
  status: number;
  message: string;
  endpoint: string;
}

export default function TestDifferentEndpoints() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [response1, setResponse1] = useState<ApiResponse | null>(null);
  const [response2, setResponse2] = useState<ApiResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCount, setTestCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const makeApiCall = async (
    endpoint: string,
    responseSetterFn: (res: ApiResponse) => void
  ) => {
    const token = localStorage.getItem("token");
    const startTime = Date.now();

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      responseSetterFn({
        responseTime,
        status: response.status,
        message:
          typeof data === "object" ? JSON.stringify(data) : data.toString(),
        endpoint,
      });
      return true;
    } catch (err) {
      responseSetterFn({
        responseTime: Date.now() - startTime,
        status: 500,
        message: err instanceof Error ? err.message : "Unknown error occurred",
        endpoint,
      });
      return false;
    }
  };

  const handleSendSequential = async () => {
    setError(null);
    setIsSending(true);
    setResponse1(null);
    setResponse2(null);
    setTestCount((prev) => prev + 1);

    try {
      // Skicka anrop sekventiellt (först API Status, sedan Server Status)
      const success1 = await makeApiCall("/api/status/api", setResponse1);
      const success2 = await makeApiCall("/api/status/server", setResponse2);

      if (success1 && success2) {
        setSuccessCount((prev) => prev + 1);
      } else {
        setFailCount((prev) => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setFailCount((prev) => prev + 1);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendParallel = async () => {
    setError(null);
    setIsSending(true);
    setResponse1(null);
    setResponse2(null);
    setTestCount((prev) => prev + 1);

    try {
      // Skicka anrop parallellt
      const results = await Promise.all([
        makeApiCall("/api/status/api", setResponse1),
        makeApiCall("/api/status/server", setResponse2),
      ]);

      if (results[0] && results[1]) {
        setSuccessCount((prev) => prev + 1);
      } else {
        setFailCount((prev) => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setFailCount((prev) => prev + 1);
    } finally {
      setIsSending(false);
    }
  };

  const runMultipleTests = async (parallel = true, count = 10) => {
    setError(null);
    let localSuccesses = 0;
    let localFailures = 0;

    for (let i = 0; i < count; i++) {
      setIsSending(true);
      setResponse1(null);
      setResponse2(null);
      setTestCount((prev) => prev + 1);

      try {
        let success;
        if (parallel) {
          const results = await Promise.all([
            makeApiCall("/api/status/api", setResponse1),
            makeApiCall("/api/status/server", setResponse2),
          ]);
          success = results[0] && results[1];
        } else {
          const success1 = await makeApiCall("/api/status/api", setResponse1);
          const success2 = await makeApiCall(
            "/api/status/server",
            setResponse2
          );
          success = success1 && success2;
        }

        if (success) {
          localSuccesses++;
          setSuccessCount((prev) => prev + 1);
        } else {
          localFailures++;
          setFailCount((prev) => prev + 1);
        }
      } catch (err) {
        localFailures++;
        setFailCount((prev) => prev + 1);
        setError(err instanceof Error ? err.message : "Ett fel uppstod");
      } finally {
        setIsSending(false);
      }

      // Kort paus mellan tester
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setError(
      `Testresultat: ${localSuccesses} lyckades, ${localFailures} misslyckades`
    );
  };

  if (!authChecked) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <span className="text-gray-500 text-lg">Laddar...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Testa anrop till olika endpoints
      </h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <Button onClick={handleSendSequential} disabled={isSending}>
          {isSending ? "Skickar..." : "Skicka sekventiellt"}
        </Button>
        <Button onClick={handleSendParallel} disabled={isSending}>
          {isSending ? "Skickar..." : "Skicka parallellt"}
        </Button>
        <Button
          onClick={() => runMultipleTests(true)}
          disabled={isSending}
          variant="outline"
        >
          Kör 10 parallella tester
        </Button>
        <Button
          onClick={() => runMultipleTests(false)}
          disabled={isSending}
          variant="outline"
        >
          Kör 10 sekventiella tester
        </Button>
      </div>

      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Teststatistik</h2>
        <p>Totalt antal tester: {testCount}</p>
        <p>Lyckade: {successCount}</p>
        <p>Misslyckade: {failCount}</p>
        {failCount > 0 && (
          <p className="text-red-600 font-semibold">
            Felfrekvens: {((failCount / testCount) * 100).toFixed(1)}%
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="font-bold mb-2">API Status-anrop</h2>
          {response1 ? (
            <div>
              <p>Endpoint: {response1.endpoint}</p>
              <p>Status: {response1.status}</p>
              <p>Svarstid: {response1.responseTime}ms</p>
              <p>Svar: {response1.message}</p>
            </div>
          ) : (
            <p className="text-gray-500">Inget svar ännu</p>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="font-bold mb-2">Server Status-anrop</h2>
          {response2 ? (
            <div>
              <p>Endpoint: {response2.endpoint}</p>
              <p>Status: {response2.status}</p>
              <p>Svarstid: {response2.responseTime}ms</p>
              <p>Svar: {response2.message}</p>
            </div>
          ) : (
            <p className="text-gray-500">Inget svar ännu</p>
          )}
        </div>
      </div>
    </div>
  );
}
