"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full space-y-8 p-8 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          Anbudsgivning
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          En plattform för att hantera upphandlingar
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button
            size="lg"
            onClick={() => router.push("/login")}
            className="px-8"
          >
            Logga in
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/register")}
            className="px-8"
          >
            Registrera
          </Button>
        </div>
      </div>
    </div>
  );
}
