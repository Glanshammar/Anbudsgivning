"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import DashboardNav from "./Navbar";

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/" || pathname === "/register" || pathname === "/login";

  if (isAuthPage) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <DashboardNav />
        <main className="py-8">{children}</main>
      </div>
    </div>
  );
};

export default ClientLayout;
