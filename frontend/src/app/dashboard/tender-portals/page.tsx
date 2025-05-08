"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";
import { getPortals } from "@/services/api/portals";

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

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
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
