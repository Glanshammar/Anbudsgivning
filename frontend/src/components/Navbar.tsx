"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const tabs = [
  {
    label: "Inkommande",
    path: "/dashboard/inbox",
  },
  {
    label: "Bedömning",
    path: "/dashboard/evaluation",
  },
  {
    label: "Utkast",
    path: "/dashboard/drafts",
  },
  {
    label: "Granskning",
    path: "/dashboard/review",
  },
  {
    label: "Inskickade",
    path: "/dashboard/submitted",
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white relative">
      {/* Desktop nav */}
      <div className="hidden md:flex overflow-x-auto px-4">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            className={`whitespace-nowrap px-4 py-4 text-sm font-medium border-b-2 transition-colors duration-150
              ${
                pathname === tab.path
                  ? "border-indigo-600 text-indigo-600 bg-gray-50"
                  : "border-transparent text-gray-500 hover:text-indigo-600 hover:border-gray-300"
              }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {/* Mobile hamburger */}
      <div className="flex md:hidden items-center px-4 h-14">
        <button
          aria-label="Öppna meny"
          onClick={() => setOpen(true)}
          className="p-2 rounded hover:bg-gray-100 focus:outline-none"
        >
          <svg
            className="h-6 w-6 text-gray-700"
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
      </div>
      {/* Mobile menu overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex">
          <div className="bg-white w-64 h-full shadow-lg p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold">Meny</span>
              <button
                aria-label="Stäng meny"
                onClick={() => setOpen(false)}
                className="p-2 rounded hover:bg-gray-100 focus:outline-none"
              >
                <svg
                  className="h-6 w-6 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                href={tab.path}
                onClick={() => setOpen(false)}
                className={`block px-2 py-2 rounded text-base font-medium transition-colors
                  ${
                    pathname === tab.path
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          {/* Klick utanför menyn stänger */}
          <div className="flex-1" onClick={() => setOpen(false)} />
        </div>
      )}
    </nav>
  );
}
