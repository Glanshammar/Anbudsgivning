"use client";

import { Button } from "@/components/ui/button";
import { useTenderContext } from "@/contexts/TenderContext";
import { useRouter } from "next/navigation";

export default function ReviewPage() {
  const router = useRouter();
  const { getTendersByPhase, moveTenderToPhase, moveTenderToPreviousPhase } =
    useTenderContext();

  const reviewTenders = getTendersByPhase("review");

  const handleApproveAndSubmit = (tenderId: string) => {
    moveTenderToPhase(tenderId, "submitted");
    router.push("/dashboard/submitted");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Granskning av anbud
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Färdiga anbud som behöver granskas innan de kan skickas in.
          </p>
        </div>

        {reviewTenders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Inga anbud i denna fas än.
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {reviewTenders.map((tender) => (
                <div
                  key={tender.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {tender.project_name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {tender.brief_description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium">Bransch:</span>{" "}
                          {tender.branch}
                        </div>
                        <div>
                          <span className="font-medium">Deadline:</span>{" "}
                          {tender.deadline}
                        </div>
                        {tender.tender_document_link && (
                          <div>
                            <a
                              href={tender.tender_document_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              Visa dokument
                            </a>
                          </div>
                        )}
                      </div>

                      {tender.evaluation && (
                        <div className="bg-white p-3 rounded border mb-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Bedömningsresultat:
                          </h5>
                          <div className="flex items-center gap-4 text-sm">
                            <span>
                              <span className="font-medium">Totalpoäng:</span>{" "}
                              {tender.evaluation.totalScore}/5
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                              {tender.evaluation.recommendation === "proceed"
                                ? "Godkänd"
                                : "Avvakta"}
                            </span>
                          </div>
                          {tender.evaluation.notes && (
                            <p className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">Anteckningar:</span>{" "}
                              {tender.evaluation.notes}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="bg-blue-50 p-3 rounded border">
                        <h5 className="text-sm font-medium text-blue-700 mb-2">
                          Granskningschecklista:
                        </h5>
                        <div className="space-y-1 text-xs text-blue-600">
                          <div>✓ Kontrollera att alla krav är uppfyllda</div>
                          <div>✓ Verifiera prissättning och kalkyler</div>
                          <div>✓ Granska tekniska specifikationer</div>
                          <div>✓ Kontrollera deadlines och leveranstider</div>
                          <div>✓ Säkerställ att alla dokument är bifogade</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleApproveAndSubmit(tender.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Godkänn & Skicka in
                      </Button>
                      <Button
                        onClick={() => moveTenderToPreviousPhase(tender.id)}
                        size="sm"
                        variant="outline"
                      >
                        ← Tillbaka till utkast
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
