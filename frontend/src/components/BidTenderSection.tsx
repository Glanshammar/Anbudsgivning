"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { getBidById, type Bid } from "@/services/api/bids";

interface BidTenderSectionProps {
  bidId: string;
  onTitleUpdate?: (title: string) => void;
}

const BidTenderSection: React.FC<BidTenderSectionProps> = ({
  bidId,
  onTitleUpdate,
}) => {
  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBid = async () => {
      try {
        setLoading(true);
        const bidData = await getBidById(bidId);
        if (bidData) {
          setBid(bidData);
          if (onTitleUpdate) {
            onTitleUpdate(bidData.title);
          }
        }
      } catch (error) {
        console.error("Failed to fetch bid:", error);
        setError("Failed to load bid data");
      } finally {
        setLoading(false);
      }
    };

    fetchBid();
  }, [bidId, onTitleUpdate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading bid data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
        {error}
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
        No bid data found
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{bid.title}</h1>
        </div>

        {/* Tender Description */}
        <div className="space-y-4">
          <div>
            <Label className="text-lg font-semibold text-gray-800">
              Description
            </Label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                {bid.description || "No description available"}
              </p>
            </div>
          </div>

          {/* Project Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Branch
              </Label>
              <p className="text-gray-800">{bid.branch}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Deadline
              </Label>
              <p className="text-gray-800">{bid.deadline}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Tender Name
              </Label>
              <p className="text-gray-800">{bid.tender_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Created
              </Label>
              <p className="text-gray-800">
                {new Date(bid.created_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidTenderSection;
