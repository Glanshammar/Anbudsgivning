"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { getTenderPortals, setTenderPortals } from "@/services/api/portals";
import { getTenders, Tender } from "@/services/api/tenders";
import { Portal } from "@/services/api/portals";

const agents = [
  {
    id: "tender-finder",
    name: "Tender Finder",
  },
  // Framtida agenter kan läggas till här
  // {
  //   id: "tender-analyzer",
  //   name: "Tender Analyzer",
  //   description: "Analyserar och bedömer upphandlingar",
  // },
];

export default function InboxPage() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([
    "tender-finder",
  ]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [selectedPortal, setSelectedPortal] = useState<string>("");
  const [newPortal, setNewPortal] = useState<Portal>({
    url: "",
    username: "",
    password: "",
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ref to track if component is mounted and prevent duplicate requests
  const isMountedRef = useRef(true);
  const hasLoadedAgentsRef = useRef(false);

  // Effect to load agents from localStorage (only once)
  useEffect(() => {
    if (hasLoadedAgentsRef.current) return;

    hasLoadedAgentsRef.current = true;
    const storedAgents = localStorage.getItem("selectedAgents");

    if (storedAgents) {
      const agentsToUse = JSON.parse(storedAgents);
      setSelectedAgents(agentsToUse);
    }
  }, []);

  // Effect to fetch data when component mounts or selectedAgents changes
  useEffect(() => {
    if (!selectedAgents.includes("tender-finder") || !isMountedRef.current) {
      setLoading(false);
      setIsInitialized(true);
      return;
    }

    const fetchData = async () => {
      if (loading) return; // Prevent concurrent fetches

      setLoading(true);

      try {
        console.log("Starting data fetch sequence...");

        // Fetch portals first
        if (isMountedRef.current) {
          await fetchPortals();
        }

        // Small delay to prevent race condition
        if (isMountedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Then fetch tenders
        if (isMountedRef.current) {
          await fetchTenders();
        }

        console.log("Data fetch sequence completed");
      } catch (error) {
        console.error("Error in data fetch sequence:", error);
        if (isMountedRef.current) {
          setMessage("Fel vid hämtning av data: " + (error as Error).message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    fetchData();

    // Cleanup function - reset mounted ref
    return () => {
      isMountedRef.current = false;
    };
  }, [selectedAgents]); // Depend on selectedAgents

  // Reset mounted ref when component mounts
  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  const fetchPortals = async () => {
    if (!isMountedRef.current) return;

    try {
      const data = await getTenderPortals();
      if (isMountedRef.current) {
        // Remove duplicates based on URL to prevent React key conflicts
        const uniquePortals = data.filter(
          (portal, index, self) =>
            index === self.findIndex((p) => p.url === portal.url)
        );
        setPortals(uniquePortals);
      }
    } catch (error) {
      console.error("Error in fetchPortals:", error);
      if (isMountedRef.current) {
        setMessage("Fel vid hämtning av portaler: " + (error as Error).message);
      }
    }
  };

  const fetchTenders = async () => {
    if (!isMountedRef.current) return;

    try {
      const data = await getTenders();
      if (isMountedRef.current) {
        setTenders(data);
      }
    } catch (error) {
      console.error("Error in fetchTenders:", error);
      if (isMountedRef.current) {
        setMessage(
          "Fel vid hämtning av upphandlingar: " + (error as Error).message
        );
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPortal((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if portal already exists
    if (portals.some((portal) => portal.url === newPortal.url)) {
      setMessage("En portal med denna URL finns redan!");
      return;
    }

    try {
      const updatedPortals = [...portals, newPortal];
      await setTenderPortals(updatedPortals);
      setMessage("Portal tillagd!");
      setNewPortal({
        url: "",
        username: "",
        password: "",
      });
      // Update state directly instead of fetching from server
      setPortals(updatedPortals);
    } catch (error) {
      setMessage("Fel vid tillägg: " + (error as Error).message);
    }
  };

  const handleEdit = () => {
    const portal = portals.find((p) => p.url === selectedPortal);
    if (portal) {
      setEditIndex(portals.findIndex((p) => p.url === selectedPortal));
      setNewPortal(portal);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editIndex === null) return;
    try {
      const updatedPortals = portals.map((portal, idx) =>
        idx === editIndex ? newPortal : portal
      );
      // Remove duplicates before saving
      const uniquePortals = updatedPortals.filter(
        (portal, index, self) =>
          index === self.findIndex((p) => p.url === portal.url)
      );
      await setTenderPortals(uniquePortals);
      setMessage("Portal uppdaterad!");
      setEditIndex(null);
      setNewPortal({
        url: "",
        username: "",
        password: "",
      });
      setSelectedPortal("");
      setPortals(uniquePortals);
    } catch (error) {
      setMessage("Fel vid uppdatering: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    const portal = portals.find((p) => p.url === selectedPortal);
    if (!portal) return;

    const confirmed = window.confirm(
      `Vill du verkligen ta bort ${portal.url}?`
    );
    if (!confirmed) return;

    try {
      const updatedPortals = portals.filter((p) => p.url !== selectedPortal);
      await setTenderPortals(updatedPortals);
      setMessage("Portal borttagen!");
      setSelectedPortal("");
      setPortals(updatedPortals);
    } catch (error) {
      setMessage("Fel vid borttagning: " + (error as Error).message);
    }
  };

  const handleRemoveTender = (tender: Tender) => {
    setTenders((prevTenders) =>
      prevTenders.filter((t) => t.project_name !== tender.project_name)
    );
  };

  const handleAgentSelection = (agentId: string) => {
    setSelectedAgents((prevSelected) => {
      const updatedAgents = prevSelected.includes(agentId)
        ? prevSelected.filter((id) => id !== agentId)
        : [...prevSelected, agentId];
      localStorage.setItem("selectedAgents", JSON.stringify(updatedAgents));
      return updatedAgents;
    });
  };

  const handleSendToEvaluation = (projectName: string) => {
    // TODO: Implement send to evaluation functionality
    console.log(`Sending ${projectName} to evaluation`);
    alert(
      `Funktionen "Skicka till bedömning" är inte implementerad än för: ${projectName}`
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
        <div className="flex justify-end mb-4 sm:mb-6">
          <div className="relative">
            <button
              onClick={() => setShowAgentSettings(!showAgentSettings)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Agentinställningar"
            >
              <img
                src="/agent-icon.png"
                alt="Agentinställningar"
                className="w-6 h-6"
              />
            </button>
          </div>
        </div>

        {showAgentSettings && (
          <div className="mb-6 sm:mb-8 bg-gray-50 rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Aktiva agenter
              </h3>
              <button
                onClick={() => setShowAgentSettings(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={agent.id}
                    name="agents"
                    value={agent.id}
                    checked={selectedAgents.includes(agent.id)}
                    onChange={() => handleAgentSelection(agent.id)}
                    className="mr-2"
                  />
                  <label htmlFor={agent.id} className="text-sm text-gray-700">
                    {agent.name}
                  </label>
                </div>
              ))}
            </div>
            {selectedAgents.includes("tender-finder") && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  Hantera portaler
                </h4>
                {/* Portal selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Välj en portal att redigera
                  </label>
                  <select
                    value={selectedPortal}
                    onChange={(e) => setSelectedPortal(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Välj en portal...</option>
                    {portals.map((portal) => (
                      <option key={portal.url} value={portal.url}>
                        {portal.url}
                      </option>
                    ))}
                  </select>
                  {selectedPortal && (
                    <div className="mt-2 flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleEdit}
                        className="flex-1 sm:flex-none"
                      >
                        Redigera
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        className="flex-1 sm:flex-none"
                      >
                        Ta bort
                      </Button>
                    </div>
                  )}
                </div>
                {/* Add/Edit form */}
                <form
                  onSubmit={editIndex === null ? handleSubmit : handleSaveEdit}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="submit"
                      variant="default"
                      className="flex-1 sm:flex-none"
                    >
                      {editIndex === null
                        ? "Lägg till portal"
                        : "Spara ändring"}
                    </Button>
                    {editIndex !== null && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditIndex(null);
                          setNewPortal({
                            url: "",
                            username: "",
                            password: "",
                          });
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        Avbryt
                      </Button>
                    )}
                  </div>
                  {message && (
                    <div className="text-sm text-green-600 mt-2">{message}</div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Inkommande upphandlingar
          </h2>

          {loading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <span className="text-gray-500 text-lg">Laddar...</span>
            </div>
          ) : (
            <div>
              {tenders.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>Laddar...</p>
                  <p className="text-sm mt-2">
                    Kontrollera att du har ställt in rätt portaler och att
                    agenten är aktiverad.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Upphandling
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Bransch
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Deadline
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Åtgärder
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tenders.map((tender, index) => (
                          <tr key={`${tender.project_name}-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {tender.project_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {tender.branch}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {tender.deadline}
                              </div>
                            </td>
                            <td className="px-6 py-4 flex gap-2 text-sm font-medium">
                              <Button
                                onClick={() => handleRemoveTender(tender)}
                                size="sm"
                                variant="destructive"
                              >
                                Ta bort
                              </Button>
                              <Button
                                onClick={() =>
                                  handleSendToEvaluation(tender.project_name)
                                }
                                size="sm"
                              >
                                Skicka till bedömning
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {tenders.map((tender, index) => (
                      <div
                        key={`${tender.project_name}-${index}`}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                      >
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">
                              Upphandling
                            </h3>
                            <p className="text-sm text-gray-600">
                              {tender.project_name}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                Bransch
                              </h4>
                              <p className="text-sm text-gray-600">
                                {tender.branch}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                Deadline
                              </h4>
                              <p className="text-sm text-gray-600">
                                {tender.deadline}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                            <Button
                              onClick={() => handleRemoveTender(tender)}
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                            >
                              Ta bort
                            </Button>
                            <Button
                              onClick={() =>
                                handleSendToEvaluation(tender.project_name)
                              }
                              size="sm"
                              className="flex-1"
                            >
                              Skicka till bedömning
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
