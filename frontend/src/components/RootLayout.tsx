"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

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
      {children}
    </div>
  );
};

export default ClientLayout;
