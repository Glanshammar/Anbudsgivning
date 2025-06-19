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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getTendersByState,
  updateTenderState,
  type Tender,
  TENDER_STATES,
} from "@/services/api/tenders";
import { FileText, Send, Check } from "lucide-react";

export default function PrepareBidPage() {
  const router = useRouter();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentToBidAuthoring, setSentToBidAuthoring] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const data = await getTendersByState(TENDER_STATES.SKA_BJUDAS_PA);
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

  const handleSendToBidAuthoring = async (tender: Tender, index: number) => {
    try {
      // Update state to bid_authoring
      await updateTenderState(tender.project_name, TENDER_STATES.BID_AUTHORING);

      // Mark as sent
      setSentToBidAuthoring((prev) => new Set(prev).add(index));

      // Remove from local state
      setTenders((prev) => prev.filter((_, i) => i !== index));

      // Navigate to Bid Authoring with tender information as URL parameter
      const tenderId = encodeURIComponent(tender.project_name);
      setTimeout(() => {
        router.push(`/dashboard/bid-authoring?tender=${tenderId}`);
      }, 1000);
    } catch (error) {
      console.error("Failed to move tender to bid authoring:", error);
    }
  };

  const renderTenderCard = (tender: Tender, index: number) => {
    const isSentToBidAuthoring = sentToBidAuthoring.has(index);

    return (
      <Card key={index} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{tender.project_name}</CardTitle>
            <div className="flex space-x-2">
              {isSentToBidAuthoring && (
                <Badge
                  variant="secondary"
                  className="flex items-center space-x-1"
                >
                  <Check className="h-3 w-3" />
                  <span>Skickad till Bid Authoring</span>
                </Badge>
              )}
              <Badge variant="default">Förbereder anbud</Badge>
            </div>
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
                className="flex items-center space-x-1"
              >
                <FileText className="h-3 w-3" />
                <span>Visa dokument</span>
              </a>
            </Button>

            {!isSentToBidAuthoring ? (
              <Button
                size="sm"
                variant="default"
                onClick={() => handleSendToBidAuthoring(tender, index)}
                className="flex items-center space-x-1"
              >
                <Send className="h-3 w-3" />
                <span>Skicka till Bid Authoring</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/dashboard/bid-authoring")}
                className="flex items-center space-x-1"
              >
                <FileText className="h-3 w-3" />
                <span>Öppna i Bid Authoring</span>
              </Button>
            )}

            <Button size="sm" variant="outline">
              Redigera anbud
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ska bjudas på
          </h2>
          <p className="text-gray-600">Laddar upphandlingar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ska bjudas på</h2>
        <p className="text-gray-600">
          Upphandlingar som vi förbereder anbud för
        </p>
      </div>

      {tenders.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="py-8 text-center">
            <p className="text-gray-600">
              Inga upphandlingar att bjuda på för tillfället.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">{tenders.map(renderTenderCard)}</div>
      )}

      {/* Information om Bid Authoring */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Bid Authoring</span>
          </CardTitle>
          <CardDescription className="text-blue-600">
            Klicka på "Skicka till Bid Authoring" för att börja strukturera och
            författa ditt anbud med våra verktyg.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
