"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";
import { getTenders, Tender } from "@/services/api/tenders";

export default function InboxPage() {
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
            <h3 className="text-lg font-medium text-gray-900">Upphandlingar</h3>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {tenders.map((tender, idx) => (
                <li key={idx} className="px-4 py-4">
                  <div>Start: {tender.start_date}</div>
                  <div>Slut: {tender.end_date}</div>
                  <div>Anställda: {tender.workforce}</div>
                  <div>Kvalifikationer: {tender.qualifications.join(", ")}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
