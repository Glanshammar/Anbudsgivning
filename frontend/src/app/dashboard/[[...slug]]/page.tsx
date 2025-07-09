"use client";

import { useRouter, useParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import navigationData from "@/navigation.json";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tender,
  getTendersByState,
  updateTenderState,
  addTenderState,
  deleteTender,
  TENDER_STATES,
  TENDER_STATE_LABELS,
} from "@/services/api/tenders";
import {
  createBid,
  getBidsByState,
  getBidByTenderName,
  getBidById,
  updateBidState,
  updateBidContent,
  deleteBid,
  BID_STATES,
  BID_STATE_LABELS,
  type Bid,
} from "@/services/api/bids";
import Checklist from "../../pages/checklist";
import CollaborateModal from "@/components/CollaborateModal";

// --- Page Imports ---
import UserProfilePage from "../../pages/userprofile";
import CalendarPage from "../../pages/calendar";
import DocumentsPage from "../../pages/documents";
import HelpPage from "../../pages/help";
import NotificationsPage from "../../pages/notifications";
import StatisticsPage from "../../pages/statistics";
import TendersInboxPage from "../../pages/tenders-inbox";
import TendersUnderUtredningPage from "../../pages/tenders-under-utredning";
import TendersPrepareBidPage from "../../pages/tenders-prepare-bid";
import TendersSubmittedPage from "../../pages/tenders-submitted";

import BidsNotStartedPage from "../../pages/bids-not-started";
import BidsAuthoringPage from "../../pages/bids-authoring";
import BidsReviewingPage from "../../pages/bids-reviewing";
import BidsSubmittedPage from "../../pages/bids-submitted";
import BidsOngoingDialogPage from "../../pages/bids-ongoing-dialog";
import BidsWonLostPage from "../../pages/bids-won-lost";

/**
 * Tender Detail Component - Displays individual tender information with state management
 * Handles tender workflow transitions and bid document creation
 */
