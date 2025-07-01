"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveCard } from "@/components/ui/ResponsiveCard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getBidsByState, BID_STATES, type Bid } from "@/services/api/bids";

export default function BidsWonLostPage() {
  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBids = async () => {
      try {
        setLoading(true);
        const data = await getBidsByState(BID_STATES.WON_LOST);
        setBids(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, []);

  const handleCardClick = (bid: Bid) => {
    router.push(`/dashboard/bids/summary/${bid.id}`);
  };

  // Mock function to determine if bid was won or lost (in real app, this would be in the data)
  const getBidResult = (bid: Bid) => {
    // For demo purposes, randomly assign won/lost based on bid id
    return bid.id.endsWith("4") || bid.id.endsWith("6") ? "won" : "lost";
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Won/Lost</h2>
        <p className="text-gray-600">
          Completed bids with known results - won or lost projects.
        </p>
      </div>
      <div className="flex-grow flex flex-col gap-4">
        {bids.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No completed bids.</p>
        ) : (
          bids.map((bid, index) => {
            const result = getBidResult(bid);
            const isWon = result === "won";

            return (
              <ResponsiveCard
                key={bid.id}
                title={bid.title}
                branch={bid.branch}
                description={`Completed: ${bid.last_modified} | Author: ${bid.author}`}
                badgeText={isWon ? "WON" : "LOST"}
                details={[{ label: "Deadline", value: bid.deadline }]}
                onClick={() => handleCardClick(bid)}
              >
                <Button size="sm" variant="outline">
                  View Summary
                </Button>
                {isWon && (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    Manage Contract
                  </Button>
                )}
              </ResponsiveCard>
            );
          })
        )}
      </div>
    </div>
  );
}
