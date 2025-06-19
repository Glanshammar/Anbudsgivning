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
import {
  getTendersByState,
  type Tender,
  TENDER_STATES,
} from "@/services/api/tenders";

export default function SubmittedPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const data = await getTendersByState(TENDER_STATES.SENT_BIDS);
        setTenders(data);
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
          <Badge variant="secondary">Anbud inlämnat</Badge>
        </div>
        <CardDescription>{tender.branch}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-2">
            {tender.description
              ? tender.description.substring(0, 100) + "..."
              : "Ingen beskrivning tillgänglig"}
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Deadline:</span>
            <span className="text-sm font-medium">{tender.deadline}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Slutdatum:</span>
            <span className="text-sm font-medium">{tender.end_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Inskickat:</span>
            <span className="text-sm font-medium">
              {new Date(tender.deadline).toLocaleDateString("sv-SE")}
            </span>
          </div>
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" asChild>
            <a
              href={tender.tender_document_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visa originalfil
            </a>
          </Button>
          <Button size="sm" variant="secondary">
            Slutförd
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inskickade</h2>
          <p className="text-gray-600">Laddar upphandlingar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Inskickade</h2>
        <p className="text-gray-600">
          Upphandlingar där anbud redan har skickats in
        </p>
      </div>

      <div className="space-y-6">{tenders.map(renderTenderCard)}</div>
    </div>
  );
}
