import FocusRing from "./FocusRing.jsx";

const VERDICT_STYLES = {
  high_risk: { border: "border-risk", bg: "bg-risk-bg", text: "text-risk" },
  uncertain: { border: "border-caution", bg: "bg-caution-bg", text: "text-caution" },
  likely_safe: { border: "border-safe", bg: "bg-safe-bg", text: "text-safe" },
};

export default function VerdictCard({ result }) {
  const style = VERDICT_STYLES[result.llm_verdict] || VERDICT_STYLES.uncertain;

  return (
    <div className={`border-2 ${style.border} rounded-2xl p-6 md:p-8 bg-white`}>
      <div className="flex flex-col md:flex-row gap-6 md:items-start">
        <FocusRing confidence={result.llm_confidence} verdict={result.llm_verdict} />

        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-mono ${style.bg} ${style.text}`}>
                ML classifier: {result.ml_verdict} ({Math.round(result.ml_confidence * 100)}%)
              </span>
            </div>
            <p className="mt-3 text-ink leading-relaxed">{result.explanation}</p>
          </div>

          {result.recommended_actions?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-ink/70 mb-2">What to do next</h3>
              <ul className="space-y-1.5">
                {result.recommended_actions.map((action, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-lens mt-0.5">→</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-paper-dim pt-3">
            <p className="text-xs text-ink/50 leading-relaxed">
              <span className="font-medium">Limitations: </span>
              {result.limitations}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
