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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import {
  getTendersByState,
  updateTenderState,
  createTender,
  type Tender,
  TENDER_STATES,
} from "@/services/api/tenders";

export default function InboxPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Tender>({
    project_name: "",
    description: "",
    branch: "",
    tender_document_link: "",
    deadline: "",
    end_date: "",
    start_date: "",
    state: TENDER_STATES.NYINKOMMET,
  });

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        setLoading(true);
        const data = await getTendersByState(TENDER_STATES.NYINKOMMET);
        setTenders(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch tenders"
        );
        console.error("Error fetching tenders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, []);

  const handleInputChange = (field: keyof Tender, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTender = async () => {
    if (
      !formData.project_name.trim() ||
      !formData.description.trim() ||
      !formData.branch.trim() ||
      !formData.deadline
    ) {
      alert(
        "Vänligen fyll i alla obligatoriska fält (Projektnamn, Beskrivning, Bransch, Deadline)"
      );
      return;
    }

    try {
      // Create tender data without state (will be set to NYINKOMMET by API)
      const tenderData = {
        project_name: formData.project_name.trim(),
        description: formData.description.trim(),
        branch: formData.branch.trim(),
        tender_document_link: formData.tender_document_link.trim() || "#",
        deadline: formData.deadline,
        end_date: formData.end_date,
        start_date: formData.start_date,
        bid_data: formData.bid_data,
        submission_date: formData.submission_date,
      };

      // Save to database
      console.log("Creating tender with data:", tenderData);
      const newTender = await createTender(tenderData);
      console.log("Created tender:", newTender);

      // Add new tender to the top of the list
      setTenders((prev) => {
        console.log("Previous tenders:", prev);
        console.log("Adding new tender:", newTender);
        const newList = [newTender, ...prev];
        console.log("New tender list:", newList);
        return newList;
      });

      // Reset form and hide it
      setFormData({
        project_name: "",
        description: "",
        branch: "",
        tender_document_link: "",
        deadline: "",
        end_date: "",
        start_date: "",
        state: TENDER_STATES.NYINKOMMET,
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to create tender:", error);
      alert(
        `Kunde inte spara upphandlingen: ${
          error instanceof Error ? error.message : "Okänt fel"
        }`
      );
    }
  };

  const handleCancelAdd = () => {
    setFormData({
      project_name: "",
      description: "",
      branch: "",
      tender_document_link: "",
      deadline: "",
      end_date: "",
      start_date: "",
      state: TENDER_STATES.NYINKOMMET,
    });
    setShowAddForm(false);
  };

  const handleMoveToSort = async (tender: Tender, index: number) => {
    try {
      await updateTenderState(
        tender.project_name,
        TENDER_STATES.ATT_FINSORTERA
      );
      // Remove tender from local state
      setTenders((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to move tender to sort phase:", error);
    }
  };

  const renderTenderCard = (tender: Tender, index: number) => (
    <Card key={index} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{tender.project_name}</CardTitle>
          <Badge variant="default">Öppen</Badge>
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
          {tender.start_date && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Startdatum:</span>
              <span className="text-sm font-medium">{tender.start_date}</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="default"
            onClick={() => handleMoveToSort(tender, index)}
          >
            Finsortera →
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
            Nyinkomna upphandlingar
          </h2>
          <p className="text-gray-600">Laddar upphandlingar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nyinkomna upphandlingar
          </h2>
          <p className="text-red-600">Fel vid laddning: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nyinkomna upphandlingar
          </h2>
          <p className="text-gray-600">
            Nya upphandlingar som behöver granskas och sorteras
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          {showAddForm ? (
            <X className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {showAddForm ? "Avbryt" : "Lägg till upphandling"}
        </Button>
      </div>

      {/* Add Tender Form */}
      {showAddForm && (
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg">Lägg till ny upphandling</CardTitle>
            <CardDescription>
              Fyll i informationen för den nya upphandlingen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_name">Projektnamn *</Label>
                <Input
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("project_name", e.target.value)
                  }
                  placeholder="Ange projektnamn"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Bransch *</Label>
                <Select
                  value={formData.branch}
                  onValueChange={(value: string) =>
                    handleInputChange("branch", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj bransch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bygg & Anläggning">
                      Bygg & Anläggning
                    </SelectItem>
                    <SelectItem value="IT & Teknik">IT & Teknik</SelectItem>
                    <SelectItem value="Energi">Energi</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Fastighetsskötsel">
                      Fastighetsskötsel
                    </SelectItem>
                    <SelectItem value="Konsulttjänster">
                      Konsulttjänster
                    </SelectItem>
                    <SelectItem value="Hälso- & sjukvård">
                      Hälso- & sjukvård
                    </SelectItem>
                    <SelectItem value="Utbildning">Utbildning</SelectItem>
                    <SelectItem value="Övrigt">Övrigt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Beskriv upphandlingen..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("deadline", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Startdatum</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("start_date", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Slutdatum</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("end_date", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tender_document_link">Dokumentlänk</Label>
              <Input
                id="tender_document_link"
                type="url"
                value={formData.tender_document_link}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("tender_document_link", e.target.value)
                }
                placeholder="https://example.com/dokument.pdf"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddTender} className="flex-1">
                Lägg till upphandling
              </Button>
              <Button
                onClick={handleCancelAdd}
                variant="outline"
                className="flex-1"
              >
                Avbryt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">{tenders.map(renderTenderCard)}</div>
    </div>
  );
}
