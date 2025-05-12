"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";
import { getPortals, setTenderPortals, Portal } from "@/services/api/portals";

export default function TenderPortalsPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [newPortal, setNewPortal] = useState<Portal>({
    url: "",
    username: "",
    password: "",
  });
  const [message, setMessage] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    fetchPortals();
  }, []);

  const fetchPortals = async () => {
    try {
      const portals = await getPortals();
      setPortals(portals);
    } catch (error) {
      console.error("Error fetching portals:", error);
      setMessage("Error loading portals: " + (error as Error).message);
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      // Add https:// if missing
      const urlWithProtocol =
        url.startsWith("http://") || url.startsWith("https://")
          ? url
          : `https://${url}`;
      const parsed = new URL(urlWithProtocol);
      // Check that the host contains at least one dot and ends with at least two letters
      const domainRegex = /\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(parsed.hostname)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPortal((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validera URL och lägg till https:// om det saknas
    if (!validateUrl(newPortal.url)) {
      setMessage("Fel: Ange en giltig URL (t.ex. mercell.com)");
      return;
    }

    // Add https:// if missing
    const urlWithProtocol =
      newPortal.url.startsWith("http://") ||
      newPortal.url.startsWith("https://")
        ? newPortal.url
        : `https://${newPortal.url}`;

    try {
      await setTenderPortals([{ ...newPortal, url: urlWithProtocol }]);
      setMessage("Portal tillagd!");
      await fetchPortals();
      setNewPortal({ url: "", username: "", password: "" });
    } catch (error) {
      setMessage("Fel vid tillägg av portal: " + (error as Error).message);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-lg font-medium text-gray-900">
              Lägg till portal
            </h1>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    URL
                  </label>
                  <input
                    type="text"
                    name="url"
                    value={newPortal.url}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Användarnamn
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={newPortal.username}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Lösenord
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={newPortal.password}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Lägg till
              </button>
            </form>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 mb-4 rounded-md ${
              message.includes("Fel")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">
              Mina portaler
            </h2>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {portals.map((portal, idx) => (
                <li key={idx} className="px-4 py-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        URL
                      </span>
                      <p className="mt-1">{portal.url}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Användarnamn
                      </span>
                      <p className="mt-1">{portal.username}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Lösenord
                      </span>
                      <p className="mt-1">
                        {"*".repeat(portal.password.length)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
