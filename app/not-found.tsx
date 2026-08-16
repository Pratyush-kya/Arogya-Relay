import Link from "next/link";

/**
 * 404 screen. Kept deliberately plain: it must render even when nothing else
 * in the application is working.
 */
export default function NotFound() {
  return (
    <main className="state-page">
      <div className="state-card">
        <span className="eyebrow">PAGE NOT FOUND · 404</span>
        <h1>That page does not exist.</h1>
        <p>
          The link may be out of date, or the page may have been moved. Return to the
          field overview to continue screening and reviewing cases.
        </p>
        <div className="state-actions">
          <Link className="primary-button" href="/">
            Back to overview
          </Link>
        </div>
      </div>
    </main>
  );
}
