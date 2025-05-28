"use client";

import { TenderProvider } from "@/contexts/TenderContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenderProvider>{children}</TenderProvider>;
}
