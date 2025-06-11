"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTenders, type Tender } from "@/services/api/tenders";

export default function BidNoBidPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const data = await getTenders();
        // Simulate bid/no-bid phase - take middle slice
        setTenders(data.slice(1, 3));
      } catch (err) {
        console.error("Error fetching tenders:", err);
        setTenders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, []);

  const renderTenderCard = (tender: Tender, index: number) => (
    <Card key={index} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{tender.project_name}</CardTitle>
          <Badge variant="destructive">Beslut krävs</Badge>
        </div>
        <CardDescription>{tender.branch}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-2">
            {tender.brief_description.substring(0, 100)}...
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Deadline:</span>
            <span className="text-sm font-medium">{tender.deadline}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Startdatum:</span>
            <span className="text-sm font-medium">{tender.start_date}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" asChild>
            <a
              href={tender.tender_document_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visa dokument
            </a>
          </Button>
          <Button size="sm" variant="default">
            Bjud på →
          </Button>
          <Button size="sm" variant="destructive">
            No-bid
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bid/ No-bid?
          </h2>
          <p className="text-gray-600">Laddar upphandlingar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bid/ No-bid?</h2>
        <p className="text-gray-600">
          Upphandlingar som kräver beslut om vi ska bjuda eller inte
        </p>
      </div>

      <div className="space-y-6">{tenders.map(renderTenderCard)}</div>
    </div>
  );
}
