"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/utils/auth";

interface ApiResponse {
  responseTime: number;
  status: number;
  message: string;
}

export default function TestTwoEndpoints() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [response1, setResponse1] = useState<ApiResponse | null>(null);
  const [response2, setResponse2] = useState<ApiResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const makeApiCall = async (responseSetterFn: (res: ApiResponse) => void) => {
    const token = localStorage.getItem("token");
    const startTime = Date.now();

    try {
      const response = await fetch("http://localhost:5000/api/status/api", {
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
        message: data.message || JSON.stringify(data),
      });
    } catch (err) {
      responseSetterFn({
        responseTime: Date.now() - startTime,
        status: 500,
        message: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  };

  const handleSendSequential = async () => {
    setError(null);
    setIsSending(true);
    setResponse1(null);
    setResponse2(null);

    try {
      // Skicka anrop sekventiellt (först 1, sedan 2)
      await makeApiCall(setResponse1);
      await makeApiCall(setResponse2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendParallel = async () => {
    setError(null);
    setIsSending(true);
    setResponse1(null);
    setResponse2(null);

    try {
      // Skicka anrop parallellt
      await Promise.all([makeApiCall(setResponse1), makeApiCall(setResponse2)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
    } finally {
      setIsSending(false);
    }
  };



  return (
    <div className="container mx-auto p-4">
      <h1>
        Testa två anrop till /api/status/api
      </h1>

      <div className="flex gap-4 mb-6">
        <Button onClick={handleSendSequential} disabled={isSending}>
          {isSending ? "Skickar..." : "Skicka sekventiellt"}
        </Button>
        <Button onClick={handleSendParallel} disabled={isSending}>
          {isSending ? "Skickar..." : "Skicka parallellt"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="font-bold mb-2">Anrop 1</h2>
          {response1 ? (
            <div>
              <p>Status: {response1.status}</p>
              <p>Svarstid: {response1.responseTime}ms</p>
              <p>Svar: {response1.message}</p>
            </div>
          ) : (
            <p className="text-gray-500">Inget svar ännu</p>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="font-bold mb-2">Anrop 2</h2>
          {response2 ? (
            <div>
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
