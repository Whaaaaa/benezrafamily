"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Incorrect password. Try again.");
      setPassword("");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-black tracking-tight mb-2"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ✨ BenEzra Family
          </h1>
          <p className="text-gray-500 font-medium">Enter the password to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-5"
        >
          <div
            className="h-1 rounded-full -mt-2 mb-1"
            style={{
              background:
                "linear-gradient(90deg, #7C3AED, #EC4899, #F59E0B, #10B981, #3B82F6, #7C3AED)",
            }}
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-600 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 text-gray-800 font-semibold text-lg focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
            />
          </div>

          {error && (
            <p className="text-center text-sm font-semibold text-red-500 bg-red-50 rounded-xl py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-2xl font-black text-white text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            }}
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
