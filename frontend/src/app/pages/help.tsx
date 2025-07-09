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
    <div>
      <h1 className="text-3xl font-bold mb-6">Hjälp & Support</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Snabbguide för Anbudsgivning
        </h2>
        <div className="flex gap-4 scroll-horizontal">
          <div className="text-center p-4 bg-blue-50 rounded-lg flex-shrink-0 w-80">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold mb-2">1. Förbered</h3>
            <p className="text-sm text-gray-600">
              Samla alla nödvändiga dokument och information
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg flex-shrink-0 w-80">
            <div className="text-2xl mb-2">✏️</div>
            <h3 className="font-semibold mb-2">2. Fyll i</h3>
            <p className="text-sm text-gray-600">
              Komplettera anbudsformuläret noggrant
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg flex-shrink-0 w-80">
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
    </div>
  );
}
