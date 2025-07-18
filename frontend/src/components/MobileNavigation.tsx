"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MenuIcon, ChevronRightIcon, HomeIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  path: string;
  description?: string;
  children?: NavItem[];
  icon?: string;
}

interface MobileNavigationProps {
  levels: Array<{
    items: NavItem[];
    basePath: string;
    activeSegment: string | undefined;
    isShrunken: boolean;
  }>;
  currentSlug: string[];
}

interface ExpandedLevel {
  items: NavItem[];
  basePath: string;
  parentTitle: string;
}

export default function MobileNavigation({
  levels,
  currentSlug,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<ExpandedLevel[]>([]);
  const router = useRouter();

  // Only show mobile navigation if we have levels to display
  if (levels.length === 0) return null;

  // Get root navigation items from navigation.json structure
  const getRootItems = (): NavItem[] => {
    if (levels.length > 0) {
      return levels[0].items;
    }
    return [];
  };

  // Check if we're on a detail page (tender or bid)
  const isDetailPage = () => {
    // Check if this is a tender detail page (ends with an encoded tender name)
    const isTenderDetailPage =
      currentSlug.length >= 3 &&
      currentSlug[0] === "tenders" &&
      !["inbox", "under-utredning"].includes(
        currentSlug[currentSlug.length - 1]
      );

    // Check if this is a bid detail page (ends with an encoded bid id)
    const isBidDetailPage =
      currentSlug.length >= 3 &&
      currentSlug[0] === "projects" &&
      ![
        "not-started",
        "authoring",
        "reviewing",
        "submitted",
        "ongoing-dialog",
        "won-lost",
      ].includes(currentSlug[currentSlug.length - 1]);

    return isTenderDetailPage || isBidDetailPage;
  };

  // Get the display name for the current item
  const getCurrentItemName = () => {
    if (isDetailPage() && currentSlug.length > 0) {
      const lastSegment = currentSlug[currentSlug.length - 1];
      return decodeURIComponent(lastSegment);
    }
    return null;
  };

  // Build the current path from levels and slug
  const buildCurrentPath = () => {
    const pathSegments: {
      title: string;
      items: NavItem[];
      basePath: string;
    }[] = [];

    // Add each level from the levels array
    levels.forEach((level, index) => {
      if (level.activeSegment) {
        const activeItem = level.items.find(
          (item) => item.path === level.activeSegment
        );
        if (activeItem) {
          pathSegments.push({
            title: activeItem.title,
            items: activeItem.children || [],
            basePath: `${level.basePath}/${activeItem.path}`,
          });
        }
      }
    });

    return pathSegments;
  };

  // Calculate column width based on number of columns
  const getColumnWidth = () => {
    const totalColumns =
      1 + expandedLevels.length + (getCurrentItemName() ? 1 : 0);
    // Use viewport width units to make sure all columns fit
    const widthPerColumn = Math.floor(100 / totalColumns);
    return `${Math.max(widthPerColumn, 25)}vw`; // Minimum 25vw per column
  };

  // Initialize navigation when opening - expand to current path
  const handleOpen = () => {
    setIsOpen(true);
    const currentPath = buildCurrentPath();
    const newExpandedLevels: ExpandedLevel[] = [];

    // Build expanded levels based on current path
    currentPath.forEach((segment, index) => {
      if (segment.items.length > 0) {
        newExpandedLevels.push({
          items: segment.items,
          basePath: segment.basePath,
          parentTitle: segment.title,
        });
      }
    });

    setExpandedLevels(newExpandedLevels);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleNavigation = (fullPath: string) => {
    router.push(fullPath);
    setIsOpen(false);
  };

  const handleHomeClick = () => {
    router.push("/dashboard");
    setIsOpen(false);
  };

  const handleItemClick = (
    item: NavItem,
    basePath: string,
    levelIndex: number
  ) => {
    const fullPath = `${basePath}/${item.path}`;

    if (item.children && item.children.length > 0) {
      // Expand this level - remove any levels after this one and add the new level
      const newExpandedLevels = expandedLevels.slice(0, levelIndex);
      newExpandedLevels.push({
        items: item.children,
        basePath: fullPath,
        parentTitle: item.title,
      });
      setExpandedLevels(newExpandedLevels);
    } else {
      // Navigate to the actual page
      handleNavigation(fullPath);
    }
  };

  // Check if an item is in the current active path
  const isInCurrentPath = (item: NavItem, levelIndex: number): boolean => {
    const currentPath = buildCurrentPath();
    return (
      levelIndex < currentPath.length &&
      currentPath[levelIndex].title === item.title
    );
  };

  const rootItems = getRootItems();
  const currentItemName = getCurrentItemName();
  const columnWidth = getColumnWidth();

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="fixed top-4 left-4 z-50 bg-white shadow-md hover:bg-gray-50 border border-gray-200"
        aria-label="Öppna navigation"
      >
        <MenuIcon className="h-5 w-5" />
      </Button>

      {/* Full Screen Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleClose}
          />

          {/* Menu Content */}
          <div className="fixed inset-0 z-50 flex">
            <div className="w-full h-full bg-white flex flex-col">
              {/* Header */}
              <div className="border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold">Meny</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Stäng meny"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>

              {/* Home Button */}
              <div className="border-b border-gray-200 flex-shrink-0">
                <button
                  onClick={handleHomeClick}
                  className="w-full text-left p-4 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <HomeIcon className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Dashboard</span>
                </button>
              </div>

              {/* Multi-level navigation */}
              <div className="flex-1 overflow-hidden">
                <div className="flex h-full">
                  {/* Root Level */}
                  <div
                    className="border-r border-gray-200 overflow-y-auto bg-white flex-shrink-0"
                    style={{ width: columnWidth }}
                  >
                    {rootItems.map((item) => {
                      const hasChildren =
                        item.children && item.children.length > 0;
                      const isExpanded =
                        expandedLevels.length > 0 &&
                        expandedLevels[0].parentTitle === item.title;
                      const isActive = isInCurrentPath(item, 0);

                      return (
                        <button
                          key={item.path}
                          onClick={() => handleItemClick(item, "/dashboard", 0)}
                          className={`w-full text-left p-3 border-b border-gray-100 transition-colors flex items-center justify-between hover:bg-gray-50 ${
                            isExpanded ? "bg-gray-100" : ""
                          } ${
                            isActive
                              ? "bg-blue-50 border-l-4 border-l-blue-500"
                              : ""
                          }`}
                        >
                          <span
                            className={`font-medium text-sm ${
                              isActive ? "text-blue-700" : "text-gray-900"
                            }`}
                          >
                            {item.title}
                          </span>

                          {hasChildren && (
                            <ChevronRightIcon
                              className={`h-4 w-4 ${
                                isActive ? "text-blue-600" : "text-gray-400"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Expanded Levels */}
                  {expandedLevels.map((level, levelIndex) => {
                    const nextLevelExpanded =
                      levelIndex + 1 < expandedLevels.length;
                    const expandedItem = nextLevelExpanded
                      ? level.items.find(
                          (item) =>
                            expandedLevels[levelIndex + 1].parentTitle ===
                            item.title
                        )
                      : null;

                    return (
                      <div
                        key={levelIndex}
                        className="border-r border-gray-200 overflow-y-auto bg-white flex-shrink-0"
                        style={{ width: columnWidth }}
                      >
                        {level.items.map((item) => {
                          const hasChildren =
                            item.children && item.children.length > 0;
                          const isExpanded = expandedItem?.title === item.title;
                          const isActive = isInCurrentPath(
                            item,
                            levelIndex + 1
                          );

                          return (
                            <button
                              key={item.path}
                              onClick={() =>
                                handleItemClick(
                                  item,
                                  level.basePath,
                                  levelIndex + 1
                                )
                              }
                              className={`w-full text-left p-3 border-b border-gray-100 transition-colors flex items-center justify-between hover:bg-gray-50 ${
                                isExpanded ? "bg-gray-100" : ""
                              } ${
                                isActive
                                  ? "bg-blue-50 border-l-4 border-l-blue-500"
                                  : ""
                              }`}
                            >
                              <span
                                className={`font-medium text-sm ${
                                  isActive ? "text-blue-700" : "text-gray-900"
                                }`}
                              >
                                {item.title}
                              </span>

                              {hasChildren && (
                                <ChevronRightIcon
                                  className={`h-4 w-4 ${
                                    isActive ? "text-blue-600" : "text-gray-400"
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Current Item Level - show individual items like "Project 1" */}
                  {currentItemName && (
                    <div
                      className="border-r border-gray-200 overflow-y-auto bg-white flex-shrink-0"
                      style={{ width: columnWidth }}
                    >
                      {/* Show the current item (like "Project 1") */}
                      <div className="p-3 border-b border-gray-100 bg-blue-50 border-l-4 border-l-blue-500">
                        <span className="font-medium text-sm text-blue-700">
                          {currentItemName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
