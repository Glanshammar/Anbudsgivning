"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "./DashboardLayout";

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const pathname = usePathname();
  const isAuthPage = pathname === "/" || pathname === "/register";

  if (isAuthPage) {
    return children;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

export default ClientLayout;
