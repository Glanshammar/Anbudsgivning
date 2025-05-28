"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Tender } from "@/services/api/tenders";

export interface TenderWithPhase extends Tender {
  id: string;
  phase: "inbox" | "evaluation" | "review" | "drafts" | "submitted";
  addedToPhaseAt: Date;
  evaluation?: {
    competenceMatch: number; // 1-5
    competitionLevel: number; // 1-5
    resourceAvailability: number; // 1-5
    profitability: number; // 1-5
    strategicValue: number; // 1-5
    notes: string;
    totalScore?: number;
    recommendation?: "proceed" | "decline" | "pending";
  };
}

interface TenderContextType {
  tenders: TenderWithPhase[];
  addTender: (tender: Tender) => void;
  moveTenderToPhase: (
    tenderId: string,
    newPhase: TenderWithPhase["phase"]
  ) => void;
  moveTenderToPreviousPhase: (tenderId: string) => void;
  removeTender: (tenderId: string) => void;
  updateTenderEvaluation: (
    tenderId: string,
    evaluation: TenderWithPhase["evaluation"]
  ) => void;
  getTendersByPhase: (phase: TenderWithPhase["phase"]) => TenderWithPhase[];
  tenderExists: (projectName: string) => boolean;
  clearAllTenders: () => void; // För debugging/reset
}

const TenderContext = createContext<TenderContextType | undefined>(undefined);

const STORAGE_KEY = "anbudsgivning_tenders";

// Hjälpfunktioner för localStorage
const loadTendersFromStorage = (): TenderWithPhase[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Konvertera datum-strängar tillbaka till Date-objekt
      return parsed.map((tender: any) => ({
        ...tender,
        addedToPhaseAt: new Date(tender.addedToPhaseAt),
      }));
    }
  } catch (error) {
    console.error("Error loading tenders from localStorage:", error);
    // Rensa korrupt data
    localStorage.removeItem(STORAGE_KEY);
  }

  return [];
};

const saveTendersToStorage = (tenders: TenderWithPhase[]) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenders));
    console.log(`💾 Saved ${tenders.length} tenders to localStorage`);
  } catch (error) {
    console.error("Error saving tenders to localStorage:", error);
  }
};

export function TenderProvider({ children }: { children: ReactNode }) {
  const [tenders, setTenders] = useState<TenderWithPhase[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Ladda data från localStorage när komponenten mountas
  useEffect(() => {
    const loadedTenders = loadTendersFromStorage();
    setTenders(loadedTenders);
    setIsLoaded(true);
    console.log(`📂 Loaded ${loadedTenders.length} tenders from localStorage`);
  }, []);

  // Spara till localStorage när tenders ändras (men inte vid första laddningen)
  useEffect(() => {
    if (isLoaded) {
      saveTendersToStorage(tenders);
    }
  }, [tenders, isLoaded]);

  const addTender = (tender: Tender) => {
    const newTender: TenderWithPhase = {
      ...tender,
      id: `${tender.project_name}-${Date.now()}`,
      phase: "inbox",
      addedToPhaseAt: new Date(),
    };
    setTenders((prev) => {
      const updated = [...prev, newTender];
      console.log(`➕ Added tender: ${newTender.project_name}`);
      return updated;
    });
  };

  const moveTenderToPhase = (
    tenderId: string,
    newPhase: TenderWithPhase["phase"]
  ) => {
    setTenders((prev) =>
      prev.map((tender) => {
        if (tender.id === tenderId) {
          console.log(
            `🔄 Moved tender "${tender.project_name}" from ${tender.phase} to ${newPhase}`
          );
          return { ...tender, phase: newPhase, addedToPhaseAt: new Date() };
        }
        return tender;
      })
    );
  };

  const moveTenderToPreviousPhase = (tenderId: string) => {
    setTenders((prev) =>
      prev.map((tender) => {
        if (tender.id === tenderId) {
          const currentPhase = tender.phase;
          let previousPhase: TenderWithPhase["phase"];

          // Definiera workflow-ordningen
          switch (currentPhase) {
            case "evaluation":
              previousPhase = "inbox";
              break;
            case "drafts":
              previousPhase = "evaluation";
              break;
            case "review":
              previousPhase = "drafts";
              break;
            case "submitted":
              previousPhase = "review";
              break;
            default:
              // Om redan i inbox, gör ingenting
              console.log(
                `⚠️ Cannot move tender "${tender.project_name}" back from ${currentPhase} - already at start`
              );
              return tender;
          }

          console.log(
            `⬅️ Moved tender "${tender.project_name}" back from ${currentPhase} to ${previousPhase}`
          );
          return {
            ...tender,
            phase: previousPhase,
            addedToPhaseAt: new Date(),
          };
        }
        return tender;
      })
    );
  };

  const removeTender = (tenderId: string) => {
    setTenders((prev) => {
      const tenderToRemove = prev.find((t) => t.id === tenderId);
      if (tenderToRemove) {
        console.log(`🗑️ Removed tender: ${tenderToRemove.project_name}`);
      }
      return prev.filter((tender) => tender.id !== tenderId);
    });
  };

  const updateTenderEvaluation = (
    tenderId: string,
    evaluation: TenderWithPhase["evaluation"]
  ) => {
    setTenders((prev) =>
      prev.map((tender) => {
        if (tender.id === tenderId) {
          console.log(`📊 Updated evaluation for: ${tender.project_name}`);
          return { ...tender, evaluation };
        }
        return tender;
      })
    );
  };

  const getTendersByPhase = (phase: TenderWithPhase["phase"]) => {
    return tenders.filter((tender) => tender.phase === phase);
  };

  const tenderExists = (projectName: string) => {
    return tenders.some((tender) => tender.project_name === projectName);
  };

  const clearAllTenders = () => {
    setTenders([]);
    localStorage.removeItem(STORAGE_KEY);
    console.log("🧹 Cleared all tenders from localStorage");
  };

  return (
    <TenderContext.Provider
      value={{
        tenders,
        addTender,
        moveTenderToPhase,
        moveTenderToPreviousPhase,
        removeTender,
        updateTenderEvaluation,
        getTendersByPhase,
        tenderExists,
        clearAllTenders,
      }}
    >
      {children}
    </TenderContext.Provider>
  );
}

export function useTenderContext() {
  const context = useContext(TenderContext);
  if (context === undefined) {
    throw new Error("useTenderContext must be used within a TenderProvider");
  }
  return context;
}
