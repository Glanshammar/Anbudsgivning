"use client";

import Link from "next/link";
import { useState } from "react";

// Mock data for testing
const mockData = {
  newTenders: 5,
  activeBids: 2,
  quickStatus: {
    won: 1,
    pending: 1,
  },
  tenders: [
    {
      id: 1,
      title: "IT-konsultstöd",
      portal: "Opic",
      deadline: "2025-05-15",
      matching: "Mycket bra",
    },
    {
      id: 2,
      title: "Städservice",
      portal: "Mercell",
      deadline: "2025-05-20",
      matching: "God",
    },
  ],
};

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">LOGO</div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="#"
                  className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Hitta Upphandlingar
                </Link>
                <Link
                  href="#"
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Mina anbud
                </Link>
                <Link
                  href="#"
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Kompetenser
                </Link>
                <Link
                  href="#"
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Inställningar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">Nya upphandlingar</p>
              <p className="text-2xl font-bold">{mockData.newTenders}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">Aktiva anbud</p>
              <p className="text-2xl font-bold">{mockData.activeBids}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">Snabbstatus</p>
              <p className="text-2xl font-bold">
                {mockData.quickStatus.won} vunnet,{" "}
                {mockData.quickStatus.pending} väntar
              </p>
            </div>
          </div>
        </div>

        {/* Tender List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Upphandlingar</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Sök..."
                className="border rounded-md px-3 py-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {mockData.tenders.map((tender) => (
                <li key={tender.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium">{tender.title}</h4>
                      <p className="text-sm text-gray-500">
                        Portal: {tender.portal}
                      </p>
                      <p className="text-sm text-gray-500">
                        Deadline: {tender.deadline}
                      </p>
                      <p className="text-sm text-gray-500">
                        Matching: {tender.matching}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        Visa mer
                      </button>
                      <button className="text-gray-600 hover:text-gray-800">
                        Bedöm
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
