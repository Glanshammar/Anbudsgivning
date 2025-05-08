"use client";

import { useRouter } from "next/navigation";
import { logout, getUsername } from "@/utils/auth";
import { useEffect, useState } from "react";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(getUsername());
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="px-4 sm:px-6 h-16 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <span className="text-black text-xl font-medium mx-4">
            DASHBOARD
          </span>
          <span className="ml-2 text-gray-700 text-sm font-medium">
            Hej {username}! 👋
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-700 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md hover:bg-gray-50"
        >
          Logga ut
        </button>
      </div>
    </nav>
  );
}
