"use client";

import { useState } from "react";

const faqItems = [
  {
    question: "Hur skapar jag en ny anbudsgivning?",
    answer:
      "Gå till Dashboard och klicka på 'Ny Anbudsgivning'. Fyll i alla obligatoriska fält markerade med *. Se till att ladda upp alla nödvändiga dokument innan du skickar in anbudet.",
  },
  {
    question: "Vilka dokument behöver jag ladda upp?",
    answer:
      "Vanligtvis behöver du: Teknisk specifikation, Prismodell, Företagsinformation, Referenser, och eventuella certifikat. Kontrollera specifika krav för varje upphandling.",
  },
  {
    question: "Hur vet jag om mitt anbud har skickats in korrekt?",
    answer:
      "Du får en bekräftelse via e-post och kan se status 'Inskickat' på ditt anbud i Dashboard. Du kan även se tidsstämpel för när anbudet skickades in.",
  },
  {
    question: "Kan jag ändra mitt anbud efter att jag skickat in det?",
    answer:
      "Det beror på upphandlingens regler. Vissa upphandlingar tillåter ändringar fram till sista datum, andra inte. Kontakta upphandlande myndighet om du behöver göra ändringar.",
  },
  {
    question: "Vad betyder de olika statusarna?",
    answer:
      "Utkast = Ej inskickat, Under granskning = Väntar på utvärdering, Godkänt = Ditt anbud har godkänts, Avslått = Anbudet uppfyllde inte kraven, Vunnet = Du har vunnit upphandlingen.",
  },
];

export default function HelpPage() {
  const [activeItem, setActiveItem] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setActiveItem(activeItem === index ? null : index);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Hjälp & Support</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Snabbguide för Anbudsgivning
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold mb-2">1. Förbered</h3>
            <p className="text-sm text-gray-600">
              Samla alla nödvändiga dokument och information
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">✏️</div>
            <h3 className="font-semibold mb-2">2. Fyll i</h3>
            <p className="text-sm text-gray-600">
              Komplettera anbudsformuläret noggrant
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🚀</div>
            <h3 className="font-semibold mb-2">3. Skicka</h3>
            <p className="text-sm text-gray-600">
              Granska och skicka in ditt anbud
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Vanliga Frågor</h2>
        <div className="space-y-2">
          {faqItems.map((item, index) => (
            <div key={index} className="border rounded-lg">
              <button
                className="w-full text-left p-4 hover:bg-gray-50 flex justify-between items-center"
                onClick={() => toggleItem(index)}
              >
                <span className="font-medium">{item.question}</span>
                <svg
                  className={`h-5 w-5 transform transition-transform ${
                    activeItem === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {activeItem === index && (
                <div className="px-4 pb-4 text-gray-600">{item.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold mb-2">Behöver du mer hjälp?</h3>
        <p className="text-gray-700 mb-4">
          Kontakta vår support om du inte hittar svar på din fråga här.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-blue-600 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>support@anbudsgivning.se</span>
          </div>
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-green-600 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>08-123 456 78</span>
          </div>
        </div>
      </div>
    </div>
  );
}
