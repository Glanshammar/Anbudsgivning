"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";
import { getTenders, Tender } from "@/services/api/tenders";

// Default dashboard page with inbox of tenders

export default function Dashboard() {
  const router = useRouter();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    if (authChecked) {
      const fetchTenders = async () => {
        try {
          const data = await getTenders();
          setTenders(data);
        } catch (error) {
          console.error("Error fetching tenders:", error);
        }
      };
      fetchTenders();
    }
  }, [authChecked]);

  if (!authChecked) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <span className="text-gray-500 text-lg">Laddar...</span>
      </div>
    );
  }

  return (
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
          <Link href="/dashboard/inbox"></Link>
          <ul className="list-disc pl-5">
            {tenders.map((tender, index) => (
              <li key={index} className="text-gray-700">
                {tender.project_name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
