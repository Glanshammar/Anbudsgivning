"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to tenders inbox by default
    router.replace("/dashboard/tenders/inbox");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl text-gray-600">Omdirigerar till Tenders...</h2>
      </div>
    </div>
  );
}
