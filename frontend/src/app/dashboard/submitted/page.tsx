"use client";

import { useTenderContext } from "@/contexts/TenderContext";
import { Button } from "@/components/ui/button";

export default function SubmittedPage() {
  const { getTendersByPhase, moveTenderToPreviousPhase } = useTenderContext();

  const submittedTenders = getTendersByPhase("submitted");

  // Calculate statistics based on real data
  const total = submittedTenders.length;
  const won = 0; // This could be extended with a "status" field in the future
  const underReview = total; // All submitted tenders are assumed to be under review

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Inskickade anbud
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Översikt över anbud som har skickats in och deras status.
          </p>
        </div>

        {submittedTenders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Inga inskickade anbud hittades.
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {submittedTenders.map((tender) => (
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

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium">Bransch:</span>{" "}
                          {tender.branch}
                        </div>
                        <div>
                          <span className="font-medium">Deadline:</span>{" "}
                          {tender.deadline}
                        </div>
                        <div>
                          <span className="font-medium">Inskickat:</span>{" "}
                          {tender.addedToPhaseAt.toLocaleDateString("sv-SE")}
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
                              Godkänd och inskickad
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

                      <div className="bg-green-50 p-3 rounded border">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700">
                            Status: Inskickat och väntar på svar
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => moveTenderToPreviousPhase(tender.id)}
                        size="sm"
                        variant="outline"
                        className="text-gray-600"
                      >
                        ← Tillbaka till granskning
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Statistik */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Statistik över inskickade anbud
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500">
              Inskickade totalt
            </div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {total}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-green-600">
              Vunna anbud
            </div>
            <div className="mt-1 text-3xl font-semibold text-green-700">
              {won}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Funktion kommer snart
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-yellow-600">
              Under utvärdering
            </div>
            <div className="mt-1 text-3xl font-semibold text-yellow-700">
              {underReview}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
