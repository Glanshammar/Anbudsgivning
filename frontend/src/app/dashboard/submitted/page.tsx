"use client";

export default function SubmittedPage() {
  // Dummyvärden för statistik
  const total = 0;
  const won = 0;
  const underReview = 0;

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
        <div className="p-6 text-center text-gray-500">
          Inga inskickade anbud hittades.
        </div>
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
