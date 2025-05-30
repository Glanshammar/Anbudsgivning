"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTenderContext, TenderWithPhase } from "@/contexts/TenderContext";
import { useRouter } from "next/navigation";

const evaluationCriteria = [
  {
    key: "competenceMatch" as const,
    label: "Matchning mot kompetens",
    description: "Hur väl matchar upphandlingen era kärnkompetenser?",
  },
  {
    key: "competitionLevel" as const,
    label: "Konkurrenssituation",
    description: "Hur stark är konkurrensen för denna upphandling?",
  },
  {
    key: "resourceAvailability" as const,
    label: "Resurstillgänglighet",
    description: "Har ni tillräckliga resurser för att genomföra projektet?",
  },
  {
    key: "profitability" as const,
    label: "Lönsamhet",
    description: "Hur lönsamt bedömer ni att projektet kan bli?",
  },
  {
    key: "strategicValue" as const,
    label: "Strategiskt värde",
    description: "Hur viktigt är detta projekt för er långsiktiga strategi?",
  },
];

export default function EvaluationPage() {
  const router = useRouter();
  const {
    getTendersByPhase,
    updateTenderEvaluation,
    moveTenderToPhase,
    moveTenderToPreviousPhase,
  } = useTenderContext();
  const [selectedTender, setSelectedTender] = useState<TenderWithPhase | null>(
    null
  );
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string>("");

  const evaluationTenders = getTendersByPhase("evaluation");

  // Auto-save effect - sparar automatiskt när scores eller notes ändras
  useEffect(() => {
    if (!selectedTender) return;

    // Vänta lite så användaren hinner fylla i flera fält utan att spara för varje klick
    const timeoutId = setTimeout(() => {
      const totalScore = calculateTotalScore();
      const recommendation = getRecommendation(totalScore);

      const evaluation = {
        competenceMatch: scores.competenceMatch || 0,
        competitionLevel: scores.competitionLevel || 0,
        resourceAvailability: scores.resourceAvailability || 0,
        profitability: scores.profitability || 0,
        strategicValue: scores.strategicValue || 0,
        notes,
        totalScore,
        recommendation,
      };

      updateTenderEvaluation(selectedTender.id, evaluation);
      console.log(
        `💾 Auto-saved evaluation for: ${selectedTender.project_name}`
      );
    }, 500); // Spara efter 500ms inaktivitet

    return () => clearTimeout(timeoutId);
  }, [scores, notes, selectedTender]);

  const handleScoreChange = (criterion: string, score: number) => {
    setScores((prev) => {
      // Om användaren klickar på samma betyg igen, ta bort det
      if (prev[criterion] === score) {
        const newScores = { ...prev };
        delete newScores[criterion];
        return newScores;
      }
      // Annars sätt det nya betyget
      return { ...prev, [criterion]: score };
    });
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
  };

  const handleCloseModal = () => {
    setSelectedTender(null);
    setScores({});
    setNotes("");
  };

  const calculateTotalScore = () => {
    const values = Object.values(scores);
    // Kräv att alla 5 kriterier är ifyllda
    if (values.length !== 5) return 0;
    return (
      Math.round(
        (values.reduce((sum, score) => sum + score, 0) / values.length) * 10
      ) / 10
    );
  };

  const getMissingCriteriaCount = () => {
    // Räkna hur många kriterier som saknas baserat på nuvarande scores
    const requiredCriteria = [
      "competenceMatch",
      "competitionLevel",
      "resourceAvailability",
      "profitability",
      "strategicValue",
    ];
    const filledCriteria = requiredCriteria.filter(
      (criterion) => scores[criterion] && scores[criterion] > 0
    );
    return 5 - filledCriteria.length;
  };

  const isEvaluationComplete = (evaluation?: any) => {
    // Om vi har en sparad evaluation, kolla den
    if (evaluation) {
      return (
        evaluation.competenceMatch > 0 &&
        evaluation.competitionLevel > 0 &&
        evaluation.resourceAvailability > 0 &&
        evaluation.profitability > 0 &&
        evaluation.strategicValue > 0
      );
    }
    // Kolla lokala scores - alla 5 kriterier måste ha värden
    const requiredCriteria = [
      "competenceMatch",
      "competitionLevel",
      "resourceAvailability",
      "profitability",
      "strategicValue",
    ];
    return requiredCriteria.every(
      (criterion) => scores[criterion] && scores[criterion] > 0
    );
  };

  const getRecommendation = (
    totalScore: number
  ): "proceed" | "decline" | "pending" => {
    // Endast ge rekommendation om alla kriterier är ifyllda
    if (!isEvaluationComplete()) return "pending";
    if (totalScore >= 4) return "proceed";
    if (totalScore <= 2) return "decline";
    return "pending";
  };

  const handleProceedToDrafts = (tenderId: string) => {
    moveTenderToPhase(tenderId, "drafts");
    router.push("/dashboard/drafts");
  };

  const handleDecline = (tenderId: string) => {
    // Move to a declined phase or remove entirely
    moveTenderToPhase(tenderId, "submitted"); // Using submitted as "archived" for now
  };

  const startEvaluation = (tender: TenderWithPhase) => {
    setSelectedTender(tender);
    if (tender.evaluation) {
      setScores({
        competenceMatch: tender.evaluation.competenceMatch,
        competitionLevel: tender.evaluation.competitionLevel,
        resourceAvailability: tender.evaluation.resourceAvailability,
        profitability: tender.evaluation.profitability,
        strategicValue: tender.evaluation.strategicValue,
      });
      setNotes(tender.evaluation.notes);
    } else {
      setScores({});
      setNotes("");
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "proceed":
        return "text-green-600 bg-green-100";
      case "decline":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case "proceed":
        return "Gå vidare";
      case "decline":
        return "Avböj";
      default:
        return "Avvakta";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Bedömning av upphandlingar
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Här utvärderar du om upphandlingen matchar era kompetenser och om ni
            ska gå vidare med anbudet.
          </p>
        </div>

        {evaluationTenders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Inga upphandlingar i denna fas än.
          </div>
        ) : (
          <div className="p-6">
            {/* Tender List */}
            <div className="space-y-4 mb-8">
              {evaluationTenders.map((tender) => (
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
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
                        <div className="mt-3 flex items-center gap-4">
                          <span className="text-sm font-medium">
                            Totalpoäng: {tender.evaluation.totalScore}/5
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(
                              tender.evaluation.recommendation || "pending"
                            )}`}
                          >
                            {getRecommendationText(
                              tender.evaluation.recommendation || "pending"
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => startEvaluation(tender)}
                        size="sm"
                        variant={tender.evaluation ? "outline" : "default"}
                      >
                        {tender.evaluation
                          ? "Redigera bedömning"
                          : "Starta bedömning"}
                      </Button>

                      {tender.evaluation?.recommendation === "proceed" &&
                        tender.evaluation.competenceMatch > 0 &&
                        tender.evaluation.competitionLevel > 0 &&
                        tender.evaluation.resourceAvailability > 0 &&
                        tender.evaluation.profitability > 0 &&
                        tender.evaluation.strategicValue > 0 && (
                          <Button
                            onClick={() => handleProceedToDrafts(tender.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Gå till utkast
                          </Button>
                        )}

                      {tender.evaluation?.recommendation === "decline" && (
                        <Button
                          onClick={() => handleDecline(tender.id)}
                          size="sm"
                          variant="destructive"
                        >
                          Avböj
                        </Button>
                      )}

                      <Button
                        onClick={() => moveTenderToPreviousPhase(tender.id)}
                        size="sm"
                        variant="outline"
                        className="text-gray-600"
                      >
                        ← Tillbaka till inkommande
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Evaluation Modal/Form */}
            {selectedTender && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Bedöm: {selectedTender.project_name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Betygsätt varje kriterium från 1 (låg) till 5 (hög).
                        </p>
                      </div>
                      <button
                        onClick={handleCloseModal}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-6">
                      {evaluationCriteria.map((criterion) => (
                        <div key={criterion.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {criterion.label}
                          </label>
                          <p className="text-xs text-gray-500 mb-3">
                            {criterion.description}
                          </p>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                onClick={() =>
                                  handleScoreChange(criterion.key, score)
                                }
                                className={`w-10 h-10 rounded-full border-2 text-sm font-medium transition-colors ${
                                  scores[criterion.key] === score
                                    ? "border-blue-500 bg-blue-500 text-white"
                                    : "border-gray-300 text-gray-700 hover:border-blue-300"
                                }`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Anteckningar
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => handleNotesChange(e.target.value)}
                          rows={4}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Lägg till kommentarer eller motivering för din bedömning..."
                        />
                      </div>

                      {Object.keys(scores).length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Totalpoäng:</span>
                            <span className="text-lg font-bold">
                              {calculateTotalScore()}/5
                            </span>
                          </div>
                          <div className="mt-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor(
                                getRecommendation(calculateTotalScore())
                              )}`}
                            >
                              Rekommendation:{" "}
                              {getRecommendationText(
                                getRecommendation(calculateTotalScore())
                              )}
                            </span>
                          </div>
                          {!isEvaluationComplete() && (
                            <div className="mt-2 text-xs text-orange-600">
                              ⚠️ Fyll i alla {getMissingCriteriaCount()}{" "}
                              återstående kriterier för att få korrekt
                              totalpoäng
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
