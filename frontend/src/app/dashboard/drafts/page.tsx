"use client";

export default function DraftsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Pågående utkast
          </h3>
        </div>
        <div className="p-6 text-center text-gray-500">
          Inga utkast i denna fas än.
        </div>
      </div>
    </div>
  );
}
