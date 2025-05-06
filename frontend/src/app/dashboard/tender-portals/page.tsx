"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout, isAuthenticated } from "@/utils/auth";
import { getPortals } from "@/services/portals";

interface Portal {
  url: string;
  username: string;
  password: string;
}

export default function TenderPortalsPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const fetchPortals = async () => {
      try {
        const portals = await getPortals();
        setPortals(portals);
      } catch (error) {
        console.error("Error fetching portals:", error);
      }
    };
    fetchPortals();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Inbox Upphandlingar
                </Link>
                <Link
                  href="#"
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Mina anbud
                </Link>
                <Link
                  href="/dashboard/tender-portals"
                  className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Tender Portaler
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
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md hover:bg-gray-50"
              >
                Logga ut
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h1 className="text-lg font-medium text-gray-900">
              Tender Portals
            </h1>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {portals.map((portal, idx) => (
                <li key={idx} className="px-4 py-4">
                  <div>{portal.url}</div>
                  <div>{portal.username}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
