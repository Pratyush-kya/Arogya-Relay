/**
 * Loading state shown while the dashboard route is being prepared.
 * Uses a skeleton rather than a spinner so the layout does not shift (CLS).
 */
export default function Loading() {
  return (
    <main className="state-page" aria-busy="true" aria-live="polite">
      <div className="state-card">
        <span className="eyebrow">LOADING</span>
        <h1>Preparing your field overview…</h1>
        <p>Reading the screenings stored on this device.</p>
        <div className="skeleton-stack" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
    </main>
  );
}
