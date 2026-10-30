"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ZyLogin({ heading }: { heading: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/zichronyonatan/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form className="zy-panel zy-login" onSubmit={submit}>
      <h1 className="zy-parsha-h1">{heading}</h1>
      <p className="zy-form-hint">Enter the Zichron Yonatan password to continue.</p>
      <label className="zy-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
      </label>
      {error && <p className="zy-form-error" role="alert">{error}</p>}
      <button className="zy-button" disabled={busy || !password}>
        {busy ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
