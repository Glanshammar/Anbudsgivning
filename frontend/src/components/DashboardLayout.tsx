import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl relative flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex-1 min-h-screen">
          <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="p-8 lg:pl-8">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
