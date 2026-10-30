"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteEssay({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    const res = await fetch(`/api/zichronyonatan/essays/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/zichronyonatan/manage");
      router.refresh();
    } else {
      setBusy(false);
      setError("Couldn't delete it — please try again.");
    }
  }

  return (
    <section className="zy-danger">
      <h2>Delete this Dvar Torah</h2>
      <p className="zy-form-hint">
        Removes &ldquo;{title}&rdquo; from the site. This can&apos;t be undone.
      </p>
      {error && <p className="zy-form-error">{error}</p>}
      <div className="zy-actions">
        <button
          type="button"
          className={"zy-button zy-button-quiet" + (confirming ? " zy-button-warn" : "")}
          onClick={remove}
          disabled={busy}
        >
          {busy ? "Deleting…" : confirming ? "Yes, delete it" : "Delete"}
        </button>
        {confirming && !busy && (
          <button type="button" className="zy-link-button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
