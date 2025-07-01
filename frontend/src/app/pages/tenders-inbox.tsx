"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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

import { useRouter } from "next/navigation";

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
        "Please fill in all required fields (Project Name, Description, Industry, Deadline)"
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
        `Failed to save tender: ${
          error instanceof Error ? error.message : "Unknown error"
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
        TENDER_STATES.UNDER_UTREDNING
      );
      // Remove tender from local state
      setTenders((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to move tender to investigation phase:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 h-full flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <p className="text-lg text-gray-500">Loading tenders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 h-full flex flex-col">
        <div className="flex-grow flex items-center justify-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          {showAddForm ? (
            <X className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {showAddForm ? "Abort" : "Add tender"}
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Add new tender</h3>
          <div className="flex gap-4 scroll-horizontal">
            <div className="space-y-2 flex-shrink-0 w-80">
              <Label htmlFor="project_name">Project Name *</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("project_name", e.target.value)
                }
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2 flex-shrink-0 w-80">
              <Label htmlFor="branch">Industry *</Label>
              <Select
                value={formData.branch}
                onValueChange={(value: string) =>
                  handleInputChange("branch", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Construction & Infrastructure">
                    Construction & Infrastructure
                  </SelectItem>
                  <SelectItem value="IT & Technology">
                    IT & Technology
                  </SelectItem>
                  <SelectItem value="Energy">Energy</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Property Management">
                    Property Management
                  </SelectItem>
                  <SelectItem value="Consulting Services">
                    Consulting Services
                  </SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleInputChange("description", e.target.value)
              }
              placeholder="Describe the tender..."
              rows={3}
            />
          </div>

          <div className="flex gap-4 scroll-horizontal">
            <div className="space-y-2 flex-shrink-0 w-80">
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

            <div className="space-y-2 flex-shrink-0 w-80">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("start_date", e.target.value)
                }
              />
            </div>

            <div className="space-y-2 flex-shrink-0 w-80">
              <Label htmlFor="end_date">End Date</Label>
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
            <Label htmlFor="tender_document_link">Document Link</Label>
            <Input
              id="tender_document_link"
              type="url"
              value={formData.tender_document_link}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("tender_document_link", e.target.value)
              }
              placeholder="https://example.com/document.pdf"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelAdd}>
              Cancel
            </Button>
            <Button onClick={handleAddTender}>Save</Button>
          </div>
        </Card>
      )}

      {!loading && !error && tenders.length > 0 && (
        <div className="flex-grow overflow-y-auto pr-2">
          <div className="space-y-4">
            {tenders.map((tender, index) => (
              <TenderCard key={index} tender={tender} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TenderCard = ({ tender }: { tender: Tender }) => {
  const router = useRouter();

  const handleCardClick = () => {
    const encodedTenderName = encodeURIComponent(tender.project_name);
    router.push(`/dashboard/tenders/inbox/${encodedTenderName}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white p-4 rounded-2xl border-4 border-black/80 shadow-md hover:shadow-xl hover:border-blue-500 transition-all duration-300 cursor-pointer"
    >
      <h3 className="text-lg font-bold text-gray-800">{tender.project_name}</h3>
      <p className="text-sm text-gray-600 mt-1">{tender.branch}</p>
      <p className="text-sm text-gray-500 mt-2">
        <span className="font-semibold">Deadline:</span> {tender.deadline}
      </p>
    </div>
  );
};
