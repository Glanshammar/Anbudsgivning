"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveCard } from "@/components/ui/ResponsiveCard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getBidsByState,
  updateBidState,
  BID_STATES,
  type Bid,
} from "@/services/api/bids";

export default function BidsSubmittedPage() {
  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBids = async () => {
      try {
        setLoading(true);
        const data = await getBidsByState(BID_STATES.SUBMITTED);
        setBids(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, []);

  const handleMoveToDialog = async (bid: Bid, index: number) => {
    try {
      await updateBidState(bid.id, BID_STATES.ONGOING_DIALOG);
      setBids((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to move to dialog:", error);
    }
  };

  const handleCardClick = (bid: Bid) => {
    router.push(`/dashboard/bids/view/${bid.id}`);
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submitted</h2>
        <p className="text-gray-600">
          Submitted bids waiting for response from the client.
        </p>
      </div>
      <div className="flex-grow flex flex-col gap-4">
        {bids.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No submitted bids.</p>
        ) : (
          bids.map((bid, index) => (
            <ResponsiveCard
              key={bid.id}
              title={bid.title}
              branch={bid.branch}
              description={`Submitted: ${bid.last_modified} | Author: ${bid.author}`}
              badgeText="Submitted"
              details={[{ label: "Deadline", value: bid.deadline }]}
              onClick={() => handleCardClick(bid)}
            >
              <Button size="sm" variant="outline">
                View Bid
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveToDialog(bid, index);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Start Dialog
              </Button>
            </ResponsiveCard>
          ))
        )}
      </div>
    </div>
  );
}
