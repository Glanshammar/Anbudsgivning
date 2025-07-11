"use client";

import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getBidsByState,
  updateBidState,
  BID_STATES,
  type Bid,
} from "@/services/api/bids";

export default function BidsOngoingDialogPage() {
  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBids = async () => {
      try {
        setLoading(true);
        const data = await getBidsByState(BID_STATES.ONGOING_DIALOG);
        setBids(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, []);

  const handleMarkWonLost = async (bid: Bid, index: number) => {
    try {
      await updateBidState(bid.id, BID_STATES.WON_LOST);
      setBids((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to mark as won/lost:", error);
    }
  };

  const handleCardClick = (bid: Bid) => {
    router.push(`/dashboard/projects/dialog/${bid.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading bids...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-grow flex flex-col gap-4">
        {bids.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No bids with ongoing dialog.
          </p>
        ) : (
          bids.map((bid, index) => <BidCard key={bid.id} bid={bid} />)
        )}
      </div>
    </div>
  );
}

const BidCard = ({ bid }: { bid: Bid }) => {
  const router = useRouter();

  const handleCardClick = () => {
    const encodedBidId = encodeURIComponent(bid.id);
    router.push(`/dashboard/projects/ongoing-dialog/${encodedBidId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white p-4 rounded-2xl border-4 border-black/80 shadow-md hover:shadow-xl hover:border-blue-500 transition-all duration-300 cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800">{bid.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{bid.branch}</p>
          <p className="text-xs text-gray-500 mt-1">
            Upphandling: {bid.tender_name}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Dialog since: {bid.last_modified} | Author: {bid.author}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            <span className="font-semibold">Deadline:</span> {bid.deadline}
          </p>
        </div>
      </div>
    </div>
  );
};
