"use client";


export default function EvaluationPage() {

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
        <div className="p-6 text-center text-gray-500">
          Inga upphandlingar i denna fas än.
        </div>
      </div>
    </div>
  );
}
