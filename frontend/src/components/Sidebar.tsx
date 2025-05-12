"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();

  const menuItems = [
    {
      label: "Inbox Upphandlingar",
      path: "/dashboard/inbox",
    },
    {
      label: "Mina anbud",
      path: "/dashboard/my-tenders",
    },
    {
      label: "Kompetenser",
      path: "/dashboard/competencies",
    },
    {
      label: "Inställningar",
      path: "/dashboard/settings",
    },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative lg:z-0
        `}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">⬡</span>
            </div>
            <span className="text-xl font-semibold">Anbudsgivning</span>
            <span className="text-xs text-gray-400">v.01</span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors
                  ${
                    pathname === item.path
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
