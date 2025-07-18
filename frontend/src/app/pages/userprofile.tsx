"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, updateProfile } from "@/services/api/profile";
import { logout } from "@/utils/auth";

export default function UserProfile() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userProfile = await getProfile();
        setUsername(userProfile.username || "");
        setEmail(userProfile.email || "");
      } catch (error) {
        console.error("Error loading user profile:", error);
        setError("Kunde inte ladda användarens profil");
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await updateProfile({ username });
      setMessage("Användarnamn uppdaterat");
    } catch (err: any) {
      setError(err.message || "Misslyckades med att uppdatera användarnamn");
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await updateProfile({ email });
      setMessage("E-post uppdaterad");
    } catch (err: any) {
      setError(err.message || "Misslyckades med att uppdatera e-post");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Nya lösenorden matchar inte");
      return;
    }

    try {
      await updateProfile({ password: newPassword });
      setMessage("Lösenord uppdaterat");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Misslyckades med att uppdatera lösenord");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <span className="text-gray-500 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Användarprofil</h1>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6 mb-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Byt användarnamn</h2>
        <form onSubmit={handleUsernameChange}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 mb-2">
              Nytt användarnamn
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Uppdatera användarnamn
          </button>
        </form>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Byt e-post</h2>
        <form onSubmit={handleEmailChange}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Ny e-post
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Uppdatera e-post
          </button>
        </form>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Byt lösenord</h2>
        <form onSubmit={handlePasswordChange}>
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-gray-700 mb-2">
              Nytt lösenord
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="confirmPassword"
              className="block text-gray-700 mb-2"
            >
              Bekräfta nytt lösenord
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Uppdatera lösenord
          </button>
        </form>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 border-t-4 border-red-500 max-w-2xl">
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logga ut
        </button>
      </div>
    </div>
  );
}
