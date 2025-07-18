"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ReviewCommentItem {
  id: string;
  question: string;
  category: string;
}

/**
 * Represents a user's vote on a review comment question
 * Includes user identification and timestamp for audit trail
 */
interface UserVote {
  userId: string;
  userName: string;
  vote: boolean; // true = thumbs up, false = thumbs down
  timestamp: string;
}

/**
 * Maps review comment question IDs to arrays of user votes
 * Enables multiple users to vote on each question
 */
interface ReviewCommentResponse {
  [key: string]: UserVote[]; // Array of votes per question
}

/**
 * Predefined review comment questions organized by business category
 * Covers technical, economic, and strategic evaluation criteria
 */
const REVIEW_COMMENT_ITEMS: ReviewCommentItem[] = [
  // Tekniska/Kompetensmässiga faktorer
  {
    id: "competence",
    question: "Har vi rätt kompetens och certifieringar för detta projekt?",
    category: "Teknisk kapacitet",
  },
  {
    id: "resources",
    question:
      "Har vi tillräckliga resurser och kapacitet att genomföra projektet?",
    category: "Teknisk kapacitet",
  },
  {
    id: "requirements",
    question: "Förstår vi alla tekniska krav och specifikationer fullt ut?",
    category: "Teknisk kapacitet",
  },
  {
    id: "timeline",
    question: "Kan vi leverera inom den angivna tidsramen?",
    category: "Teknisk kapacitet",
  },

  // Ekonomiska faktorer
  {
    id: "profitability",
    question: "Bedömer vi att projektet kommer att vara lönsamt?",
    category: "Ekonomi",
  },
  {
    id: "pricing",
    question: "Kan vi vara konkurrenskraftiga med vår prissättning?",
    category: "Ekonomi",
  },
  {
    id: "risks",
    question: "Är de ekonomiska riskerna acceptabla för vår verksamhet?",
    category: "Ekonomi",
  },
  {
    id: "cash_flow",
    question:
      "Har vi ekonomiska resurser för att hantera projektets kassaflöde?",
    category: "Ekonomi",
  },

  // Strategiska faktorer
  {
    id: "strategy",
    question: "Passar detta projekt vår långsiktiga affärsstrategi?",
    category: "Strategi",
  },
  {
    id: "reputation",
    question: "Är kunden trovärdig och har god betalningshistorik?",
    category: "Strategi",
  },
  {
    id: "future_business",
    question: "Kan detta projekt leda till framtida affärsmöjligheter?",
    category: "Strategi",
  },
  {
    id: "competition",
    question: "Har vi realistiska chanser att vinna mot konkurrenterna?",
    category: "Strategi",
  },
];

interface ReviewCommentProps {
  tenderName: string;
  onClose: () => void;
}

/**
 * Collaborative Review Comments Component
 * Implements Facebook-style voting where team members can vote thumbs up/down
 * Provides recommendation based on collective team sentiment
 */
