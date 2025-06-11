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
import { Progress } from "@/components/ui/progress";

// Simplified bid authoring examples
const bidExamples = [
  {
    id: 1,
    title: "Anbud - IT-tjänster",
    progress: 75,
    lastEdited: "2024-01-10",
    status: "Pågående",
    sections: {
      technical: "Komplett",
      commercial: "Pågående",
      legal: "Ej påbörjad",
    },
  },
  {
    id: 2,
    title: "Anbud - Transporttjänster",
    progress: 45,
    lastEdited: "2024-01-09",
    status: "Pågående",
    sections: {
      technical: "Pågående",
      commercial: "Ej påbörjad",
      legal: "Ej påbörjad",
    },
  },
];

export default function BidAuthoringPage() {
  const getSectionBadgeVariant = (status: string) => {
    switch (status) {
      case "Komplett":
        return "default";
      case "Pågående":
        return "secondary";
      case "Granskas":
        return "outline";
      default:
        return "destructive";
    }
  };

  const renderBidCard = (bid: any) => (
    <Card key={bid.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{bid.title}</CardTitle>
          <Badge variant={bid.status === "Pågående" ? "secondary" : "default"}>
            {bid.status}
          </Badge>
        </div>
        <CardDescription>Anbudsarbete pågår</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Framsteg</span>
              <span>{bid.progress}%</span>
            </div>
            <Progress value={bid.progress} className="w-full" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Teknisk</div>
              <Badge
                variant={getSectionBadgeVariant(bid.sections.technical)}
                className="text-xs"
              >
                {bid.sections.technical}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Kommersiell</div>
              <Badge
                variant={getSectionBadgeVariant(bid.sections.commercial)}
                className="text-xs"
              >
                {bid.sections.commercial}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Legal</div>
              <Badge
                variant={getSectionBadgeVariant(bid.sections.legal)}
                className="text-xs"
              >
                {bid.sections.legal}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Senast redigerad:</span>
              <span className="text-sm font-medium">{bid.lastEdited}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <Button size="sm" variant="default">
            Fortsätt redigera
          </Button>
          <Button size="sm" variant="outline">
            Förhandsgranska
          </Button>
          {bid.progress >= 90 && (
            <Button size="sm" variant="secondary">
              Skicka för granskning
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
            Bid Authoring
          </h2>
          <p className="text-gray-600">
            Skapa och hantera anbud som är under utveckling
          </p>
        </div>

        <div className="space-y-6">{bidExamples.map(renderBidCard)}</div>

        <div className="flex justify-end">
          <Button size="lg">Skapa nytt anbud</Button>
        </div>
      </div>
    </div>
  );
}
