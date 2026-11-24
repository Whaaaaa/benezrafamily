"use client";

import { useState } from "react";

/** Asks for an address and emails that address its personal unsubscribe link. */
export default function UnsubscribeRequest() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError("");
    const res = await fetch("/api/zichronyonatan/unsubscribe/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("idle");
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <p className="zy-notice" role="status">
        If <strong>{email.trim()}</strong> is on the mailing list, we&apos;ve just sent it a link to
        unsubscribe. Check that inbox (and its spam folder).
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <p>Enter the address you get the weekly email at, and we&apos;ll email it a link to unsubscribe.</p>
      <label className="zy-field">
        <span>Email address</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      {error && <p className="zy-form-error">{error}</p>}
      <div className="zy-actions">
        <button className="zy-button" disabled={state === "busy"}>
          {state === "busy" ? "Sending…" : "Email me the link"}
        </button>
      </div>
    </form>
  );
}
