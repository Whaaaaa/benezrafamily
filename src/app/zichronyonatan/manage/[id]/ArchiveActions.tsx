"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; title: string; edited: boolean; hidden: boolean };

/** Archive essays can't be deleted (they live in git): hide or revert instead. */
export default function ArchiveActions({ id, title, edited, hidden }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"hide" | "revert" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(action: "hide" | "restore" | "revert") {
    if ((action === "hide" || action === "revert") && confirming !== action) return setConfirming(action);
    setBusy(true);
    setError("");
    const body = action === "revert" ? { revert: true } : { hidden: action === "hide" };
    const res = await fetch(`/api/zichronyonatan/essays/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setConfirming(null);
    if (!res.ok) {
      setError("Something went wrong — please try again.");
      return;
    }
    // A full reload re-seeds the editor with the reverted text.
    if (action === "revert") window.location.reload();
    else router.refresh();
  }

  return (
    <section className="zy-danger">
      <h2>{hidden ? "Hidden from the site" : "Hide or revert"}</h2>
      <p className="zy-form-hint">
        {hidden
          ? `“${title}” isn't shown anywhere on the site right now.`
          : "Hiding takes it off the site without losing anything; you can restore it anytime."}
        {edited && " Reverting discards every change made on the site and goes back to the archive original."}
      </p>
      {error && <p className="zy-form-error">{error}</p>}
      <div className="zy-actions">
        {hidden ? (
          <button type="button" className="zy-button" onClick={() => patch("restore")} disabled={busy}>
            Restore to site
          </button>
        ) : (
          <button
            type="button"
            className={"zy-button zy-button-quiet" + (confirming === "hide" ? " zy-button-warn" : "")}
            onClick={() => patch("hide")}
            disabled={busy}
          >
            {confirming === "hide" ? "Yes, hide it" : "Hide from site"}
          </button>
        )}
        {edited && (
          <button
            type="button"
            className={"zy-button zy-button-quiet" + (confirming === "revert" ? " zy-button-warn" : "")}
            onClick={() => patch("revert")}
            disabled={busy}
          >
            {confirming === "revert" ? "Yes, revert to original" : "Revert to original"}
          </button>
        )}
        {confirming && !busy && (
          <button type="button" className="zy-link-button" onClick={() => setConfirming(null)}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
