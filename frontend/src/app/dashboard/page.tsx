"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout, isAuthenticated } from "@/utils/auth";
import { getTenders, Tender } from "@/services/api/tenders";

// Default dashboard page with inbox of tenders

export default function Dashboard() {
  const router = useRouter();
  const [tenders, setTenders] = useState<Tender[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const data = await getTenders();
        setTenders(data);
      } catch (error) {
        console.error("Error fetching tenders:", error);
      }
    };
    fetchTenders();
  }, []);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Välkommen till din Dashboard
            </h1>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Senaste upphandlingar
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
