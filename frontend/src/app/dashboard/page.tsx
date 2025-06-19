"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, TrendingUp, Users } from "lucide-react";

interface DashboardStats {
  activeTenders: number;
  bidsInProgress: number;
  submittedBids: number;
  upcomingDeadlines: number;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  type: "success" | "warning" | "info";
}

const mockStats: DashboardStats = {
  activeTenders: 12,
  bidsInProgress: 3,
  submittedBids: 8,
  upcomingDeadlines: 5,
};

const recentActivities: Activity[] = [
  {
    id: 1,
    title: "Nytt anbud skickat",
    description: "IT-tjänster för Stockholms kommun",
    timestamp: "2 timmar sedan",
    type: "success",
  },
  {
    id: 2,
    title: "Deadline närmar sig",
    description: "Transporttjänster - 3 dagar kvar",
    timestamp: "4 timmar sedan",
    type: "warning",
  },
  {
    id: 3,
    title: "Ny upphandling tillgänglig",
    description: "Konsulttjänster inom HR",
    timestamp: "1 dag sedan",
    type: "info",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(mockStats);

  useEffect(() => {
    // In a real app, fetch dashboard stats from API
    setStats(mockStats);
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Välkommen tillbaka!
        </h1>
        <p className="text-gray-600 mt-2">
          Här är en översikt av din anbudsverksamhet
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktiva Upphandlingar
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTenders}</div>
            <p className="text-xs text-muted-foreground">
              +2 från förra veckan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anbud Pågår</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bidsInProgress}</div>
            <p className="text-xs text-muted-foreground">I Bid Authoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Skickade Anbud
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submittedBids}</div>
            <p className="text-xs text-muted-foreground">Denna månad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Kommande Deadlines
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">Nästa 7 dagar</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Senaste Aktiviteter</CardTitle>
          <CardDescription>
            Översikt av dina senaste åtgärder och händelser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === "success"
                      ? "bg-green-500"
                      : activity.type === "warning"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }`}
                />
                <div className="flex-1">
                  <h4 className="font-medium">{activity.title}</h4>
                  <p className="text-sm text-gray-600">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Snabbåtgärder</CardTitle>
          <CardDescription>
            Vanliga åtgärder för att hantera dina upphandlingar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push("/dashboard/tenders/inbox")}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Nya Upphandlingar</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push("/dashboard/bid-authoring")}
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Bid Authoring</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push("/dashboard/calendar")}
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Kalender</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push("/dashboard/statistics")}
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">Statistik</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
