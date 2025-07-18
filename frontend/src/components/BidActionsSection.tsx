"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getBidById,
  updateBidState,
  updateBidContent,
  discardBid,
  BID_STATES,
  type Bid,
} from "@/services/api/bids";
import CollaborateModal from "@/components/CollaborateModal";
import jsPDF from "jspdf";

interface BidActionsSectionProps {
  bidId: string;
  onTitleUpdate?: (title: string) => void;
}

// Function to format bid content from JSON to readable text
const formatBidContent = (content: string): string => {
  if (!content) return "";

  try {
    const chapters = JSON.parse(content);
    if (Array.isArray(chapters)) {
      return chapters
        .map((chapter) => {
          const title =
            chapter.title || `Chapter ${chapter.id?.replace("ch", "") || ""}`;
          const chapterContent = chapter.content || "";
          return `${title}\n${chapterContent}`;
        })
        .join("\n\n");
    }
  } catch (e) {
    // If content is not valid JSON, return as is
    return content;
  }

  return content;
};

// Function to generate and download file
const downloadBidFile = (bid: Bid, format: "pdf" | "txt") => {
  const formattedContent = formatBidContent(bid.content || "");

  if (format === "pdf") {
    // Create PDF using jsPDF
    const doc = new jsPDF();

    // Set font and size
    doc.setFont("helvetica");
    doc.setFontSize(16);

    // Title
    doc.text("BID DOCUMENT", 20, 20);

    // Project info
    doc.setFontSize(12);
    doc.text(`Project: ${bid.title}`, 20, 35);
    doc.text(`Tender Name: ${bid.tender_name}`, 20, 45);
    doc.text(`Branch: ${bid.branch}`, 20, 55);
    doc.text(`Deadline: ${bid.deadline}`, 20, 65);
    doc.text(
      `Created: ${new Date(bid.created_date).toLocaleDateString()}`,
      20,
      75
    );
    doc.text(`Author: ${bid.author}`, 20, 85);

    // Description
    doc.setFontSize(14);
    doc.text("DESCRIPTION", 20, 105);
    doc.setFontSize(10);

    // Split description into lines that fit the page width
    const descriptionLines = doc.splitTextToSize(bid.description, 170);
    doc.text(descriptionLines, 20, 115);

    // Bid Content
    doc.setFontSize(14);
    doc.text("BID CONTENT", 20, 135 + descriptionLines.length * 5);
    doc.setFontSize(10);

    // Split content into lines that fit the page width
    const contentLines = doc.splitTextToSize(formattedContent, 170);
    doc.text(contentLines, 20, 145 + descriptionLines.length * 5);

    // Save the PDF
    doc.save(`${bid.title.replace(/\s+/g, "_")}_bid.pdf`);
  } else {
    // Create TXT file
    const fileContent = `
BID DOCUMENT

Project: ${bid.title}
Tender Name: ${bid.tender_name}
Branch: ${bid.branch}
Deadline: ${bid.deadline}
Created: ${new Date(bid.created_date).toLocaleDateString()}
Author: ${bid.author}

DESCRIPTION
${bid.description}

BID CONTENT
${formattedContent}
    `.trim();

    // Create blob and download
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bid.title.replace(/\s+/g, "_")}_bid.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

const BidActionsSection: React.FC<BidActionsSectionProps> = ({
  bidId,
  onTitleUpdate,
}) => {
  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);
  const [showAuthoringModal, setShowAuthoringModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [bidContent, setBidContent] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchBid = async () => {
      try {
        setLoading(true);
        const bidData = await getBidById(bidId);
        if (bidData) {
          setBid(bidData);
          setBidContent(bidData.content || "");
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

  const getNextBidState = (currentState: string) => {
    const stateOrder = [
      BID_STATES.NOT_STARTED,
      BID_STATES.AUTHORING,
      BID_STATES.REVIEWING,
      BID_STATES.SUBMITTED,
      BID_STATES.ONGOING_DIALOG,
      BID_STATES.WON_LOST,
    ] as string[];

    const currentIndex = stateOrder.indexOf(currentState);
    return currentIndex < stateOrder.length - 1
      ? stateOrder[currentIndex + 1]
      : null;
  };

  const getBidActionButtonText = (currentState: string) => {
    switch (currentState) {
      case BID_STATES.NOT_STARTED:
        return "Start Authoring";
      case BID_STATES.AUTHORING:
        return "Submit for Review";
      case BID_STATES.REVIEWING:
        return "Submit Bid";
      case BID_STATES.SUBMITTED:
        return "Move to Ongoing Dialog";
      case BID_STATES.ONGOING_DIALOG:
        return "Mark as Won/Lost";
      default:
        return "Next Step";
    }
  };

  const handleMoveBidToNextState = async () => {
    if (!bid) return;

    const nextState = getNextBidState(bid.state);
    if (!nextState) return;

    setUpdating(true);
    try {
      await updateBidState(bid.id, nextState);

      // Navigate to appropriate list page based on new state
      const currentPath = window.location.pathname;
      const pathParts = currentPath.split("/");
      const newStatePath = nextState.toLowerCase().replace("_", "-");

      router.push(`/dashboard/projects/${newStatePath}?t=${Date.now()}`);
    } catch (error) {
      console.error("Failed to update bid state:", error);
      setError("Failed to update bid status");
    } finally {
      setUpdating(false);
    }
  };

  const handleMoveBidToPreviousState = async () => {
    if (!bid) return;

    const stateOrder = [
      BID_STATES.NOT_STARTED,
      BID_STATES.AUTHORING,
      BID_STATES.REVIEWING,
      BID_STATES.SUBMITTED,
      BID_STATES.ONGOING_DIALOG,
      BID_STATES.WON_LOST,
    ] as string[];

    const currentIndex = stateOrder.indexOf(bid.state);
    if (currentIndex <= 0) return;

    const previousState = stateOrder[currentIndex - 1];

    setUpdating(true);
    try {
      await updateBidState(bid.id, previousState);

      // Navigate to appropriate list page based on new state
      const newStatePath = previousState.toLowerCase().replace("_", "-");
      router.push(`/dashboard/projects/${newStatePath}?t=${Date.now()}`);
    } catch (error) {
      console.error("Failed to update bid state:", error);
      setError("Failed to update bid status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDiscardBid = async () => {
    if (!bid) return;

    setUpdating(true);
    try {
      await discardBid(bid.id);
      router.push(`/dashboard/projects/not-started?t=${Date.now()}`);
    } catch (error) {
      console.error("Failed to discard bid:", error);
      setError("Failed to discard bid");
    } finally {
      setUpdating(false);
    }
  };

  const handleEditBid = () => {
    setShowAuthoringModal(true);
  };

  const handleSaveBidContent = async () => {
    if (!bid) return;

    setUpdating(true);
    try {
      await updateBidContent(bid.id, bidContent);
      setShowAuthoringModal(false);
      // Refresh bid data
      const updatedBid = await getBidById(bidId);
      setBid(updatedBid);
    } catch (error) {
      console.error("Failed to save bid content:", error);
      setError("Failed to save bid content");
    } finally {
      setUpdating(false);
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowAuthoringModal(false);
    }
  };

  const handleDownloadModalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowDownloadModal(false);
    }
  };

  const handleDownload = (format: "pdf" | "txt") => {
    if (!bid) return;
    downloadBidFile(bid, format);
    setShowDownloadModal(false);
  };

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
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Actions</h2>

        <div className="flex flex-wrap gap-4 mb-6">
          {/* Show "Discard" button for Not Started, Authoring, and Reviewing states */}
          {(bid.state === BID_STATES.NOT_STARTED ||
            bid.state === BID_STATES.AUTHORING ||
            bid.state === BID_STATES.REVIEWING) && (
            <Button
              variant="outline"
              onClick={handleDiscardBid}
              disabled={updating}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {updating ? "Discarding..." : "Discard"}
            </Button>
          )}

          {/* Show "Move Back" button for states that can go backwards */}
          {bid.state !== BID_STATES.NOT_STARTED &&
            bid.state !== BID_STATES.AUTHORING &&
            bid.state !== BID_STATES.SUBMITTED &&
            bid.state !== BID_STATES.ONGOING_DIALOG &&
            bid.state !== BID_STATES.WON_LOST && (
              <Button
                variant="outline"
                onClick={handleMoveBidToPreviousState}
                disabled={updating}
              >
                {updating ? "Updating..." : "Move Back"}
              </Button>
            )}

          {/* Show Edit button for Authoring state */}
          {bid.state === BID_STATES.AUTHORING && (
            <Button
              variant="outline"
              onClick={handleEditBid}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              Edit
            </Button>
          )}

          {/* Show Download bid button for all states except Not Started */}
          {bid.state !== BID_STATES.NOT_STARTED && (
            <Button
              variant="outline"
              onClick={() => setShowDownloadModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Download bid
            </Button>
          )}

          {/* Show next step button for all states except final state */}
          {getNextBidState(bid.state) && (
            <Button
              onClick={handleMoveBidToNextState}
              disabled={updating}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {updating ? "Updating..." : getBidActionButtonText(bid.state)}
            </Button>
          )}

          {/* Show collaborate button for all states except Won/Lost */}
          {bid.state !== BID_STATES.WON_LOST && (
            <Button
              variant="outline"
              onClick={() => setShowCollaborateModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Collaborate
            </Button>
          )}
        </div>

        {/* Download Format Selection Modal */}
        {showDownloadModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleDownloadModalClick}
          >
            <div
              className="bg-white rounded-lg p-8 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-6">Choose Download Format</h3>
              <p className="text-gray-600 mb-6">
                Select the format you want to download the bid document in:
              </p>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={() => handleDownload("pdf")}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Download as PDF
                </Button>
                <Button
                  onClick={() => handleDownload("txt")}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Download as TXT
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDownloadModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Collaborate Modal */}
        {showCollaborateModal && (
          <CollaborateModal
            isOpen={showCollaborateModal}
            onClose={() => setShowCollaborateModal(false)}
            tenderId={bid.tender_name}
            tenderName={bid.title}
          />
        )}

        {/* Authoring Modal */}
        {showAuthoringModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleModalClick}
          >
            <div
              className="bg-white rounded-lg p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6">
                Authoring: {bid.title}
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Industry: {bid.branch} | Deadline: {bid.deadline}
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

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAuthoringModal(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBidContent}
                  disabled={updating}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {updating ? "Saving..." : "Save Content"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BidActionsSection;
