"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getTendersByState,
  updateTenderState,
  type Tender,
  TENDER_STATES,
} from "@/services/api/tenders";

export default function PrepareBidPage() {
  const router = useRouter();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const data = await getTendersByState(TENDER_STATES.SKA_BJUDAS_PA);
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
              <TenderCard key={index} tender={tender} />
            ))}
          </div>
        </div>
      )}

      {tenders.length === 0 && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-lg text-gray-500">
            No tenders to bid on at the moment.
          </p>
        </div>
      )}
    </div>
  );
}

const TenderCard = ({ tender }: { tender: Tender }) => {
  const router = useRouter();

  const handleCardClick = () => {
    const encodedTenderName = encodeURIComponent(tender.project_name);
    router.push(`/dashboard/tenders/prepare-bid/${encodedTenderName}`);
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
            <span className="font-semibold">Deadline:</span> {tender.deadline}
          </p>
        </div>
      </div>
    </div>
  );
};
