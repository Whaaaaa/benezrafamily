"use client";

import { useState } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("busy");
    const res = await fetch("/api/zichronyonatan/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, website }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("sent");
    } else {
      setState("idle");
      setError(data.error || "Something went wrong — please try again.");
    }
  }

  return (
    <section className="zy-subscribe" aria-labelledby="zy-subscribe-title">
      <div className="zy-subscribe-text">
        <h2 id="zy-subscribe-title">Get the weekly Dvar Torah by email</h2>
        <p>Every Friday before Shabbat. Unsubscribe anytime.</p>
      </div>
      {state === "sent" ? (
        <p className="zy-notice zy-subscribe-done" role="status">
          Almost done &mdash; check <strong>{email}</strong> for a confirmation link.
        </p>
      ) : (
        <form className="zy-subscribe-form" onSubmit={submit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            aria-label="Your name (optional)"
            autoComplete="name"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            autoComplete="email"
            required
          />
          <input
            type="text"
            className="zy-hp"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            name="website"
          />
          <button className="zy-button" disabled={state === "busy"}>
            {state === "busy" ? "Subscribing…" : "Subscribe"}
          </button>
          {error && (
            <p className="zy-form-error zy-subscribe-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
