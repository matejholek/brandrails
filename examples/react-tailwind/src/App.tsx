export function App() {
  return (
    <main className="bg-surface text-ink font-sans p-8">
      <section className="bg-surface-raised border border-border rounded-md shadow-card p-4">
        <h1 className="text-ink">Weekly reading list</h1>
        <p className="text-ink-muted">Three articles saved this week.</p>
        <button className="bg-accent hover:bg-accent-hover text-surface rounded-full px-4 py-2">
          Open list
        </button>
      </section>
    </main>
  );
}
