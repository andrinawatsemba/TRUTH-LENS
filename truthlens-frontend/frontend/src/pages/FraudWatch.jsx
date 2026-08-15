import { useEffect, useMemo, useState } from "react";
import { getFraudWatch } from "../api.js";
import scamAlertImg from "../assets/scam-alert.jpg";

export default function FraudWatch() {
  const [data, setData] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    getFraudWatch().then(setData).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.entries.filter((entry) => {
      const matchesCategory = activeCategory === "all" || entry.category_id === activeCategory;
      const matchesQuery =
        !query.trim() ||
        entry.title.toLowerCase().includes(query.toLowerCase()) ||
        entry.summary.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [data, activeCategory, query]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="relative rounded-2xl overflow-hidden mb-8 h-52 md:h-60">
        <img src={scamAlertImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-lens/50" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-paper">
            Fraud Watch
          </h1>
          <p className="mt-2 text-paper/80 max-w-xl">
            Current scam and manipulation tactics, kept current so you can recognize them before
            they reach you.
          </p>
        </div>
      </div>

      {error && <p className="text-risk text-sm">{error}</p>}

      {data && (
        <>
          <div className="flex flex-col md:flex-row gap-3 mb-8">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tactics…"
              className="flex-1 border border-paper-dim rounded-lg px-4 py-2.5 bg-white outline-none focus:border-lens transition-colors text-sm"
            />
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveCategory("all")}
                className={`whitespace-nowrap text-sm px-3 py-2 rounded-full border transition-colors ${
                  activeCategory === "all"
                    ? "bg-lens text-paper border-lens"
                    : "border-paper-dim text-ink/70 hover:border-lens"
                }`}
              >
                All
              </button>
              {data.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap text-sm px-3 py-2 rounded-full border transition-colors ${
                    activeCategory === cat.id
                      ? "bg-lens text-paper border-lens"
                      : "border-paper-dim text-ink/70 hover:border-lens"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map((entry) => (
              <article key={entry.id} className="border border-paper-dim rounded-2xl bg-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display font-semibold text-lg text-ink">{entry.title}</h2>
                  <span className="font-mono text-[10px] text-ink/40">{entry.last_updated}</span>
                </div>
                <p className="text-sm text-ink/70 leading-relaxed mb-4">{entry.summary}</p>

                <div className="mb-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-risk mb-1.5">Red flags</h3>
                  <ul className="space-y-1">
                    {entry.red_flags.map((flag, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-risk mt-0.5">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-safe mb-1.5">
                    Protect yourself
                  </h3>
                  <ul className="space-y-1">
                    {entry.prevention_tips.map((tip, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-safe mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-ink/50 text-sm text-center py-12">
              Nothing matches that search. Try a different term or category.
            </p>
          )}
        </>
      )}
    </div>
  );
}
