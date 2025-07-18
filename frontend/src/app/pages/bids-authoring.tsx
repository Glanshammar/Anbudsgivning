"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getBidsByState,
  updateBidState,
  updateBidContent,
  discardBid,
  type Bid,
  BID_STATES,
} from "@/services/api/bids";
import { useRouter } from "next/navigation";

export default function BidsAuthoringPage() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [bidContent, setBidContent] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchBids = async () => {
      try {
        setLoading(true);
        const data = await getBidsByState(BID_STATES.AUTHORING);
        console.log("Fetched bids data:", data); // Debug: see what data we get
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

  const handleEditBid = (bid: Bid) => {
    setEditingBid(bid);
    setBidContent(bid.content || "");
  };

  const handleSendForReview = async (bid: Bid, index: number) => {
    try {
      await updateBidState(bid.id, BID_STATES.REVIEWING);
      setBids((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to send bid for review:", error);
    }
  };

  const handleDiscardBid = async (bid: Bid, index: number) => {
    try {
      await discardBid(bid.id);
      setBids((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to discard bid:", error);
    }
  };

  const handleCloseModal = async () => {
    if (editingBid && bidContent.trim()) {
      try {
        await updateBidContent(editingBid.id, bidContent);

        // Update the local state
        setBids((prev) =>
          prev.map((bid) =>
            bid.id === editingBid.id ? { ...bid, content: bidContent } : bid
          )
        );
      } catch (error) {
        console.error("Failed to auto-save bid content:", error);
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
      <div className="p-6 h-full flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <p className="text-lg text-gray-500">Loading bids...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-grow flex flex-col gap-4">
        {bids.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No bids currently being authored.
          </p>
        ) : (
          bids.map((bid, index) => <BidCard key={bid.id} bid={bid} />)
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
              Edit Bid: {editingBid.title}
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Industry: {editingBid.branch} | Deadline: {editingBid.deadline}
            </p>

            <div className="mb-6">
              <Textarea
                value={bidContent}
                onChange={(e) => setBidContent(e.target.value)}
                placeholder="Write your bid content here..."
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

const BidCard = ({ bid }: { bid: Bid }) => {
  const router = useRouter();

  const handleCardClick = () => {
    const encodedBidId = encodeURIComponent(bid.id);
    router.push(`/dashboard/projects/authoring/${encodedBidId}`);
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
          {bid.content && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {bid.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