export default function ReviewComments({
  tenderName,
  onClose,
}: ReviewCommentProps) {
  // Simulate existing votes (in real app this would come from database)
  const [responses, setResponses] = useState<ReviewCommentResponse>({
    competence: [
      {
        userId: "user1",
        userName: "Anna Svensson",
        vote: true,
        timestamp: "2024-01-15T10:30:00Z",
      },
      {
        userId: "user2",
        userName: "Erik Larsson",
        vote: true,
        timestamp: "2024-01-15T11:15:00Z",
      },
    ],
    resources: [
      {
        userId: "user1",
        userName: "Anna Svensson",
        vote: false,
        timestamp: "2024-01-15T10:31:00Z",
      },
      {
        userId: "user3",
        userName: "Maria Johansson",
        vote: true,
        timestamp: "2024-01-15T12:00:00Z",
      },
    ],
    profitability: [
      {
        userId: "user2",
        userName: "Erik Larsson",
        vote: true,
        timestamp: "2024-01-15T11:20:00Z",
      },
    ],
  });

  // Simulate current logged-in user
  const currentUser = {
    userId: "current_user",
    userName: "Du",
  };

  /**
   * Handles user voting on review comment questions
   * Replaces any existing vote from the same user
   */
  const handleResponse = (itemId: string, value: boolean) => {
    setResponses((prev) => {
      const currentVotes = prev[itemId] || [];
      // Remove any previous vote from same user to prevent duplicates
      const otherVotes = currentVotes.filter(
        (vote) => vote.userId !== currentUser.userId
      );

      // Add the new vote with timestamp
      const newVote: UserVote = {
        userId: currentUser.userId,
        userName: currentUser.userName,
        vote: value,
        timestamp: new Date().toISOString(),
      };

      return {
        ...prev,
        [itemId]: [...otherVotes, newVote],
      };
    });
  };

  /**
   * Gets the current user's vote for a specific question
   * Returns null if user hasn't voted yet
   */
  const getCurrentUserVote = (itemId: string): boolean | null => {
    const votes = responses[itemId] || [];
    const userVote = votes.find((vote) => vote.userId === currentUser.userId);
    return userVote ? userVote.vote : null;
  };

  /**
   * Calculates vote counts and returns voters for display
   */
  const getVoteCounts = (itemId: string) => {
    const votes = responses[itemId] || [];
    const positive = votes.filter((vote) => vote.vote === true);
    const negative = votes.filter((vote) => vote.vote === false);
    return { positive, negative };
  };

  /**
   * Generates overall recommendation based on team voting patterns
   * Uses percentage of positive votes to determine recommendation strength
   */
  const getOverallRecommendation = () => {
    const questionsWithVotes = REVIEW_COMMENT_ITEMS.filter((item) => {
      const votes = responses[item.id] || [];
      return votes.length > 0;
    });

    // Wait for all questions to be answered
    if (questionsWithVotes.length < REVIEW_COMMENT_ITEMS.length) {
      return "Väntar på att alla frågor besvaras av teamet";
    }

    let totalPositive = 0;
    let totalVotes = 0;

    questionsWithVotes.forEach((item) => {
      const votes = responses[item.id] || [];
      totalVotes += votes.length;
      totalPositive += votes.filter((vote) => vote.vote === true).length;
    });

    const positivePercentage =
      totalVotes > 0 ? (totalPositive / totalVotes) * 100 : 0;

    // Recommendation thresholds based on positive vote percentage
    if (positivePercentage >= 70) {
      return "🟢 Teamet rekommenderar starkt att lägga anbud";
    } else if (positivePercentage >= 50) {
      return "🟡 Blandade åsikter - kräver diskussion";
    } else {
      return "🔴 Teamet rekommenderar INTE att lägga anbud";
    }
  };

  // Group questions by category for organized display
  const groupedItems = REVIEW_COMMENT_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as { [key: string]: ReviewCommentItem[] });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Ska vi bjuda på denna upphandling?
        </h2>

        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{category}</h3>

            {items.map((item) => {
              const { positive, negative } = getVoteCounts(item.id);
              const currentUserVote = getCurrentUserVote(item.id);

              return (
                <div key={item.id} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="mb-3">
                    <p className="text-gray-800 font-medium">{item.question}</p>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <Button
                      size="sm"
                      variant={currentUserVote === true ? "default" : "outline"}
                      onClick={() => handleResponse(item.id, true)}
                      className={
                        currentUserVote === true
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                    >
                      👍 Ja ({positive.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        currentUserVote === false ? "default" : "outline"
                      }
                      onClick={() => handleResponse(item.id, false)}
                      className={
                        currentUserVote === false
                          ? "bg-red-500 hover:bg-red-600"
                          : ""
                      }
                    >
                      👎 Nej ({negative.length})
                    </Button>
                  </div>

                  {/* Visa vilka som röstat */}
                  {(positive.length > 0 || negative.length > 0) && (
                    <div className="text-sm text-gray-600">
                      {positive.length > 0 && (
                        <div className="mb-1">
                          <span className="font-medium">👍 Positiva:</span>{" "}
                          {positive.map((vote) => vote.userName).join(", ")}
                        </div>
                      )}
                      {negative.length > 0 && (
                        <div>
                          <span className="font-medium">👎 Negativa:</span>{" "}
                          {negative.map((vote) => vote.userName).join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            Rekommendation
          </h3>
          <p className="text-gray-800 font-medium">
            {getOverallRecommendation()}
          </p>
        </div>

        <div className="mt-6 flex gap-4">
          <Button onClick={onClose} variant="outline">
            Stäng Review Comments
          </Button>
          <Button
            onClick={() => {
              // Här kan man senare spara resultatet
              console.log("Review Comments responses:", responses);
              onClose();
            }}
          >
            Spara alla röster
          </Button>
        </div>
      </div>
    </div>
  );
}
