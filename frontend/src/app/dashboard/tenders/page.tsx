"use client";

import { useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TendersPage() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine which tab should be active based on current path
  const getActiveTab = () => {
    if (pathname.includes("/inbox")) return "inbox";
    if (pathname.includes("/sort")) return "sort";
    if (pathname.includes("/bid-nobid")) return "bid-nobid";
    if (pathname.includes("/prepare-bid")) return "prepare-bid";
    if (pathname.includes("/submitted")) return "submitted";
    return "inbox"; // default
  };

  const handleTabChange = (value: string) => {
    router.push(`/dashboard/tenders/${value}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div>
        <div className="mb-8 bg-white rounded-lg shadow-sm border">
          <Tabs
            value={getActiveTab()}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="inbox">Nyinkommet</TabsTrigger>
              <TabsTrigger value="sort">Att finsortera</TabsTrigger>
              <TabsTrigger value="bid-nobid">Bid/ No-bid?</TabsTrigger>
              <TabsTrigger value="prepare-bid">Ska bjudas på</TabsTrigger>
              <TabsTrigger value="submitted">Inskickade</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
