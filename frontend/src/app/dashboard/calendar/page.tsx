"use client";

import { useState } from "react";

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  type: "deadline" | "meeting" | "reminder";
  description: string;
}

const mockEvents: Event[] = [
  {
    id: 1,
    title: "Anbudsfrist: IT-tjänster Stockholm",
    date: "2024-02-15",
    time: "23:59",
    type: "deadline",
    description:
      "Sista datum för att lämna anbud på IT-tjänster för Stockholms kommun",
  },
  {
    id: 2,
    title: "Möte: Projektplanering",
    date: "2024-01-20",
    time: "14:00",
    type: "meeting",
    description: "Diskutera kommande anbudsgivningar och strategi",
  },
  {
    id: 3,
    title: "Påminnelse: Komplettera certifikat",
    date: "2024-01-18",
    time: "09:00",
    type: "reminder",
    description:
      "Glöm inte att ladda upp uppdaterade certifikat för pågående anbud",
  },
  {
    id: 4,
    title: "Anbudsfrist: Byggentreprenad Göteborg",
    date: "2024-02-28",
    time: "15:00",
    type: "deadline",
    description: "Deadline för byggentreprenad i Göteborg",
  },
];

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [events] = useState<Event[]>(mockEvents);

  // Get events for selected date
  const selectedDateEvents = events.filter(
    (event) => event.date === selectedDate
  );

  // Get upcoming events (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate >= today && eventDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getEventTypeStyle = (type: string) => {
    switch (type) {
      case "deadline":
        return "bg-red-100 border-red-300 text-red-800";
      case "meeting":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "reminder":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "deadline":
        return (
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "meeting":
        return (
          <svg
            className="h-5 w-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case "reminder":
        return (
          <svg
            className="h-5 w-5 text-yellow-600"
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
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Kalender</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Input */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Välj datum</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
              Händelser {new Date(selectedDate).toLocaleDateString("sv-SE")}
            </h3>
            {selectedDateEvents.length === 0 ? (
              <p className="text-gray-500">Inga händelser detta datum</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-3 ${getEventTypeStyle(
                      event.type
                    )}`}
                  >
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm opacity-75 mt-1">{event.time}</p>
                        <p className="text-sm mt-2">{event.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Kommande händelser (7 dagar)
          </h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500">Inga kommande händelser</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-3 ${getEventTypeStyle(
                    event.type
                  )}`}
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">{getEventIcon(event.type)}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-sm opacity-75 mt-1">
                        {new Date(event.date).toLocaleDateString("sv-SE")} -{" "}
                        {event.time}
                      </p>
                      <p className="text-sm mt-2">{event.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
