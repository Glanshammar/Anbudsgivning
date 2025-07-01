"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveCard } from "@/components/ui/ResponsiveCard";
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reviewing</h2>
        <p className="text-gray-600">
          Bids currently under review. Approve to submit or send back for
          editing.
        </p>
      </div>
      <div className="flex-grow flex flex-col gap-4">
        {bids.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No bids currently under review.
          </p>
        ) : (
          bids.map((bid, index) => (
            <ResponsiveCard
              key={bid.id}
              title={bid.title}
              branch={bid.branch}
              description={`Created: ${bid.created_date} | Last edited by: ${bid.author}`}
              badgeText="Reviewing"
              details={[{ label: "Deadline", value: bid.deadline }]}
              onClick={() => handleCardClick(bid)}
            >
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveToReady(bid, index);
                }}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Approve & Submit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveBackToActive(bid, index);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Send Back to Authoring
              </Button>
            </ResponsiveCard>
          ))
        )}
      </div>
    </div>
  );
}
