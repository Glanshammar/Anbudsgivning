"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveCard } from "@/components/ui/ResponsiveCard";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getBidsByState,
  updateBidState,
  updateBidContent,
  BID_STATES,
  type Bid,
} from "@/services/api/bids";

export default function BidsNotStartedPage() {
  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [bidContent, setBidContent] = useState("");

  useEffect(() => {
    const fetchBids = async () => {
      try {
        setLoading(true);
        const data = await getBidsByState(BID_STATES.NOT_STARTED);
        setBids(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, []);

  const handleStartBid = async (bid: Bid) => {
    try {
      // Immediately update the bid state to AUTHORING
      await updateBidState(bid.id, BID_STATES.AUTHORING);

      // Remove the bid from the current list
      setBids((prev) => prev.filter((b) => b.id !== bid.id));

      // Open modal for content editing
      setEditingBid(bid);
      setBidContent(""); // Start with empty content
    } catch (error) {
      console.error("Failed to start bid:", error);
    }
  };

  const handleCloseModal = async () => {
    if (editingBid && bidContent.trim()) {
      try {
        // Save the content to the bid
        await updateBidContent(editingBid.id, bidContent);
        console.log("Saved bid content:", bidContent);
      } catch (error) {
        console.error("Failed to save bid content:", error);
      }
    }

    setEditingBid(null);
    setBidContent("");
  };

  const handleModalClick = (e: React.MouseEvent) => {
    // Close modal when clicking outside
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Started</h2>
        <p className="text-gray-600">
          Bids that haven't been started yet. Click "Start" to begin authoring.
        </p>
      </div>
      <div className="flex-grow flex flex-col gap-4">
        {bids.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No bids waiting to be started.
          </p>
        ) : (
          bids.map((bid, index) => (
            <ResponsiveCard
              key={bid.id}
              title={bid.title}
              branch={bid.branch}
              description={bid.description}
              badgeText="Not Started"
              details={[{ label: "Deadline", value: bid.deadline }]}
            >
              <Button
                size="sm"
                variant="default"
                onClick={() => handleStartBid(bid)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Start
              </Button>
            </ResponsiveCard>
          ))
        )}
      </div>

      {/* Modal for editing bid content */}
      {editingBid && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleModalClick}
        >
          <div
            className="bg-white rounded-lg p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6">
              Authoring: {editingBid.title}
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Industry: {editingBid.branch} | Deadline: {editingBid.deadline}
            </p>

            <div className="mb-6">
              <Textarea
                value={bidContent}
                onChange={(e) => setBidContent(e.target.value)}
                placeholder="Start writing your bid content here..."
                className="w-full h-[600px] resize-none text-base"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
