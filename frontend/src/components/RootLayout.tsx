"use client";

import { usePathname } from "next/navigation";

interface ClientLayoutProps {
  children: React.ReactNode;
}

/**
 * Root Layout Component - Handles app-wide layout structure
 * Conditionally applies dashboard layout vs. auth page layout
 */
const ClientLayout = ({ children }: ClientLayoutProps) => {
  const pathname = usePathname();
  // Determine if current page is an authentication page that doesn't need dashboard layout
  const isAuthPage =
    pathname === "/" || pathname === "/register" || pathname === "/login";

  // Auth pages get minimal layout (no dashboard navigation/structure)
  if (isAuthPage) {
    return children;
  }

  // Dashboard pages get full layout with navigation structure
  return (
    <div className="w-full h-screen flex flex-col bg-gray-50/50">
      <main className="w-full flex-1 flex flex-col">{children}</main>
    </div>
  );
};

export default ClientLayout;
