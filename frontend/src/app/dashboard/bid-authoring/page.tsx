"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Users,
  Save,
  FileText,
  Loader2,
  AlertCircle,
  Edit,
} from "lucide-react";
import {
  getBidAuthoringData,
  saveBidAuthoringData,
  type BidAuthoringData,
} from "@/services/api/bid-authoring";
import {
  updateTenderState,
  getTendersByState,
  TENDER_STATES,
  type Tender,
} from "@/services/api/tenders";
import { isAuthenticated } from "@/utils/auth";

export default function BidAuthoringPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenderId = searchParams.get("tender");

  const [bidData, setBidData] = useState<BidAuthoringData | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [availableTenders, setAvailableTenders] = useState<Tender[]>([]);

  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        setIsUserAuthenticated(authenticated);

        if (!authenticated) {
          setError(
            "Du måste vara inloggad för att komma åt Bid Authoring. Omdirigerar till login..."
          );
          setTimeout(() => {
            router.push("/login");
          }, 3000);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking authentication:", err);
        setError("Kunde inte kontrollera inloggningsstatus.");
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Load bid authoring data or available tenders
  useEffect(() => {
    if (!isUserAuthenticated) return;

    if (!isUserAuthenticated) {
      console.log("⏳ Waiting for authentication...");
      return;
    }

    const loadData = async () => {
      if (!tenderId) {
        console.log("📋 No tender ID, loading available tenders...");
        // No specific tender selected - show list of available tenders
        try {
          setLoading(true);
          setError(null);
          console.log(
            "🔍 Fetching tenders with state:",
            TENDER_STATES.BID_AUTHORING
          );
          const tenders = await getTendersByState(TENDER_STATES.BID_AUTHORING);
          console.log("📋 Available tenders:", tenders);
          setAvailableTenders(tenders);
        } catch (err) {
          console.error("💥 Error loading available tenders:", err);
          setError("Kunde inte ladda tillgängliga upphandlingar.");
        } finally {
          setLoading(false);
        }
        return;
      }

      console.log("📝 Loading bid authoring data for tender:", tenderId);
      // Specific tender selected - load bid authoring data
      try {
        setLoading(true);
        setError(null);
        const data = await getBidAuthoringData(tenderId);
        console.log("📝 Bid authoring data loaded:", data);
        setBidData(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Okänt fel uppstod";
        console.error("💥 Error loading bid authoring data:", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenderId, isUserAuthenticated]);

  const handleTenderSelect = (tender: Tender) => {
    const encodedTenderId = encodeURIComponent(tender.project_name);
    router.push(`/dashboard/bid-authoring?tender=${encodedTenderId}`);
  };

  const handleInputChange = (field: string, value: string) => {
    if (!bidData) return;

    setBidData((prev) => ({
      ...prev!,
      [field]: value,
    }));
    setHasUnsavedChanges(true);
  };

  const handlePersonuppgifterChange = (field: string, value: string) => {
    if (!bidData) return;

    setBidData((prev) => ({
      ...prev!,
      personuppgifter: {
        ...prev!.personuppgifter,
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!bidData || !tenderId) return;

    try {
      setSaving(true);
      await saveBidAuthoringData(tenderId, bidData);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error saving bid authoring data:", err);
      setError("Kunde inte spara data. Försök igen.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!tenderId) return;

    try {
      // Save first if there are unsaved changes
      if (hasUnsavedChanges && bidData) {
        await saveBidAuthoringData(tenderId, bidData);
      }

      // Move to sent_bids state
      await updateTenderState(tenderId, TENDER_STATES.SENT_BIDS);

      // Navigate to submitted page
      router.push("/dashboard/tenders/submitted");
    } catch (error) {
      console.error("Failed to submit bid:", error);
      setError("Kunde inte skicka in anbudet. Försök igen.");
    }
  };

  // Render tender selection view
  const renderTenderSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bid Authoring</h2>
        <p className="text-gray-600">
          Välj en upphandling att författa anbud för
        </p>
      </div>

      {availableTenders.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Inga upphandlingar tillgängliga för bid authoring.
            </p>
            <p className="text-sm text-gray-500">
              Gå till "Ska bjudas på" för att skicka upphandlingar till bid
              authoring.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard/tenders/prepare-bid")}
            >
              Gå till "Ska bjudas på"
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {availableTenders.map((tender, index) => (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {tender.project_name}
                  </CardTitle>
                  <Badge variant="default">Bid Authoring</Badge>
                </div>
                <CardDescription>{tender.branch}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 mb-2">
                    {tender.description
                      ? tender.description.substring(0, 150) + "..."
                      : "Ingen beskrivning tillgänglig"}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deadline:</span>
                    <span className="font-medium">{tender.deadline}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleTenderSelect(tender)}
                    className="flex items-center space-x-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Författa anbud</span>
                  </Button>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Laddar...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Fel uppstod
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            {!isUserAuthenticated ? (
              <Button onClick={() => router.push("/login")}>
                Gå till inloggning
              </Button>
            ) : (
              <Button onClick={() => window.location.reload()}>
                Försök igen
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no tender selected, show tender selection
  if (!tenderId) {
    return renderTenderSelection();
  }

  // If tender selected but no bid data, show error
  if (!bidData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ingen data hittades
            </h3>
            <p className="text-gray-600 mb-4">
              Kunde inte ladda bid authoring data för denna upphandling.
            </p>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/bid-authoring")}
              >
                Tillbaka till lista
              </Button>
              <Button onClick={() => window.location.reload()}>
                Försök igen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderPersonuppgifter = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Företagsnamn</Label>
          <Input
            id="companyName"
            value={bidData?.personuppgifter.companyName || ""}
            onChange={(e) =>
              handlePersonuppgifterChange("companyName", e.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orgNumber">Organisationsnummer</Label>
          <Input
            id="orgNumber"
            value={bidData?.personuppgifter.orgNumber || ""}
            onChange={(e) =>
              handlePersonuppgifterChange("orgNumber", e.target.value)
            }
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Adress</Label>
          <Input
            id="address"
            value={bidData?.personuppgifter.address || ""}
            onChange={(e) =>
              handlePersonuppgifterChange("address", e.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Kontaktperson</Label>
          <Input
            id="contactPerson"
            value={bidData?.personuppgifter.contactPerson || ""}
            onChange={(e) =>
              handlePersonuppgifterChange("contactPerson", e.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-post</Label>
          <Input
            id="email"
            type="email"
            value={bidData?.personuppgifter.email || ""}
            onChange={(e) =>
              handlePersonuppgifterChange("email", e.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={bidData?.personuppgifter.phone || ""}
            onChange={(e) =>
              handlePersonuppgifterChange("phone", e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="space-y-4">
      <Label htmlFor="summary">Sammanfattning</Label>
      <Textarea
        id="summary"
        value={bidData?.summary || ""}
        onChange={(e) => handleInputChange("summary", e.target.value)}
        className="min-h-[300px] resize-y"
      />
    </div>
  );

  const renderKeySkills = () => (
    <div className="space-y-4">
      <Label htmlFor="keySkills">Nyckelkompetenser</Label>
      <Textarea
        id="keySkills"
        placeholder="Skriv era nyckelkompetenser här..."
        value={bidData?.keySkills || ""}
        onChange={(e) => handleInputChange("keySkills", e.target.value)}
        className="min-h-[300px] resize-y"
      />
      <p className="text-sm text-gray-600">
        Tips: Använd punktlistor (•) för att strukturera era kompetenser
      </p>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <Label htmlFor="history">Tidigare erfarenheter och projekt</Label>
      <Textarea
        id="history"
        placeholder="Beskriv era tidigare projekt och erfarenheter..."
        value={bidData?.history || ""}
        onChange={(e) => handleInputChange("history", e.target.value)}
        className="min-h-[300px] resize-y"
      />
      <p className="text-sm text-gray-600">
        Tips: Inkludera projektnamn, tidsperiod och resultat
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header med aktiv upphandling */}
      <div className="border-2 border-black p-6 bg-white">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">{tenderId || "Dokumentnamn"}</h1>
            <div className="text-red-500 text-sm font-medium">~~~~~~~~</div>
            <div className="text-lg font-medium">Status: {bidData.status}%</div>
          </div>
          <Button variant="outline" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Collaboration</span>
          </Button>
        </div>

        {/* Flikar */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-100">
            <TabsTrigger
              value="personuppgifter"
              className="bg-white border border-gray-300"
            >
              Personuppgifter
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="bg-white border border-gray-300"
            >
              Sammanfattning
            </TabsTrigger>
            <TabsTrigger
              value="keySkills"
              className="bg-white border border-gray-300"
            >
              Nyckelkompetenser
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="bg-white border border-gray-300"
            >
              Historik
            </TabsTrigger>
            <TabsTrigger
              value="add"
              className="bg-white border border-gray-300 p-2"
            >
              <Plus className="h-4 w-4 bg-white border-gray-300" />
            </TabsTrigger>
          </TabsList>

          {/* Innehåll för varje flik */}
          <div className="mt-6 border border-gray-300 p-6 bg-gray-50 min-h-[400px]">
            <TabsContent value="personuppgifter" className="space-y-0">
              {renderPersonuppgifter()}
            </TabsContent>

            <TabsContent value="summary" className="space-y-0">
              {renderSummary()}
            </TabsContent>

            <TabsContent value="keySkills" className="space-y-0">
              {renderKeySkills()}
            </TabsContent>

            <TabsContent value="history" className="space-y-0">
              {renderHistory()}
            </TabsContent>

            <TabsContent value="add" className="space-y-0">
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Plus className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                  <p>Lägg till ny sektion</p>
                  <Button variant="outline" className="mt-4">
                    Skapa ny sektion
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Spara och Skicka in knappar */}
        <div className="flex justify-between mt-6">
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <span className="text-orange-600 text-sm flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Osparade ändringar
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? "Sparar..." : "Spara"}</span>
            </Button>
            <Button
              onClick={handleSubmitBid}
              disabled={saving}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <FileText className="h-4 w-4" />
              <span>Skicka in anbud</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Information om hur man skickar upphandlingar hit */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">
            Kom igång med Bid Authoring
          </CardTitle>
          <CardDescription className="text-blue-600">
            För att börja arbeta med ett anbud, gå till "Tenders → Ska bjudas
            på" och välj en upphandling att skicka hit.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
