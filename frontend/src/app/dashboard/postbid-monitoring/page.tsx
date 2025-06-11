"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Simplified post-bid monitoring examples
const postBidExamples = [
  {
    id: 1,
    title: "Systemutveckling",
    status: "Utvärdering pågår",
    submittedDate: "2024-01-15",
    expectedResult: "2024-02-01",
    competitors: 5,
  },
  {
    id: 2,
    title: "Konsulttjänster",
    status: "Tilldelad",
    submittedDate: "2023-12-20",
    awardDate: "2024-01-05",
    competitors: 3,
  },
  {
    id: 3,
    title: "IT-infrastruktur",
    status: "Ej tilldelad",
    submittedDate: "2023-11-30",
    resultDate: "2023-12-15",
    competitors: 8,
    reason: "För högt pris",
  },
];

export default function PostBidMonitoringPage() {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Tilldelad":
        return "default";
      case "Utvärdering pågår":
        return "secondary";
      case "Ej tilldelad":
        return "destructive";
      case "Överklagad":
        return "outline";
      default:
        return "secondary";
    }
  };

  const renderPostBidCard = (bid: any) => (
    <Card key={bid.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{bid.title}</CardTitle>
          <Badge variant={getStatusBadgeVariant(bid.status)}>
            {bid.status}
          </Badge>
        </div>
        <CardDescription>Anbud inskickat</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Konkurrenter:</span>
              <div className="font-medium">{bid.competitors} st</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Inskickat:</span>
              <span className="text-sm font-medium">{bid.submittedDate}</span>
            </div>

            {bid.expectedResult && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Förväntat resultat:
                </span>
                <span className="text-sm font-medium">
                  {bid.expectedResult}
                </span>
              </div>
            )}

            {bid.awardDate && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Tilldelningsdatum:
                </span>
                <span className="text-sm font-medium">{bid.awardDate}</span>
              </div>
            )}

            {bid.resultDate && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Resultatdatum:</span>
                <span className="text-sm font-medium">{bid.resultDate}</span>
              </div>
            )}

            {bid.reason && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Anledning:</span>
                <span className="text-sm font-medium text-red-600">
                  {bid.reason}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <Button size="sm" variant="outline">
            Visa anbud
          </Button>
          {bid.status === "Tilldelad" && (
            <Button size="sm" variant="default">
              Kontraktshantering
            </Button>
          )}
          {bid.status === "Ej tilldelad" && (
            <Button size="sm" variant="outline">
              Analysera feedback
            </Button>
          )}
          {bid.status === "Överklagad" && (
            <Button size="sm" variant="secondary">
              Hantera överklagande
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Post-bid Monitoring
          </h2>
          <p className="text-gray-600">
            Följ upp och hantera inskickade anbud och deras resultat
          </p>
        </div>

        <div className="space-y-6">
          {postBidExamples.map(renderPostBidCard)}
        </div>

        {/* Statistics Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Sammanfattning</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">1</div>
              <div className="text-sm text-gray-600">Tilldelade</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">1</div>
              <div className="text-sm text-gray-600">Pågående</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">1</div>
              <div className="text-sm text-gray-600">Ej tilldelade</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">0</div>
              <div className="text-sm text-gray-600">Överklagade</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
