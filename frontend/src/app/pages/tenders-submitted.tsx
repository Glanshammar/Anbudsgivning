"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getTendersByState,
  updateTenderState,
  type Tender,
  TENDER_STATES,
} from "@/services/api/tenders";
import { useRouter } from "next/navigation";

export default function SubmittedTendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const data = await getTendersByState(TENDER_STATES.SENT_BIDS);
        setTenders(data);
      } catch (err) {
        console.error("Error fetching tenders:", err);
        setTenders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, []);

  const handleMoveToWon = async (tender: Tender, index: number) => {
    try {
      // Här kan man lägga till en "vunnen" status i framtiden
      setTenders((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to mark tender as won:", error);
    }
  };

  const handleMoveToLost = async (tender: Tender, index: number) => {
    try {
      // Här kan man lägga till en "förlorad" status i framtiden
      setTenders((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to mark tender as lost:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 h-full flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <p className="text-lg text-gray-500">Loading tenders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {tenders.length > 0 && (
        <div className="flex-grow overflow-y-auto pr-2">
          <div className="space-y-4">
            {tenders.map((tender, index) => (
              <TenderCard
                key={index}
                tender={tender}
                onMoveToWon={() => handleMoveToWon(tender, index)}
                onMoveToLost={() => handleMoveToLost(tender, index)}
              />
            ))}
          </div>
        </div>
      )}

      {tenders.length === 0 && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-lg text-gray-500">
            No submitted bids at the moment.
          </p>
        </div>
      )}
    </div>
  );
}

const TenderCard = ({
  tender,
  onMoveToWon,
  onMoveToLost,
}: {
  tender: Tender;
  onMoveToWon: () => void;
  onMoveToLost: () => void;
}) => {
  const router = useRouter();

  const handleCardClick = () => {
    const encodedTenderName = encodeURIComponent(tender.project_name);
    router.push(`/dashboard/tenders/submitted/${encodedTenderName}`);
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white p-4 rounded-2xl border-4 border-black/80 shadow-md hover:shadow-xl hover:border-blue-500 transition-all duration-300 cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800">
            {tender.project_name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{tender.branch}</p>
          <p className="text-sm text-gray-500 mt-2">
            <span className="font-semibold">Inlämnat:</span>{" "}
            {tender.submission_date || tender.deadline}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => handleButtonClick(e, () => {})}
        >
          Visa anbud
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={(e) => handleButtonClick(e, onMoveToWon)}
        >
          Markera som vunnen
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={(e) => handleButtonClick(e, onMoveToLost)}
        >
          Markera som förlorad
        </Button>
      </div>
    </div>
  );
};
