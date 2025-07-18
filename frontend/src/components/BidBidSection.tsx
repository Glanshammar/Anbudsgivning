"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { getBidById, updateBidContent, type Bid } from "@/services/api/bids";
import { getCurrentUser, type User } from "@/services/api/login";

interface Chapter {
  id: string;
  title: string;
  content: string;
  progress: number;
  lastEditedBy: string;
  mainEditor: string;
}

interface BidBidSectionProps {
  bidId: string;
  onTitleUpdate?: (title: string) => void;
}

const BidBidSection: React.FC<BidBidSectionProps> = ({
  bidId,
  onTitleUpdate,
}) => {
  const [bid, setBid] = useState<Bid | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<string>("ch1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load bid data and current user on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch current user
        const user = await getCurrentUser();
        setCurrentUser(user);

        // Fetch bid data
        const bidData = await getBidById(bidId);
        if (bidData) {
          setBid(bidData);
          if (onTitleUpdate) {
            onTitleUpdate(bidData.title);
          }

          // Load chapters from bid content or initialize with default
          if (bidData.content) {
            try {
              const parsedChapters = JSON.parse(bidData.content);
              if (Array.isArray(parsedChapters)) {
                setChapters(parsedChapters);
              }
            } catch (e) {
              // If content is not valid JSON, treat as single chapter
              setChapters([
                {
                  id: "ch1",
                  title: "Chapter 1",
                  content: bidData.content,
                  progress: 0,
                  lastEditedBy: user.name,
                  mainEditor: user.name,
                },
              ]);
            }
          } else {
            // Initialize with empty chapter if no content
            setChapters([
              {
                id: "ch1",
                title: "",
                content: "",
                progress: 0,
                lastEditedBy: user.name,
                mainEditor: user.name,
              },
            ]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bidId, onTitleUpdate]);

  // Save chapters to bid content
  const saveChapters = async () => {
    if (!bid) return;

    try {
      const chaptersJson = JSON.stringify(chapters);
      await updateBidContent(bid.id, chaptersJson);
      console.log("Chapters saved successfully");
    } catch (error) {
      console.error("Failed to save chapters:", error);
      setError("Failed to save chapters");
    }
  };

  // Auto-save when chapters change
  useEffect(() => {
    if (bid && chapters.length > 0) {
      const timeoutId = setTimeout(() => {
        saveChapters();
      }, 1000); // Save after 1 second of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [chapters, bid]);

  const updateChapter = (
    id: string,
    field: keyof Chapter,
    value: string | number
  ) => {
    setChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === id
          ? {
              ...chapter,
              [field]: value,
              // Update lastEditedBy when content or title is modified
              ...(field === "content" || field === "title"
                ? {
                    lastEditedBy: currentUser?.name || "Unknown User",
                  }
                : {}),
            }
          : chapter
      )
    );
  };

  const addNewChapter = () => {
    const newChapterNumber = chapters.length + 1;
    const newChapter: Chapter = {
      id: `ch${newChapterNumber}`,
      title: "",
      content: "",
      progress: 0,
      lastEditedBy: currentUser?.name || "Unknown User",
      mainEditor: currentUser?.name || "Unknown User",
    };
    setChapters((prev) => [...prev, newChapter]);
    setActiveChapter(newChapter.id);
  };

  const deleteChapter = (id: string) => {
    if (chapters.length <= 1) return; // Don't delete the last chapter

    setChapters((prev) => prev.filter((chapter) => chapter.id !== id));

    // If deleting active chapter, switch to first chapter
    if (activeChapter === id) {
      setActiveChapter(chapters[0].id);
    }
  };

  const getCurrentChapter = () => {
    return (
      chapters.find((chapter) => chapter.id === activeChapter) || chapters[0]
    );
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

  const currentChapter = getCurrentChapter();

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chapter tabs */}
      <div className="flex items-center gap-1 bg-gray-50">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="relative flex-1">
            <div
              onClick={() => setActiveChapter(chapter.id)}
              className={`border-4 rounded-3xl cursor-pointer transition-all duration-300 px-4 py-2 text-sm font-medium text-center ${
                activeChapter === chapter.id
                  ? "border-blue-500 shadow-2xl bg-white"
                  : "border-black/80 shadow-lg hover:shadow-2xl hover:border-blue-500 bg-white"
              }`}
            >
              {chapter.title || `Ch ${chapter.id.replace("ch", "")}`}
            </div>
            {chapters.length > 1 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChapter(chapter.id);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 cursor-pointer"
              >
                ×
              </div>
            )}
          </div>
        ))}
        <div className="flex-1">
          <div
            onClick={addNewChapter}
            className="border-4 rounded-3xl cursor-pointer transition-all duration-300 px-4 py-2 text-sm font-medium border-black/80 shadow-lg hover:shadow-2xl hover:border-blue-500 bg-white text-center"
          >
            ➕
          </div>
        </div>
      </div>

      {/* Chapter content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Chapter title input */}
          <div className="space-y-2">
            <Label htmlFor="chapterTitle">Chapter Title:</Label>
            <Input
              id="chapterTitle"
              value={currentChapter.title}
              onChange={(e) =>
                updateChapter(currentChapter.id, "title", e.target.value)
              }
              placeholder="Enter chapter title..."
              className="text-lg"
            />
          </div>

          {/* Chapter content */}
          <div className="space-y-2">
            <Label htmlFor="chapterContent">Chapter Text:</Label>
            <Textarea
              id="chapterContent"
              value={currentChapter.content}
              onChange={(e) =>
                updateChapter(currentChapter.id, "content", e.target.value)
              }
              placeholder="Write your chapter content here..."
              className="min-h-[400px] resize-none"
            />
          </div>

          {/* Progress tracking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Progress slider */}
            <div className="space-y-4">
              <Label>Progress: {currentChapter.progress}% Done</Label>
              <Slider
                value={[currentChapter.progress]}
                onValueChange={(value) =>
                  updateChapter(currentChapter.id, "progress", value[0])
                }
                min={0}
                max={100}
                step={10}
                showColorProgress={true}
                className="w-full"
              />
            </div>

            {/* Editor information */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Main editor:</Label>
                <p className="text-sm">{currentChapter.mainEditor}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Last edited by:</Label>
                <p className="text-sm">{currentChapter.lastEditedBy}</p>
              </div>
            </div>
          </div>

          {/* Comments section */}
          <div className="space-y-2">
            <Label>Suggestions:</Label>
            <Textarea
              placeholder="Add suggestions about this chapter..."
              className="min-h-[100px] resize-none"
              style={{ backgroundColor: "#f3f4f6" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidBidSection;
