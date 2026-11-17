"use client";

import { useEffect } from "react";

export default function PrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    // Let fonts settle so the printout doesn't use fallback faces.
    const go = () => window.print();
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setTimeout(go, 150));
    } else {
      setTimeout(go, 400);
    }
  }, [autoPrint]);

  return (
    <button type="button" className="zy-button zy-print-button" onClick={() => window.print()}>
      Print
    </button>
  );
}
