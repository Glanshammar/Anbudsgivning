"use client";

export default function ReviewPage() {
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
        <div className="p-6 text-center text-gray-500">
          Inga anbud i denna fas än.
        </div>
      </div>
    </div>
  );
}
