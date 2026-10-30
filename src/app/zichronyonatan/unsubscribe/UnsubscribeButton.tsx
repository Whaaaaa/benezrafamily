"use client";

import { useState } from "react";

export default function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function unsubscribe() {
    setState("busy");
    const res = await fetch(`/api/zichronyonatan/unsubscribe?token=${encodeURIComponent(token)}`, {
      method: "POST",
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <p className="zy-notice">
        You&apos;ve been unsubscribed. The archive is always here at{" "}
        <a href="/zichronyonatan">Zichron Yonatan</a>.
      </p>
    );
  }

  return (
    <>
      {state === "error" && <p className="zy-form-error">Something went wrong — please try again.</p>}
      <button className="zy-button" onClick={unsubscribe} disabled={state === "busy"}>
        {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
      </button>
    </>
  );
}
