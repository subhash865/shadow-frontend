"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isServerBusy =
    String(error?.message || "").includes("503") ||
    String(error?.digest || "").includes("503");

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card max-w-md w-full text-center">
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-[var(--text-dim)] mb-6">
          {isServerBusy
            ? "Server is busy right now. Please retry in a few seconds."
            : "We hit an unexpected error. Please try again."}
        </p>
        <button type="button" onClick={() => reset()} className="btn btn-primary w-full">
          Retry
        </button>
      </div>
    </div>
  );
}
