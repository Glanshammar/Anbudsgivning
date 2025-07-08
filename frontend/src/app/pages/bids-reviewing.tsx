"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getBidsByState,
  updateBidState,
  deleteBid,
  type Bid,
  BID_STATES,
} from "@/services/api/bids";
import { useRouter } from "next/navigation";

export default function BidsReviewingPage() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBids = async () => {
      try {
        setLoading(true);
        const data = await getBidsByState(BID_STATES.REVIEWING);
        setBids(data);
      } catch (err) {
        console.error("Error fetching bids:", err);
        setBids([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, []);

  const handleMoveToReady = async (bid: Bid, index: number) => {
    try {
      await updateBidState(bid.id, BID_STATES.SUBMITTED);
      setBids((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to move bid to ready:", error);
    }
  };

  const handleMoveBackToActive = async (bid: Bid, index: number) => {
    try {
      await updateBidState(bid.id, BID_STATES.AUTHORING);
      setBids((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to move bid back to active:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 h-full flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <p className="text-lg text-gray-500">Loading bids...</p>
        </div>
      </div>
    );
  }

  const handleCardClick = (bid: Bid) => {
    router.push(`/dashboard/bids/review/${bid.id}`);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-grow flex flex-col gap-4">
        {bids.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No bids currently under review.
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
    router.push(`/dashboard/bids/reviewing/${encodedBidId}`);
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
            Created: {bid.created_date} | Last edited by: {bid.author}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            <span className="font-semibold">Deadline:</span> {bid.deadline}
          </p>
        </div>
      </div>
    </div>
  );
};