const TenderDetailPage = ({ tenderName }: { tenderName: string }) => {
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchTenderDetails = async () => {
      try {
        setLoading(true);
        // Search across all states to find the tender (supports multi-state system)
        const allStates = Object.values(TENDER_STATES);
        let foundTender: Tender | null = null;

        for (const state of allStates) {
          const tenders = await getTendersByState(state);
          foundTender =
            tenders.find(
              (t) => encodeURIComponent(t.project_name) === tenderName
            ) || null;
          if (foundTender) break;
        }

        setTender(foundTender);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch tender details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTenderDetails();
  }, [tenderName]);

  /**
   * Defines the workflow progression for tenders
   * Each state has a logical next step in the process
   */
  const getNextState = (currentState: string) => {
    switch (currentState) {
      case TENDER_STATES.NYINKOMMET:
        return TENDER_STATES.UNDER_UTREDNING;
      case TENDER_STATES.UNDER_UTREDNING:
        return TENDER_STATES.SKA_BJUDAS_PA;
      case TENDER_STATES.SKA_BJUDAS_PA:
        return TENDER_STATES.BID_AUTHORING;
      case TENDER_STATES.BID_AUTHORING:
        return TENDER_STATES.SENT_BIDS;
      default:
        return null;
    }
  };

  // Function to get the next state label
  const getNextStateLabel = (currentState: string) => {
    const nextState = getNextState(currentState);
    return nextState
      ? TENDER_STATE_LABELS[nextState as keyof typeof TENDER_STATE_LABELS]
      : null;
  };

  // Function to get action button text based on current state
  const getActionButtonText = (currentState: string) => {
    switch (currentState) {
      case TENDER_STATES.NYINKOMMET:
        return "Review";
      case TENDER_STATES.UNDER_UTREDNING:
        return "Prepare Bid";
      case TENDER_STATES.BID_AUTHORING:
        return "Submit Bid";
      default:
        return "Next Step";
    }
  };

  /**
   * Handles tender state transitions with special logic for bid authoring
   * When moving to BID_AUTHORING, uses addTenderState to maintain multi-state visibility
   */
  const handleMoveToNextState = async () => {
    if (!tender) return;

    const nextState = getNextState(tender.state);
    if (!nextState) return;

    setUpdating(true);
    try {
      // Special handling for BID_AUTHORING state - maintain visibility in both states
      if (nextState === TENDER_STATES.BID_AUTHORING) {
        await addTenderState(tender.project_name, nextState as any);

        // Create corresponding bid document for authoring workflow
        await createBid(
          tender.project_name,
          tender.description,
          tender.deadline,
          tender.branch
        );

        console.log("Created bid document for tender:", tender.project_name);
      } else {
        await updateTenderState(tender.project_name, nextState as any);
      }

      // Navigate to appropriate tender detail page based on new state (same as bid behavior)
      const tenderIdEncoded = encodeURIComponent(tender.project_name);
      if (nextState === TENDER_STATES.UNDER_UTREDNING) {
        router.push(
          `/dashboard/tenders/under-utredning/${tenderIdEncoded}?t=${Date.now()}`
        );
      } else if (nextState === TENDER_STATES.SKA_BJUDAS_PA) {
        router.push(
          `/dashboard/tenders/prepare-bid/${tenderIdEncoded}?t=${Date.now()}`
        );
      } else if (nextState === TENDER_STATES.BID_AUTHORING) {
        router.push(`/dashboard/bids/not-started`);
      } else if (nextState === TENDER_STATES.SENT_BIDS) {
        router.push(
          `/dashboard/tenders/submitted/${tenderIdEncoded}?t=${Date.now()}`
        );
      }
    } catch (error) {
      console.error("Failed to update tender state:", error);
      setError("Failed to update tender status");
    } finally {
      setUpdating(false);
    }
  };

  // Function to handle moving back to previous state
  const handleMoveToPreviousState = async () => {
    if (!tender) return;

    let previousState: string | null = null;
    switch (tender.state) {
      case TENDER_STATES.SKA_BJUDAS_PA:
        previousState = TENDER_STATES.UNDER_UTREDNING;
        break;
      case TENDER_STATES.BID_AUTHORING:
        previousState = TENDER_STATES.SKA_BJUDAS_PA;
        break;
    }

    if (!previousState) return;

    setUpdating(true);
    try {
      await updateTenderState(tender.project_name, previousState as any);

      // Navigate to appropriate tender detail page based on previous state (same as bid behavior)
      const tenderIdEncoded = encodeURIComponent(tender.project_name);
      if (previousState === TENDER_STATES.UNDER_UTREDNING) {
        router.push(
          `/dashboard/tenders/under-utredning/${tenderIdEncoded}?t=${Date.now()}`
        );
      } else if (previousState === TENDER_STATES.SKA_BJUDAS_PA) {
        router.push(
          `/dashboard/tenders/prepare-bid/${tenderIdEncoded}?t=${Date.now()}`
        );
      }
    } catch (error) {
      console.error("Failed to update tender state:", error);
      setError("Failed to update tender status");
    } finally {
      setUpdating(false);
    }
  };

  // Function to handle rejecting/declining a tender
  const handleRejectTender = async () => {
    if (!tender) return;

    setUpdating(true);
    try {
      // Use the new deleteTender API function
      await deleteTender(tender.project_name);

      // Navigate back to appropriate list page (since tender is deleted)
      if (tender.state === TENDER_STATES.UNDER_UTREDNING) {
        router.push(`/dashboard/tenders/under-utredning?t=${Date.now()}`);
      } else if (tender.state === TENDER_STATES.SKA_BJUDAS_PA) {
        router.push(`/dashboard/tenders/prepare-bid?t=${Date.now()}`);
      } else {
        router.push(`/dashboard/tenders/inbox?t=${Date.now()}`);
      }
    } catch (error) {
      console.error("Failed to reject tender:", error);
      setError("Could not decline tender");
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Creates or navigates to existing bid document
   * Provides seamless integration between tender and bid workflows
   */
  const handleCreateBidDocument = async () => {
    if (!tender) return;

    setUpdating(true);
    try {
      // Check if bid document already exists to avoid duplicates
      const existingBid = await getBidByTenderName(tender.project_name);

      if (existingBid) {
        // Navigate to existing bid based on its current state
        console.log("Found existing bid document:", existingBid);

        // Route to appropriate bid detail page
        const bidId = encodeURIComponent(existingBid.id);
        switch (existingBid.state) {
          case BID_STATES.NOT_STARTED:
            router.push(`/dashboard/bids/not-started/${bidId}`);
            break;
          case BID_STATES.AUTHORING:
            router.push(`/dashboard/bids/authoring/${bidId}`);
            break;
          case BID_STATES.REVIEWING:
            router.push(`/dashboard/bids/reviewing/${bidId}`);
            break;
          case BID_STATES.SUBMITTED:
            router.push(`/dashboard/bids/submitted/${bidId}`);
            break;
          case BID_STATES.ONGOING_DIALOG:
            router.push(`/dashboard/bids/ongoing-dialog/${bidId}`);
            break;
          case BID_STATES.WON_LOST:
            router.push(`/dashboard/bids/won-lost/${bidId}`);
            break;
          default:
            router.push(`/dashboard/bids/not-started/${bidId}`);
        }
      } else {
        // Create new bid document and navigate to it
        const newBid = await createBid(
          tender.project_name,
          tender.description,
          tender.deadline,
          tender.branch
        );

        console.log("Created new bid document:", newBid);
        const bidId = encodeURIComponent(newBid.id);
        router.push(`/dashboard/bids/not-started/${bidId}`);
      }
    } catch (error) {
      console.error("Failed to create/link to bid document:", error);
      setError("Failed to create/link to bid document");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 h-full flex flex-col">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Loading tender details...
          </h1>
        </header>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="p-6 h-full flex flex-col">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Tender Not Found</h1>
        </header>
        <div className="text-red-500">
          <p>{error || "Could not find tender"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex-grow overflow-y-auto">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {tender.project_name}
          </h1>
          <p className="text-gray-600 mb-6">{tender.branch}</p>

          <h2 className="text-xl font-bold text-gray-800 mb-4">Description</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            {tender.description}
          </p>

          <h2 className="text-xl font-bold text-gray-800 mb-4">Information</h2>
          <div className="flex gap-4 mb-6 scroll-horizontal">
            <div className="flex-shrink-0 w-80">
              <p className="text-sm font-semibold text-gray-600">Status</p>
              <p className="text-gray-800">
                {TENDER_STATE_LABELS[
                  tender.state as keyof typeof TENDER_STATE_LABELS
                ] || tender.state}
              </p>
            </div>
            <div className="flex-shrink-0 w-80">
              <p className="text-sm font-semibold text-gray-600">Deadline</p>
              <p className="text-gray-800">{tender.deadline}</p>
            </div>
            {tender.start_date && (
              <div className="flex-shrink-0 w-80">
                <p className="text-sm font-semibold text-gray-600">
                  Start Date
                </p>
                <p className="text-gray-800">{tender.start_date}</p>
              </div>
            )}
            {tender.end_date && (
              <div className="flex-shrink-0 w-80">
                <p className="text-sm font-semibold text-gray-600">End Date</p>
                <p className="text-gray-800">{tender.end_date}</p>
              </div>
            )}
            {tender.submission_date && (
              <div className="flex-shrink-0 w-80">
                <p className="text-sm font-semibold text-gray-600">
                  Submission Date
                </p>
                <p className="text-gray-800">{tender.submission_date}</p>
              </div>
            )}
          </div>

          {tender.bid_data && Object.keys(tender.bid_data).length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Bid Data</h2>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(tender.bid_data, null, 2)}
              </pre>
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-800 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Show "Avstå" button for Under utredning state */}
            {tender.state === TENDER_STATES.UNDER_UTREDNING && (
              <Button
                variant="destructive"
                onClick={handleRejectTender}
                disabled={updating}
              >
                {updating ? "Updating..." : "Decline"}
              </Button>
            )}

            {/* Show "Move Back" button for other states (not Inbox, Under Review, or Sent bids) */}
            {tender.state !== TENDER_STATES.NYINKOMMET &&
              tender.state !== TENDER_STATES.UNDER_UTREDNING &&
              tender.state !== TENDER_STATES.SENT_BIDS && (
                <Button
                  variant="outline"
                  onClick={handleMoveToPreviousState}
                  disabled={updating}
                >
                  {updating ? "Updating..." : "Move Back"}
                </Button>
              )}

            {getNextState(tender.state) &&
              tender.state !== TENDER_STATES.SKA_BJUDAS_PA && (
                <Button
                  onClick={handleMoveToNextState}
                  disabled={updating}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {updating ? "Updating..." : getActionButtonText(tender.state)}
                </Button>
              )}

            {tender.tender_document_link &&
              tender.tender_document_link !== "#" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(tender.tender_document_link, "_blank")
                  }
                >
                  View Document
                </Button>
              )}

            {tender.state === TENDER_STATES.UNDER_UTREDNING && (
              <Button
                variant="outline"
                onClick={() => setShowChecklist(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                Checklist
              </Button>
            )}

            {(tender.state === TENDER_STATES.UNDER_UTREDNING ||
              tender.state === TENDER_STATES.SKA_BJUDAS_PA) && (
              <Button
                variant="outline"
                onClick={() => setShowCollaborateModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Collaborate
              </Button>
            )}

            {tender.state === TENDER_STATES.SKA_BJUDAS_PA && (
              <Button
                variant="outline"
                onClick={handleCreateBidDocument}
                disabled={updating}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {updating ? "Creating..." : "Jump to Bid"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showChecklist && (
        <Checklist
          tenderName={tender.project_name}
          onClose={() => setShowChecklist(false)}
        />
      )}

      {showCollaborateModal && (
        <CollaborateModal
          isOpen={showCollaborateModal}
          onClose={() => setShowCollaborateModal(false)}
          tenderId={tender.project_name}
          tenderName={tender.project_name}
        />
      )}
    </div>
  );
};

/**
 * Bid Detail Component - Displays individual bid information with state management
 * Handles bid workflow transitions through authoring lifecycle
 */
const BidDetailPage = ({
  bidId,
  onTitleUpdate,
}: {
  bidId: string;
  onTitleUpdate?: (title: string) => void;
}) => {
  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);
  const [showAuthoringModal, setShowAuthoringModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [bidContent, setBidContent] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchBidDetails = async () => {
      try {
        setLoading(true);
        const foundBid = await getBidById(decodeURIComponent(bidId));
        setBid(foundBid);

        // Update the navigation title when bid data is loaded
        if (foundBid && onTitleUpdate) {
          onTitleUpdate(foundBid.tender_name);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch bid details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBidDetails();
  }, [bidId]);

  /**
   * Defines the workflow progression for bids
   * Each state has a logical next step in the authoring process
   */
  const getNextBidState = (currentState: string) => {
    switch (currentState) {
      case BID_STATES.NOT_STARTED:
        return BID_STATES.AUTHORING;
      case BID_STATES.AUTHORING:
        return BID_STATES.REVIEWING;
      case BID_STATES.REVIEWING:
        return BID_STATES.SUBMITTED;
      case BID_STATES.SUBMITTED:
        return BID_STATES.ONGOING_DIALOG;
      case BID_STATES.ONGOING_DIALOG:
        return BID_STATES.WON_LOST;
      default:
        return null;
    }
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
        return "Start Dialog";
      case BID_STATES.ONGOING_DIALOG:
        return "Mark as Won/Lost";
      default:
        return "Next Step";
    }
  };

  /**
   * Handles starting authoring for NOT_STARTED bids by opening modal
   */
  const handleStartAuthoring = async () => {
    if (!bid) return;

    setUpdating(true);
    try {
      // Update bid state to AUTHORING
      await updateBidState(bid.id, BID_STATES.AUTHORING);

      // Open modal for content editing
      setShowAuthoringModal(true);
      setBidContent(bid.content || ""); // Start with existing content or empty
    } catch (error) {
      console.error("Failed to start authoring:", error);
      setError("Failed to start authoring");
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Handles saving content and closing the authoring modal
   */
  const handleCloseAuthoringModal = async () => {
    if (bid && bidContent.trim()) {
      try {
        // Save the content to the bid
        await updateBidContent(bid.id, bidContent);
        console.log("Saved bid content:", bidContent);
      } catch (error) {
        console.error("Failed to save bid content:", error);
      }
    }

    setShowAuthoringModal(false);
    setBidContent("");

    // Navigate to authoring page
    if (bid) {
      const bidIdEncoded = encodeURIComponent(bid.id);
      router.push(`/dashboard/bids/authoring/${bidIdEncoded}?t=${Date.now()}`);
    }
  };

  /**
   * Handles opening the edit modal for authoring bids
   */
  const handleEditBid = () => {
    if (!bid) return;
    setShowEditModal(true);
    setBidContent(bid.content || "");
  };

  /**
   * Handles saving content and closing the edit modal
   */
  const handleCloseEditModal = async () => {
    if (bid && bidContent.trim()) {
      try {
        // Save the content to the bid
        await updateBidContent(bid.id, bidContent);
        console.log("Saved bid content:", bidContent);

        // Update local bid state to reflect the new content
        setBid((prev) => (prev ? { ...prev, content: bidContent } : null));
      } catch (error) {
        console.error("Failed to save bid content:", error);
        setError("Failed to save bid content");
      }
    }

    setShowEditModal(false);
    setBidContent("");
  };

  /**
   * Handles clicking outside the modal to close it
   */
  const handleModalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseAuthoringModal();
    }
  };

  /**
   * Handles clicking outside the edit modal to close it
   */
  const handleEditModalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseEditModal();
    }
  };

  /**
   * Handles bid state transitions through the authoring workflow
   */
  const handleMoveBidToNextState = async () => {
    if (!bid) return;

    // Special handling for NOT_STARTED state - open modal instead of direct transition
    if (bid.state === BID_STATES.NOT_STARTED) {
      handleStartAuthoring();
      return;
    }

    const nextState = getNextBidState(bid.state);
    if (!nextState) return;

    setUpdating(true);
    try {
      await updateBidState(bid.id, nextState);

      // Navigate to appropriate bid detail page based on new state
      const bidIdEncoded = encodeURIComponent(bid.id);
      switch (nextState) {
        case BID_STATES.AUTHORING:
          router.push(
            `/dashboard/bids/authoring/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
        case BID_STATES.REVIEWING:
          router.push(
            `/dashboard/bids/reviewing/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
        case BID_STATES.SUBMITTED:
          router.push(
            `/dashboard/bids/submitted/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
        case BID_STATES.ONGOING_DIALOG:
          router.push(
            `/dashboard/bids/ongoing-dialog/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
        case BID_STATES.WON_LOST:
          router.push(
            `/dashboard/bids/won-lost/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
        default:
          router.push(
            `/dashboard/bids/not-started/${bidIdEncoded}?t=${Date.now()}`
          );
      }
    } catch (error) {
      console.error("Failed to update bid state:", error);
      setError("Failed to update bid status");
    } finally {
      setUpdating(false);
    }
  };

  const handleMoveBidToPreviousState = async () => {
    if (!bid) return;

    let previousState: string | null = null;
    switch (bid.state) {
      case BID_STATES.AUTHORING:
        previousState = BID_STATES.NOT_STARTED;
        break;
      case BID_STATES.REVIEWING:
        previousState = BID_STATES.AUTHORING;
        break;
      case BID_STATES.SUBMITTED:
        previousState = BID_STATES.REVIEWING;
        break;
      case BID_STATES.ONGOING_DIALOG:
        previousState = BID_STATES.SUBMITTED;
        break;
    }

    if (!previousState) return;

    setUpdating(true);
    try {
      await updateBidState(bid.id, previousState);

      // Navigate to appropriate bid detail page based on previous state
      const bidIdEncoded = encodeURIComponent(bid.id);
      switch (previousState) {
        case BID_STATES.NOT_STARTED:
          router.push(
            `/dashboard/bids/not-started/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
        case BID_STATES.AUTHORING:
          router.push(
            `/dashboard/bids/authoring/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
        case BID_STATES.REVIEWING:
          router.push(
            `/dashboard/bids/reviewing/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
        case BID_STATES.SUBMITTED:
          router.push(
            `/dashboard/bids/submitted/${bidIdEncoded}?t=${Date.now()}`
          );
          break;
      }
    } catch (error) {
      console.error("Failed to update bid state:", error);
      setError("Failed to update bid status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteBid = async () => {
    if (!bid) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the bid "${bid.title}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setUpdating(true);
    try {
      await deleteBid(bid.id);

      // Navigate back to the authoring bids list after deletion
      router.push(`/dashboard/bids/authoring?t=${Date.now()}`);
    } catch (error) {
      console.error("Failed to delete bid:", error);
      setError("Failed to delete bid");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 h-full flex flex-col">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Loading bid details...
          </h1>
        </header>
      </div>
    );
  }

  if (error || !bid) {
    return (
      <div className="p-6 h-full flex flex-col">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Bid Not Found</h1>
        </header>
        <div className="text-red-500">
          <p>{error || "Could not find bid"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex-grow overflow-y-auto">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{bid.title}</h1>
          <p className="text-gray-600 mb-2">{bid.branch}</p>
          <p className="text-sm text-gray-500 mb-6">
            Upphandling: {bid.tender_name}
          </p>

          <h2 className="text-xl font-bold text-gray-800 mb-4">Description</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            {bid.description}
          </p>

          {bid.content && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Bid Content
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 leading-relaxed">{bid.content}</p>
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-800 mb-4">Information</h2>
          <div className="flex gap-4 mb-6 scroll-horizontal">
            <div className="flex-shrink-0 w-80">
              <p className="text-sm font-semibold text-gray-600">Status</p>
              <p className="text-gray-800">
                {BID_STATE_LABELS[bid.state as keyof typeof BID_STATE_LABELS] ||
                  bid.state}
              </p>
            </div>
            <div className="flex-shrink-0 w-80">
              <p className="text-sm font-semibold text-gray-600">Deadline</p>
              <p className="text-gray-800">{bid.deadline}</p>
            </div>
            <div className="flex-shrink-0 w-80">
              <p className="text-sm font-semibold text-gray-600">
                Created Date
              </p>
              <p className="text-gray-800">{bid.created_date}</p>
            </div>
            <div className="flex-shrink-0 w-80">
              <p className="text-sm font-semibold text-gray-600">
                Last Modified
              </p>
              <p className="text-gray-800">{bid.last_modified}</p>
            </div>
            <div className="flex-shrink-0 w-80">
              <p className="text-sm font-semibold text-gray-600">Author</p>
              <p className="text-gray-800">{bid.author}</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Show "Delete" button for Authoring state */}
            {bid.state === BID_STATES.AUTHORING && (
              <Button
                variant="outline"
                onClick={handleDeleteBid}
                disabled={updating}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {updating ? "Deleting..." : "Delete"}
              </Button>
            )}

            {/* Show "Move Back" button for other states that can go backwards (except Not Started, Authoring, and Won/Lost) */}
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
            <Button
              variant="outline"
              onClick={() => setShowCollaborateModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Collaborate
            </Button>
          </div>
        </div>
      </div>

      {showCollaborateModal && (
        <CollaborateModal
          isOpen={showCollaborateModal}
          onClose={() => setShowCollaborateModal(false)}
          tenderId={bid.tender_name}
          tenderName={bid.title}
        />
      )}

      {/* Modal for authoring bid content */}
      {showAuthoringModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleModalClick}
        >
          <div
            className="bg-white rounded-lg p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6">Authoring: {bid.title}</h3>
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
              <Button variant="outline" onClick={handleCloseAuthoringModal}>
                Save & Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for editing bid content */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleEditModalClick}
        >
          <div
            className="bg-white rounded-lg p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6">Edit Bid: {bid.title}</h3>
            <p className="text-lg text-gray-600 mb-6">
              Industry: {bid.branch} | Deadline: {bid.deadline}
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

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={handleCloseEditModal}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Component Map - Maps route paths to their corresponding React components
 * Enables dynamic component rendering based on URL structure
 */
const componentMap: { [key: string]: React.ComponentType<any> } = {
  "tenders/inbox": TendersInboxPage,
  "tenders/under-utredning": TendersUnderUtredningPage,
  "tenders/prepare-bid": TendersPrepareBidPage,
  "tenders/submitted": TendersSubmittedPage,

  "bids/not-started": BidsNotStartedPage,
  "bids/authoring": BidsAuthoringPage,
  "bids/reviewing": BidsReviewingPage,
  "bids/submitted": BidsSubmittedPage,
  "bids/ongoing-dialog": BidsOngoingDialogPage,
  "bids/won-lost": BidsWonLostPage,
  documents: DocumentsPage,
  statistics: StatisticsPage,
  calendar: CalendarPage,
  notifications: NotificationsPage,
  help: HelpPage,
  userprofile: UserProfilePage,
};

/**
 * Data Fetching Map - Associates routes with their data fetching functions
 * Automatically loads appropriate data for each section
 */
const dataFetcherMap: { [key: string]: () => Promise<any[]> } = {
  "tenders/inbox": () => getTendersByState(TENDER_STATES.NYINKOMMET),
  "tenders/under-utredning": () =>
    getTendersByState(TENDER_STATES.UNDER_UTREDNING),
  "tenders/prepare-bid": () => getTendersByState(TENDER_STATES.SKA_BJUDAS_PA),
  "tenders/submitted": () => getTendersByState(TENDER_STATES.SENT_BIDS),
  "bids/not-started": () => getBidsByState(BID_STATES.NOT_STARTED),
  "bids/authoring": () => getBidsByState(BID_STATES.AUTHORING),
  "bids/reviewing": () => getBidsByState(BID_STATES.REVIEWING),
  "bids/submitted": () => getBidsByState(BID_STATES.SUBMITTED),
  "bids/ongoing-dialog": () => getBidsByState(BID_STATES.ONGOING_DIALOG),
  "bids/won-lost": () => getBidsByState(BID_STATES.WON_LOST),
};

interface NavItem {
  title: string;
  path: string;
  description?: string;
  children?: NavItem[];
}

/**
 * Navigation Card Component - Renders both navigation items and data items
 * Handles clicks for both navigation and individual item selection
 */
const NavCard = ({
  item,
  path,
  data,
  isActive,
  isShrunken,
  isAlone,
  basePath,
}: {
  item: NavItem;
  path: string;
  data?: any[];
  isActive: boolean;
  isShrunken: boolean;
  isAlone?: boolean;
  basePath?: string;
}) => {
  const router = useRouter();
  const baseClasses =
    "border-4 rounded-3xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center";
  const activeClasses = isActive
    ? "border-blue-500 shadow-2xl"
    : "border-black/80 shadow-lg hover:shadow-2xl hover:border-blue-500";

  // Check if this is the main dashboard (no sub-path)
  const isMainDashboard = basePath === "/dashboard";

  // Responsive padding and width logic
  const layoutClasses = isShrunken
    ? "p-2 bg-white flex-1 justify-center h-auto min-h-[60px]" // Minimal padding for mobile rows
    : isAlone
    ? "p-6 bg-white justify-start h-full w-full" // Full height and width for alone cards
    : isMainDashboard
    ? "p-6 bg-white justify-start flex-shrink-0 w-80 min-h-[500px] h-full" // Fixed width for main dashboard uniformity
    : "p-6 bg-white justify-start flex-1 min-h-[500px] h-full"; // Flexible width for sub-pages

  const handleTenderClick = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();

    // Check if this is a Bid object or Tender object
    const isBid = item.title && item.tender_name;

    if (isBid) {
      // For bids, navigate to bid detail page
      const bidId = encodeURIComponent(item.id);
      router.push(`${path}/${bidId}`);
    } else {
      // For tenders, navigate to tender detail page
      const tenderId = encodeURIComponent(item.project_name);
      router.push(`${path}/${tenderId}`);
    }
  };

  return (
    <div
      onClick={() => router.push(path)}
      className={`${baseClasses} ${activeClasses} ${layoutClasses}`}
    >
      <div className="flex-shrink-0 text-center w-full">
        <h2
          className={`${
            isShrunken ? "text-sm" : "text-2xl"
          } font-semibold text-gray-800`}
        >
          {item.title}
        </h2>
        {!isShrunken && item.description && (
          <p className="text-gray-500 text-base mt-2">{item.description}</p>
        )}
      </div>

      {!isShrunken && data && data.length > 0 && (
        <div className="w-full flex-1 mt-4 pt-4 border-t-2 min-h-0 overflow-y-auto">
          <div className="space-y-4">
            {data.map((item: any, index) => {
              // Check if this is a Bid object or Tender object
              const isBid = item.title && item.tender_name;
              const displayTitle = isBid ? item.title : item.project_name;
              const displaySubtitle = isBid
                ? `Upphandling: ${item.tender_name}`
                : null;

              return (
                <div
                  key={index}
                  onClick={(e) => handleTenderClick(e, item)}
                  className="bg-gray-50 p-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-gray-100 cursor-pointer text-left"
                >
                  <h3 className="font-semibold text-gray-900">
                    {displayTitle}
                  </h3>
                  {displaySubtitle && (
                    <p className="text-xs text-gray-600 mt-1">
                      {displaySubtitle}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">{item.branch}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Deadline: {item.deadline}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const NavigationLevel = ({
  items,
  basePath,
  activeSegment,
  isShrunken,
}: {
  items: NavItem[];
  basePath: string;
  activeSegment: string | undefined;
  isShrunken: boolean;
}) => {
  const [visibleItems, setVisibleItems] = useState<NavItem[]>([]);
  const [cardData, setCardData] = useState<Map<string, any[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAndFilter = async () => {
      setIsLoading(true);

      const itemPromises = items.map(async (item) => {
        const pathSegments = basePath
          .replace("/dashboard", "")
          .split("/")
          .filter(Boolean);
        pathSegments.push(item.path);
        const fullPath = pathSegments.join("/");
        const fetcher = dataFetcherMap[fullPath];

        // Always show categories that have children
        if (item.children) {
          return { item, isVisible: true, data: undefined };
        }

        // If there's no specific fetcher, it's a simple link, so it should be visible
        if (!fetcher) {
          return { item, isVisible: true, data: undefined };
        }

        // If there is a fetcher, check if it returns data
        try {
          const data = await fetcher();
          return { item, isVisible: data.length > 0, data };
        } catch (error) {
          console.error(`Failed to fetch data for ${fullPath}:`, error);
          return { item, isVisible: false, data: [] };
        }
      });

      const results = await Promise.all(itemPromises);

      const newVisibleItems: NavItem[] = [];
      const newCardData = new Map<string, any[]>();

      results.forEach((result) => {
        if (result.isVisible) {
          newVisibleItems.push(result.item);
          if (result.data) {
            newCardData.set(result.item.path, result.data);
          }
        }
      });

      setVisibleItems(newVisibleItems);
      setCardData(newCardData);
      setIsLoading(false);
    };

    if (!isShrunken) {
      fetchAndFilter();
    } else {
      setVisibleItems(items);
      setIsLoading(false);
    }
  }, [items, basePath, isShrunken]);

  const containerClasses = isShrunken
    ? "flex-shrink-0 p-2 bg-gray-100 border-b-2 border-gray-200" // Reduced padding for mobile rows
    : "flex-1 p-6 bg-gray-50"; // Normal padding for main dashboard

  const flexClasses = isShrunken
    ? "flex w-full h-full gap-2" // Minimal gap for mobile rows
    : "flex w-full h-full gap-4 scroll-horizontal";

  if (isLoading) {
    return (
      <div className={`${containerClasses} flex items-center justify-center`}>
        <p className="text-gray-500">Loading navigation...</p>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={flexClasses}>
        {visibleItems.map((item) => (
          <NavCard
            key={item.path}
            item={item}
            path={`${basePath}/${item.path}`}
            data={cardData.get(item.path)}
            isActive={item.path === activeSegment}
            isShrunken={isShrunken}
            isAlone={!isShrunken && visibleItems.length === 1}
            basePath={basePath}
          />
        ))}
      </div>
    </div>
  );
};

export default function DynamicDashboardPage() {
  const params = useParams();
  const slug = (params.slug as string[]) || [];
  const componentMapKey = slug.join("/");
  const [bidTitle, setBidTitle] = useState<string | null>(null);

  // Check if this is a tender detail page (ends with an encoded tender name)
  const isTenderDetailPage =
    slug.length >= 3 &&
    slug[0] === "tenders" &&
    !["inbox", "under-utredning", "prepare-bid", "submitted"].includes(
      slug[slug.length - 1]
    );

  // Check if this is a bid detail page (ends with an encoded bid id)
  const isBidDetailPage =
    slug.length >= 3 &&
    slug[0] === "bids" &&
    ![
      "not-started",
      "authoring",
      "reviewing",
      "submitted",
      "ongoing-dialog",
      "won-lost",
    ].includes(slug[slug.length - 1]);

  // Reset bid title when navigating to different bid
  useEffect(() => {
    if (isBidDetailPage) {
      setBidTitle(null);
    }
  }, [slug.join("/"), isBidDetailPage]);

  // Find the current node to check if it's a leaf
  let currentNode: NavItem | undefined = {
    children: navigationData as NavItem[],
  } as NavItem;

  // For detail pages, we need to check the parent path (without the item name)
  const navigationSlug =
    isTenderDetailPage || isBidDetailPage ? slug.slice(0, -1) : slug;

  for (const segment of navigationSlug) {
    currentNode = currentNode?.children?.find(
      (child) => child.path === segment
    );
    if (!currentNode) break;
  }
  const isLeafNode = currentNode && !currentNode.children;

  const levels = [];
  let currentItems: NavItem[] = navigationData as NavItem[];
  let basePath = "/dashboard";

  // Build the shrunk navigation levels (excluding tender detail level)
  for (let i = 0; i < navigationSlug.length; i++) {
    const segment = navigationSlug[i];
    const activeItem = currentItems.find((item) => item.path === segment);

    if (!activeItem) {
      currentItems = [];
      break;
    }

    levels.push({
      items: currentItems,
      basePath: basePath,
      activeSegment: segment,
      isShrunken: true,
    });

    basePath += `/${segment}`;
    currentItems = activeItem.children || [];
  }

  // If this is a detail page, add the item name as a shrunken level
  if (isTenderDetailPage) {
    const tenderName = decodeURIComponent(slug[slug.length - 1]);
    levels.push({
      items: [{ title: tenderName, path: slug[slug.length - 1] }],
      basePath: basePath,
      activeSegment: slug[slug.length - 1],
      isShrunken: true,
    });
  } else if (isBidDetailPage) {
    const bidId = decodeURIComponent(slug[slug.length - 1]);
    const displayTitle = bidTitle || "Bid Details";
    levels.push({
      items: [{ title: displayTitle, path: slug[slug.length - 1] }],
      basePath: basePath,
      activeSegment: slug[slug.length - 1],
      isShrunken: true,
    });
  }

  // Check if we should render a detail page
  if (isTenderDetailPage) {
    const tenderName = slug[slug.length - 1];
    return (
      <div className="flex flex-col h-full">
        {/* Render all navigation levels */}
        {levels.map((level, index) => (
          <NavigationLevel
            key={index}
            items={level.items}
            basePath={level.basePath}
            activeSegment={level.activeSegment}
            isShrunken={level.isShrunken}
          />
        ))}

        {/* Render the tender detail page */}
        <div className="flex-1 overflow-y-auto">
          <TenderDetailPage tenderName={tenderName} />
        </div>
      </div>
    );
  }

  if (isBidDetailPage) {
    const bidId = slug[slug.length - 1];
    return (
      <div className="flex flex-col h-full">
        {/* Render all navigation levels */}
        {levels.map((level, index) => (
          <NavigationLevel
            key={index}
            items={level.items}
            basePath={level.basePath}
            activeSegment={level.activeSegment}
            isShrunken={level.isShrunken}
          />
        ))}

        {/* Render the bid detail page */}
        <div className="flex-1 overflow-y-auto">
          <BidDetailPage bidId={bidId} onTitleUpdate={setBidTitle} />
        </div>
      </div>
    );
  }

  const PageComponent = componentMap[componentMapKey];

  return (
    <div className="flex flex-col h-full">
      {/* Render all navigation levels */}
      {levels.map((level, index) => (
        <NavigationLevel
          key={index}
          items={level.items}
          basePath={level.basePath}
          activeSegment={level.activeSegment}
          isShrunken={level.isShrunken}
        />
      ))}

      {/* If we have more items to show and it's NOT a specific component page, render the next expanded level */}
      {currentItems.length > 0 && !PageComponent && (
        <NavigationLevel
          items={currentItems}
          basePath={basePath}
          activeSegment={undefined}
          isShrunken={false}
        />
      )}

      {/* If it IS a specific component page, render that component */}
      {PageComponent && (
        <div className="flex-1 p-6 bg-white overflow-y-auto">
          <PageComponent />
        </div>
      )}
    </div>
  );
}
