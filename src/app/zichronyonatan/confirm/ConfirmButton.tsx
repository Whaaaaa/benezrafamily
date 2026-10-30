"use client";

import { useState } from "react";

export default function ConfirmButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function confirm() {
    setState("busy");
    const res = await fetch(`/api/zichronyonatan/subscribe/confirm?token=${encodeURIComponent(token)}`, {
      method: "POST",
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <p className="zy-notice">
        You&apos;re subscribed. The next Dvar Torah will arrive on Friday before Shabbat. Shabbat Shalom!{" "}
        <a href="/zichronyonatan">Back to the archive</a>
      </p>
    );
  }

  return (
    <>
      {state === "error" && <p className="zy-form-error">This link has expired or was already used.</p>}
      <button className="zy-button" onClick={confirm} disabled={state === "busy"}>
        {state === "busy" ? "Confirming…" : "Confirm my subscription"}
      </button>
    </>
  );
}
