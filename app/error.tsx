"use client";

import Link from "next/link";

/**
 * Route-level error boundary.
 *
 * Shows a calm, plain-language recovery screen instead of a stack trace. In
 * production React only passes a digest here, never the original message, so
 * nothing internal is exposed to a field worker or an attacker.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="state-page" role="alert">
      <div className="state-card">
        <span className="eyebrow">SOMETHING INTERRUPTED THIS SCREEN</span>
        <h1>This screen could not load.</h1>
        <p>
          Your saved screenings are still stored safely on this device. Nothing has been
          lost. Try loading the screen again, and if it keeps failing, continue on paper
          and report the problem to your supervisor.
        </p>
        <div className="state-actions">
          <button className="primary-button" onClick={() => reset()}>
            Try again
          </button>
          <Link className="secondary-button" href="/">
            Back to overview
          </Link>
        </div>
      </div>
    </main>
  );
}
