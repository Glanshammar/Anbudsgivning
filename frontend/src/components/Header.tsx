"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/utils/auth";
import { useState, useRef, useEffect } from "react";
import { Menu } from "lucide-react";

type ActiveSection = "tenders" | "bid-authoring" | "post-bid" | null;

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "urgent";
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    title: "Ny upphandling tillgänglig",
    message: "IT-tjänster för Stockholms kommun är nu öppen för anbudsgivning",
    type: "info",
    timestamp: "2024-01-10T10:30:00",
    read: false,
  },
  {
    id: 2,
    title: "Anbudsfrist närmar sig",
    message: "Ditt anbud måste lämnas inom 3 dagar",
    type: "warning",
    timestamp: "2024-01-09T14:20:00",
    read: false,
  },
  {
    id: 3,
    title: "BRÅDSKANDE: Komplettering krävs",
    message: "Saknar nödvändiga certifikat",
    type: "urgent",
    timestamp: "2024-01-07T16:45:00",
    read: false,
  },
];

interface HeaderProps {
  activeSection?: ActiveSection;
}

export default function Header({
  activeSection: propActiveSection,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active section from URL if not provided as prop
  const activeSection =
    propActiveSection ??
    (() => {
      if (pathname.includes("/tenders")) return "tenders";
      if (pathname.includes("/bid-authoring")) return "bid-authoring";
      if (pathname.includes("/postbid-monitoring")) return "post-bid";
      return null;
    })();
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "border-l-red-500 bg-red-50";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50";
      case "success":
        return "border-l-green-500 bg-green-50";
      default:
        return "border-l-blue-500 bg-blue-50";
    }
  };

  const handleStatisticsClick = () => {
    router.push("/dashboard/statistics");
  };

  const handleDocumentsClick = () => {
    router.push("/dashboard/documents");
  };

  const handleHelpClick = () => {
    router.push("/dashboard/help");
  };

  const handleProfileClick = () => {
    router.push("/dashboard/userprofile");
  };

  const desktopNavigationItems = (
    <>
      <button
        className={`text-gray-700 hover:text-black font-bold transition-colors py-4 ${
          activeSection === "tenders"
            ? "text-black border-b-2 border-blue-600"
            : ""
        }`}
        onClick={() => {
          router.push("/dashboard/tenders/inbox");
        }}
      >
        Tenders
      </button>

      <button
        className={`text-gray-700 hover:text-black font-bold transition-colors py-4 ${
          activeSection === "bid-authoring"
            ? "text-black border-b-2 border-blue-600"
            : ""
        }`}
        onClick={() => {
          router.push("/dashboard/bid-authoring");
        }}
      >
        Bid Authoring
      </button>

      <button
        className={`text-gray-700 hover:text-black font-bold transition-colors py-4 ${
          activeSection === "post-bid"
            ? "text-black border-b-2 border-blue-600"
            : ""
        }`}
        onClick={() => {
          router.push("/dashboard/postbid-monitoring");
        }}
      >
        Post-bid Monitoring
      </button>
    </>
  );

  const mobileNavigationItems = (
    <>
      <button
        className={`flex-1 text-center text-gray-700 hover:text-black font-medium transition-colors py-4 px-3 text-sm ${
          activeSection === "tenders"
            ? "text-black border-b-2 border-blue-600"
            : ""
        }`}
        onClick={() => {
          router.push("/dashboard/tenders/inbox");
        }}
      >
        Tenders
      </button>

      <button
        className={`flex-1 text-center text-gray-700 hover:text-black font-medium transition-colors py-4 px-3 text-sm ${
          activeSection === "bid-authoring"
            ? "text-black border-b-2 border-blue-600"
            : ""
        }`}
        onClick={() => {
          router.push("/dashboard/bid-authoring");
        }}
      >
        Bid Authoring
      </button>

      <button
        className={`flex-1 text-center text-gray-700 hover:text-black font-medium transition-colors py-4 px-3 text-sm ${
          activeSection === "post-bid"
            ? "text-black border-b-2 border-blue-600"
            : ""
        }`}
        onClick={() => {
          router.push("/dashboard/postbid-monitoring");
        }}
      >
        Post-bid Monitoring
      </button>
    </>
  );

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex justify-between items-center">
          {/* Left side */}
          <div className="flex items-center gap-4 flex-1">
            {/* Desktop Navigation - Left side */}
            <div className="hidden md:flex items-center">
              <nav className="flex items-center gap-6">
                {desktopNavigationItems}
              </nav>
            </div>

            {/* Mobile Navigation Items - Full width on mobile */}
            <div className="flex md:hidden items-center flex-1">
              <nav className="flex items-center w-full">
                {mobileNavigationItems}
              </nav>
            </div>
          </div>

          {/* Right side - Icons and User */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Desktop Icons - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-4">
              {/* Statistics Icon */}
              <button
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Statistik"
                onClick={handleStatisticsClick}
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M4,23a1,1,0,0,1-1-1V19a1,1,0,0,1,2,0v3A1,1,0,0,1,4,23Zm9-1V15a1,1,0,0,0-2,0v7a1,1,0,0,0,2,0Zm7-11a1,1,0,0,0-1,1V22a1,1,0,0,0,2,0V12A1,1,0,0,0,20,11Zm.382-9.923A.991.991,0,0,0,20,1H16a1,1,0,0,0,0,2h1.586L12,8.586,8.707,5.293a1,1,0,0,0-1.414,0l-4,4a1,1,0,0,0,1.414,1.414L8,7.414l3.293,3.293a1,1,0,0,0,1.414,0L19,4.414V6a1,1,0,0,0,2,0V2a1,1,0,0,0-.618-.923Z" />
                </svg>
              </button>

              {/* Documents Icon */}
              <button
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Dokument"
                onClick={handleDocumentsClick}
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 128 128"
                  fill="currentColor"
                >
                  <path d="M69.919 32.077H43.642V17.973h26.276v14.104zm0 3.757H43.642v7.273h26.276v-7.273zm-26.277 78.063h26.276V128H43.642v-14.103zm0-3.757h26.276v-7.273H43.642v7.273zm26.277-61.962H43.642v50.3h26.276v-50.3zM38.084 32.077H11.807V17.973h26.276v14.104zm0 3.757H11.807v7.273h26.276v-7.273zm-26.277 78.063h26.276V128H11.807v-14.103zm0-3.757h26.276v-7.273H11.807v7.273zm26.277-61.962H11.807v50.3h26.276v-50.3zM98.335 13.92 72.4 18.144l-2.267-13.92L96.068 0l2.267 13.92zm.604 3.708-25.935 4.224 1.169 7.178 25.935-4.224-1.169-7.178zm-10.948 96.234 25.935-4.224 2.267 13.92-25.935 4.224-2.267-13.92zm-.604-3.708 25.935-4.224-1.169-7.178-25.935 4.224 1.169 7.178zm13.537-80.342-25.935 4.224 10.523 64.608 25.935-4.224-10.523-64.608z" />
                </svg>
              </button>

              {/* Help Icon (Question Mark) */}
              <button
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Hjälp"
                onClick={handleHelpClick}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>

            {/* Calendar Icon - Hidden on mobile */}
            <div className="relative hidden md:block" ref={calendarRef}>
              <button
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                onClick={() => setShowCalendar(!showCalendar)}
                title="Kalender"
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 32 32"
                  fill="currentColor"
                >
                  <path d="M26 4h-4V2a2 2 0 0 0-4 0v2H14V2a2 2 0 0 0-4 0v2H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM6 8h20v4H6zm0 6h20v10H6z" />
                  <circle cx="10" cy="18" r="1" />
                  <circle cx="14" cy="18" r="1" />
                  <circle cx="18" cy="18" r="1" />
                  <circle cx="22" cy="18" r="1" />
                  <circle cx="10" cy="22" r="1" />
                  <circle cx="14" cy="22" r="1" />
                  <circle cx="18" cy="22" r="1" />
                  <circle cx="22" cy="22" r="1" />
                  <path
                    d="M24 24a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6z"
                    opacity="0.7"
                  />
                  <path d="M28 15h-3v3h-2v-3h-3v-2h3v-3h2v3h3z" opacity="0.7" />
                </svg>
              </button>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Kommande deadlines
                    </h3>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500 text-center py-4">
                        Inga kommande deadlines
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Icon - Hidden on mobile */}
            <div className="relative hidden md:block" ref={notificationRef}>
              <button
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notiser"
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 32 32"
                  fill="currentColor"
                >
                  <path d="M16 2C12.145 2 9 5.145 9 9v7l-3 4h20l-3-4V9c0-3.855-3.145-7-7-7z" />
                  <path d="M13 24h6c0 1.657-1.343 3-3 3s-3-1.343-3-3z" />
                </svg>

                {/* Notification Badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Notifikationer ({unreadCount} olästa)
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border-l-4 cursor-pointer transition-opacity ${getNotificationTypeColor(
                            notification.type
                          )} ${notification.read ? "opacity-60" : ""}`}
                          onClick={() =>
                            markNotificationAsRead(notification.id)
                          }
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-gray-900">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(
                                  notification.timestamp
                                ).toLocaleString("sv-SE")}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="flex md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col space-y-4 mt-6">
                    <h3 className="text-lg font-semibold">
                      Verktyg & Funktioner
                    </h3>

                    {/* Statistics Icon in menu */}
                    <button
                      className="flex items-center gap-3 text-gray-700 hover:text-black p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        handleStatisticsClick();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M4,23a1,1,0,0,1-1-1V19a1,1,0,0,1,2,0v3A1,1,0,0,1,4,23Zm9-1V15a1,1,0,0,0-2,0v7a1,1,0,0,0,2,0Zm7-11a1,1,0,0,0-1,1V22a1,1,0,0,0,2,0V12A1,1,0,0,0,20,11Zm.382-9.923A.991.991,0,0,0,20,1H16a1,1,0,0,0,0,2h1.586L12,8.586,8.707,5.293a1,1,0,0,0-1.414,0l-4,4a1,1,0,0,0,1.414,1.414L8,7.414l3.293,3.293a1,1,0,0,0,1.414,0L19,4.414V6a1,1,0,0,0,2,0V2a1,1,0,0,0-.618-.923Z" />
                      </svg>
                      <span>Statistik</span>
                    </button>

                    {/* Documents Icon in menu */}
                    <button
                      className="flex items-center gap-3 text-gray-700 hover:text-black p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        handleDocumentsClick();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 128 128"
                        fill="currentColor"
                      >
                        <path d="M69.919 32.077H43.642V17.973h26.276v14.104zm0 3.757H43.642v7.273h26.276v-7.273zm-26.277 78.063h26.276V128H43.642v-14.103zm0-3.757h26.276v-7.273H43.642v7.273zm26.277-61.962H43.642v50.3h26.276v-50.3zM38.084 32.077H11.807V17.973h26.276v14.104zm0 3.757H11.807v7.273h26.276v-7.273zm-26.277 78.063h26.276V128H11.807v-14.103zm0-3.757h26.276v-7.273H11.807v7.273zm26.277-61.962H11.807v50.3h26.276v-50.3zM98.335 13.92 72.4 18.144l-2.267-13.92L96.068 0l2.267 13.92zm.604 3.708-25.935 4.224 1.169 7.178 25.935-4.224-1.169-7.178zm-10.948 96.234 25.935-4.224 2.267 13.92-25.935 4.224-2.267-13.92zm-.604-3.708 25.935-4.224-1.169-7.178-25.935 4.224 1.169 7.178zm13.537-80.342-25.935 4.224 10.523 64.608 25.935-4.224-10.523-64.608z" />
                      </svg>
                      <span>Dokument</span>
                    </button>

                    {/* Help Icon in menu */}
                    <button
                      className="flex items-center gap-3 text-gray-700 hover:text-black p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        handleHelpClick();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Hjälp</span>
                    </button>

                    <div className="border-t my-4"></div>

                    {/* Calendar Icon in menu */}
                    <button
                      className="flex items-center gap-3 text-gray-700 hover:text-black p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setShowCalendar(!showCalendar);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 32 32"
                        fill="currentColor"
                      >
                        <path d="M26 4h-4V2a2 2 0 0 0-4 0v2H14V2a2 2 0 0 0-4 0v2H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM6 8h20v4H6zm0 6h20v10H6z" />
                        <circle cx="10" cy="18" r="1" />
                        <circle cx="14" cy="18" r="1" />
                        <circle cx="18" cy="18" r="1" />
                        <circle cx="22" cy="18" r="1" />
                        <circle cx="10" cy="22" r="1" />
                        <circle cx="14" cy="22" r="1" />
                        <circle cx="18" cy="22" r="1" />
                        <circle cx="22" cy="22" r="1" />
                        <path
                          d="M24 24a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6z"
                          opacity="0.7"
                        />
                        <path
                          d="M28 15h-3v3h-2v-3h-3v-2h3v-3h2v3h3z"
                          opacity="0.7"
                        />
                      </svg>
                      <span className="flex items-center gap-2">Kalender</span>
                    </button>

                    {/* Notifications Icon in menu */}
                    <button
                      className="flex items-center gap-3 text-gray-700 hover:text-black p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setShowNotifications(!showNotifications);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <div className="relative">
                        <svg
                          className="h-6 w-6"
                          viewBox="0 0 32 32"
                          fill="currentColor"
                        >
                          <path d="M16 2C12.145 2 9 5.145 9 9v7l-3 4h20l-3-4V9c0-3.855-3.145-7-7-7z" />
                          <path d="M13 24h6c0 1.657-1.343 3-3 3s-3-1.343-3-3z" />
                        </svg>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-2">
                        Notifikationer
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                            {unreadCount}
                          </span>
                        )}
                      </span>
                    </button>

                    {/* Profile Icon in menu */}
                    <button
                      className="flex items-center gap-3 text-gray-700 hover:text-black p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        handleProfileClick();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <svg
                        className="h-6 w-6 text-gray-600"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                      <span>Profil</span>
                    </button>

                    <div className="border-t my-4"></div>

                    {/* Logout Icon in menu */}
                    <button
                      className="flex items-center gap-3 text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Logga ut</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* User Profile - Desktop only */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={handleProfileClick}
                className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center hover:bg-gray-400 transition-colors"
                title="Profil"
              >
                <svg
                  className="h-5 w-5 text-gray-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 text-sm px-4"
                title="Logga ut"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
