"use client";

import { useState } from "react";

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
    message:
      "IT-tjänster för Stockholms kommun är nu öppen för anbudsgivning. Sista datum: 2024-02-15",
    type: "info",
    timestamp: "2024-01-10T10:30:00",
    read: false,
  },
  {
    id: 2,
    title: "Anbudsfrist närmar sig",
    message: "Ditt anbud för 'Städtjänster Göteborg' måste lämnas inom 3 dagar",
    type: "warning",
    timestamp: "2024-01-09T14:20:00",
    read: false,
  },
  {
    id: 3,
    title: "Anbud godkänt!",
    message:
      "Grattis! Ditt anbud för 'Konsulttjänster IT' har godkänts och går vidare till nästa steg",
    type: "success",
    timestamp: "2024-01-08T09:15:00",
    read: true,
  },
  {
    id: 4,
    title: "BRÅDSKANDE: Komplettering krävs",
    message:
      "Ditt anbud för 'Byggentreprenad' saknar nödvändiga certifikat. Komplettera inom 24h",
    type: "urgent",
    timestamp: "2024-01-07T16:45:00",
    read: false,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const getTypeStyles = (type: string) => {
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

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Notifieringar
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded ${
              filter === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Alla
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded ${
              filter === "unread"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Olästa ({unreadCount})
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Markera alla som lästa
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-5 5v-5zM9 7H4l5-5v5zm6 0h5l-5-5v5z"
              />
            </svg>
            <p className="text-lg">No notifications to display</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 p-4 rounded-r-lg shadow-sm transition-all cursor-pointer ${getTypeStyles(
                notification.type
              )} ${!notification.read ? "shadow-md" : "opacity-75"}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3
                    className={`font-semibold ${
                      !notification.read ? "text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {notification.title}
                    {!notification.read && (
                      <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                    )}
                  </h3>
                  <p className="text-gray-700 mt-1">{notification.message}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(notification.timestamp).toLocaleString("sv-SE")}
                  </p>
                </div>
                {notification.type === "urgent" && (
                  <svg
                    className="h-6 w-6 text-red-500 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {filteredNotifications.length > 0 && (
        <div className="mt-8 text-center text-gray-500">
          <p>Klicka på en notifiering för att markera den som läst</p>
        </div>
      )}
    </div>
  );
}
