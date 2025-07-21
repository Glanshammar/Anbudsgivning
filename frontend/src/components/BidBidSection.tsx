"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { getBidById, updateBidContent, type Bid } from "@/services/api/bids";
import { getCurrentUser, type User } from "@/services/api/login";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Suggestion {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  completed: boolean;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  progress: number;
  lastEditedBy: string;
  mainEditor: string;
  suggestions: Suggestion[];
}

interface BidBidSectionProps {
  bidId: string;
  onTitleUpdate?: (title: string) => void;
}

interface SortableChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  onChapterClick: (id: string) => void;
  onDeleteChapter: (id: string) => void;
  canDelete: boolean;
}

const SortableChapterItem: React.FC<SortableChapterItemProps> = ({
  chapter,
  isActive,
  onChapterClick,
  onDeleteChapter,
  canDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: transform
      ? `translate3d(0, ${transform.y}px, 0)` // Only allow vertical movement
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative"
    >
      <div
        onClick={() => onChapterClick(chapter.id)}
        className={`border-4 rounded-3xl cursor-pointer transition-all duration-300 px-4 py-3 text-sm font-medium text-center ${
          isActive
            ? "border-blue-500 shadow-2xl bg-white"
            : "border-black/80 shadow-lg hover:shadow-2xl hover:border-blue-500 bg-white"
        } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        {chapter.title || `Ch ${chapter.id.replace("ch", "")}`}
      </div>
      {canDelete && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onDeleteChapter(chapter.id);
          }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 cursor-pointer z-10"
        >
          ×
        </div>
      )}
    </div>
  );
};

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
  const [newSuggestion, setNewSuggestion] = useState<string>("");
  const [chapterApproved, setChapterApproved] = useState<{
    [key: string]: boolean;
  }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
                // Ensure all chapters have suggestions array
                const chaptersWithSuggestions = parsedChapters.map(
                  (chapter: any) => ({
                    ...chapter,
                    suggestions: chapter.suggestions || [],
                  })
                );
                setChapters(chaptersWithSuggestions);
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
                  suggestions: [],
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
                suggestions: [],
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
      suggestions: [],
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

  const addSuggestion = () => {
    if (!newSuggestion.trim() || !currentUser) return;

    const suggestion: Suggestion = {
      id: `suggestion_${Date.now()}`,
      text: newSuggestion.trim(),
      author: currentUser.name,
      timestamp: new Date(),
      completed: false,
    };

    setChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === activeChapter
          ? {
              ...chapter,
              suggestions: [...chapter.suggestions, suggestion],
            }
          : chapter
      )
    );

    setNewSuggestion("");
  };

  const toggleSuggestionCompleted = (suggestionId: string) => {
    setChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === activeChapter
          ? {
              ...chapter,
              suggestions: chapter.suggestions.map((suggestion) =>
                suggestion.id === suggestionId
                  ? { ...suggestion, completed: !suggestion.completed }
                  : suggestion
              ),
            }
          : chapter
      )
    );
  };

  const handleSuggestionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addSuggestion();
    }
  };

  const handleChapterApproval = () => {
    setChapterApproved((prev) => ({
      ...prev,
      [activeChapter]: !prev[activeChapter],
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reorderedItems = arrayMove(items, oldIndex, newIndex);

        // Update chapter IDs to reflect new order
        const updatedItems = reorderedItems.map((item, index) => ({
          ...item,
          id: `ch${index + 1}`,
        }));

        // Update active chapter if it was moved
        const movedChapter = updatedItems.find(
          (item, index) =>
            items[oldIndex] &&
            item.title === items[oldIndex].title &&
            item.content === items[oldIndex].content
        );
        if (movedChapter) {
          setActiveChapter(movedChapter.id);
        }

        return updatedItems;
      });
    }
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
      <div className="flex flex-1">
        {/* Chapter sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Chapter list */}
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Add new chapter button */}
            <div
              onClick={addNewChapter}
              className="border-4 rounded-3xl cursor-pointer transition-all duration-300 px-4 py-3 text-sm font-medium border-black/80 shadow-lg hover:shadow-2xl hover:border-blue-500 bg-white text-center"
            >
              ➕ Add Chapter
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={chapters.map((chapter) => chapter.id)}
                strategy={verticalListSortingStrategy}
              >
                {chapters.map((chapter) => (
                  <SortableChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    isActive={activeChapter === chapter.id}
                    onChapterClick={setActiveChapter}
                    onDeleteChapter={deleteChapter}
                    canDelete={chapters.length > 1}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Metadata sidebar - hidden on mobile */}
        <div className="hidden md:flex w-80 bg-gray-50 border-r border-gray-200 flex-col p-4 space-y-4">
          {/* Chapter Title */}
          <div className="space-y-2">
            <Label htmlFor="titleInput" className="text-sm font-medium">
              Chapter Title:
            </Label>
            <Input
              id="titleInput"
              value={currentChapter.title}
              onChange={(e) =>
                updateChapter(currentChapter.id, "title", e.target.value)
              }
              placeholder="Enter chapter title..."
              className="text-sm"
            />
          </div>

          {/* Editor information */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Main editor:</Label>
              <p className="text-sm text-gray-600">
                {currentChapter.mainEditor}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Last edited by:</Label>
              <p className="text-sm text-gray-600">
                {currentChapter.lastEditedBy}
              </p>
            </div>
          </div>

          {/* Progress tracking */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Progress: {currentChapter.progress}% Done
            </Label>
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

          {/* Suggestions section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Suggestions:</Label>

            {/* Suggestions list - only show when there are suggestions */}
            {currentChapter.suggestions.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-md p-2 space-y-2 max-h-[200px] overflow-y-auto">
                {currentChapter.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={suggestion.completed}
                      onChange={() => toggleSuggestionCompleted(suggestion.id)}
                      className="mt-0.5 h-3 w-3"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`${
                          suggestion.completed
                            ? "text-gray-500"
                            : chapterApproved[activeChapter] &&
                              !suggestion.completed
                            ? "line-through text-gray-500"
                            : "text-gray-800"
                        }`}
                      >
                        {suggestion.text}
                      </p>
                      <p className="text-gray-500 mt-1">
                        {suggestion.author} •{" "}
                        {suggestion.timestamp.toLocaleString("sv-SE", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add suggestion input */}
            <Input
              value={newSuggestion}
              onChange={(e) => setNewSuggestion(e.target.value)}
              onKeyPress={handleSuggestionKeyPress}
              placeholder="Add a suggestion and press Enter..."
              className="text-sm"
            />

            {/* Chapter approval button */}
            <Button
              onClick={handleChapterApproval}
              variant="outline"
              size="sm"
              className={`w-full text-xs ${
                chapterApproved[activeChapter]
                  ? "bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700"
                  : "bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
              }`}
            >
              {chapterApproved[activeChapter]
                ? "↩️ Undo approval"
                : "👍 Chapter complete & OK"}
            </Button>
          </div>
        </div>

        {/* Main content area - Chapter Text */}
        <div className="flex-1 flex flex-col">
          {/* Mobile metadata header - only visible on mobile */}
          <div className="md:hidden bg-gray-50 border-b border-gray-200 p-4 space-y-3">
            {/* Chapter Title on mobile */}
            <div className="space-y-1">
              <Label htmlFor="mobileTitleInput" className="text-xs font-medium">
                Chapter Title:
              </Label>
              <Input
                id="mobileTitleInput"
                value={currentChapter.title}
                onChange={(e) =>
                  updateChapter(currentChapter.id, "title", e.target.value)
                }
                placeholder="Enter chapter title..."
                className="text-sm h-8"
              />
            </div>

            {/* Editor information on mobile */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-xs font-medium">Main editor:</Label>
                <p className="text-xs text-gray-600">
                  {currentChapter.mainEditor}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium">Last edited by:</Label>
                <p className="text-xs text-gray-600">
                  {currentChapter.lastEditedBy}
                </p>
              </div>
            </div>

            {/* Progress on mobile */}
            <div className="flex items-center gap-3">
              <Label className="text-xs font-medium whitespace-nowrap">
                Progress:
              </Label>
              <Slider
                value={[currentChapter.progress]}
                onValueChange={(value) =>
                  updateChapter(currentChapter.id, "progress", value[0])
                }
                min={0}
                max={100}
                step={10}
                showColorProgress={true}
                className="flex-1"
              />
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {currentChapter.progress}%
              </span>
            </div>

            {/* Suggestions section on mobile */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Suggestions:</Label>

              {/* Suggestions list - only show when there are suggestions */}
              {currentChapter.suggestions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-md p-2 space-y-2 max-h-[120px] overflow-y-auto">
                  {currentChapter.suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={suggestion.completed}
                        onChange={() =>
                          toggleSuggestionCompleted(suggestion.id)
                        }
                        className="mt-0.5 h-3 w-3"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`${
                            suggestion.completed
                              ? "text-gray-500"
                              : chapterApproved[activeChapter] &&
                                !suggestion.completed
                              ? "line-through text-gray-500"
                              : "text-gray-800"
                          }`}
                        >
                          {suggestion.text}
                        </p>
                        <p className="text-gray-500 mt-1">
                          {suggestion.author} •{" "}
                          {suggestion.timestamp.toLocaleString("sv-SE", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add suggestion input on mobile */}
              <Input
                value={newSuggestion}
                onChange={(e) => setNewSuggestion(e.target.value)}
                onKeyPress={handleSuggestionKeyPress}
                placeholder="Add a suggestion and press Enter..."
                className="text-xs h-8"
              />
            </div>

            {/* Approval button on mobile */}
            <Button
              onClick={handleChapterApproval}
              variant="outline"
              size="sm"
              className={`w-full text-xs h-8 ${
                chapterApproved[activeChapter]
                  ? "bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700"
                  : "bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
              }`}
            >
              {chapterApproved[activeChapter]
                ? "↩️ Undo approval"
                : "👍 Chapter complete & OK"}
            </Button>
          </div>

          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="h-full">
              {/* Content textarea */}
              <div className="h-full flex flex-col space-y-2">
                <Label htmlFor="contentInput" className="text-sm font-medium">
                  Chapter Text:
                </Label>
                <Textarea
                  id="contentInput"
                  value={currentChapter.content}
                  onChange={(e) =>
                    updateChapter(currentChapter.id, "content", e.target.value)
                  }
                  placeholder="Write your chapter content here..."
                  className="flex-1 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidBidSection;
