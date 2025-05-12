"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";
import { getPortals, setTenderPortals, Portal } from "@/services/api/portals";
import { Button } from "@/components/ui/button";

const TABS = [
  { label: "Tender Portals", value: "portals" },
  { label: "Agents", value: "agents" },
  { label: "User Profile", value: "profile" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("portals");
  const [portals, setPortals] = useState<Portal[]>([]);
  const [newPortal, setNewPortal] = useState<Portal>({
    url: "",
    username: "",
    password: "",
  });
  const [message, setMessage] = useState<string>("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    if (activeTab === "portals") {
      fetchPortals();
    }
  }, [activeTab]);

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
      const urlWithProtocol =
        url.startsWith("http://") || url.startsWith("https://")
          ? url
          : `https://${url}`;
      const parsed = new URL(urlWithProtocol);
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
    if (!validateUrl(newPortal.url)) {
      setMessage("Fel: Ange en giltig URL (t.ex. mercell.com)");
      return;
    }
    const urlWithProtocol =
      newPortal.url.startsWith("http://") ||
      newPortal.url.startsWith("https://")
        ? newPortal.url
        : `https://${newPortal.url}`;
    try {
      // Hämta befintliga portaler först
      const existingPortals = await getPortals();
      // Lägg till den nya portalen
      const updatedPortals = [
        ...existingPortals,
        { ...newPortal, url: urlWithProtocol },
      ];
      await setTenderPortals(updatedPortals);
      setMessage("Portal tillagd!");
      await fetchPortals();
      setNewPortal({ url: "", username: "", password: "" });
    } catch (error) {
      setMessage("Fel vid tillägg av portal: " + (error as Error).message);
    }
  };

  // Ta bort portal
  const handleDelete = async (idx: number) => {
    const portal = portals[idx];
    const confirmed = window.confirm(
      `Do you really want to delete ${portal.url}?`
    );
    if (!confirmed) return;
    try {
      const updatedPortals = portals.filter((_, i) => i !== idx);
      await setTenderPortals(updatedPortals);
      setMessage("Portal borttagen!");
      await fetchPortals();
    } catch (error) {
      setMessage("Fel vid borttagning: " + (error as Error).message);
    }
  };

  // Redigera portal
  const handleEdit = (idx: number) => {
    setEditIndex(idx);
    setNewPortal(portals[idx]);
  };

  // Spara redigerad portal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editIndex === null) return;
    if (!validateUrl(newPortal.url)) {
      setMessage("Fel: Ange en giltig URL (t.ex. mercell.com)");
      return;
    }
    const urlWithProtocol =
      newPortal.url.startsWith("http://") ||
      newPortal.url.startsWith("https://")
        ? newPortal.url
        : `https://${newPortal.url}`;
    try {
      const updatedPortals = portals.map((p, i) =>
        i === editIndex ? { ...newPortal, url: urlWithProtocol } : p
      );
      await setTenderPortals(updatedPortals);
      setMessage("Portal uppdaterad!");
      await fetchPortals();
      setNewPortal({ url: "", username: "", password: "" });
      setEditIndex(null);
    } catch (error) {
      setMessage("Fel vid uppdatering: " + (error as Error).message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-xl font-semibold mb-4">Inställningar</h2>
      {/* Tabs */}
      <div className="flex border-b mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 -mb-px border-b-2 font-medium transition-colors duration-150 focus:outline-none ${
              activeTab === tab.value
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-indigo-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Tab Content */}
      {activeTab === "portals" && (
        <div>
          <h3 className="text-lg font-medium mb-2">Tender Portaler</h3>
          <form
            onSubmit={editIndex === null ? handleSubmit : handleSaveEdit}
            className="mb-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                URL
              </label>
              <input
                type="text"
                name="url"
                value={newPortal.url}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://portal.com"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="default">
                {editIndex === null ? "Lägg till portal" : "Spara ändring"}
              </Button>
              {editIndex !== null && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditIndex(null);
                    setNewPortal({ url: "", username: "", password: "" });
                  }}
                >
                  Avbryt
                </Button>
              )}
            </div>
            {message && (
              <div className="text-sm text-red-500 mt-2">{message}</div>
            )}
          </form>
          <div>
            <h4 className="text-md font-semibold mb-2">Sparade portaler</h4>
            <ul className="divide-y divide-gray-200">
              {portals.map((portal, idx) => (
                <li
                  key={idx}
                  className="py-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-medium">{portal.url}</div>
                    <div className="text-sm text-gray-500">
                      {portal.username}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(idx)}
                    >
                      Redigera
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(idx)}
                    >
                      Ta bort
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {activeTab === "agents" && (
        <div className="py-8 text-gray-500 text-center">
          <h3 className="text-lg font-medium mb-2">Agents</h3>
          <p>Kommer senare</p>
        </div>
      )}
      {activeTab === "profile" && (
        <div className="py-8 text-gray-500 text-center">
          <h3 className="text-lg font-medium mb-2">User Profile</h3>
          <p>Kommer senare</p>
        </div>
      )}
    </div>
  );
}
