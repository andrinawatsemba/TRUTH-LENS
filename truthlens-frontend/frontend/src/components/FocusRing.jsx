const VERDICT_COLORS = {
  high_risk: "#D6553F",
  uncertain: "#B77A1F",
  likely_safe: "#1F9E7A",
  neutral: "#2B3A67",
};

const VERDICT_LABELS = {
  high_risk: "High risk",
  uncertain: "Uncertain",
  likely_safe: "Likely safe",
  neutral: "—",
};

export default function FocusRing({ confidence = 0, verdict = "neutral", size = 128 }) {
  const color = VERDICT_COLORS[verdict] || VERDICT_COLORS.neutral;
  const radius = size * 0.36;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * Math.min(Math.max(confidence, 0), 1);
  const center = size / 2;

  // grip ticks evoking a manual focus ring
  const tickCount = 28;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = (i / tickCount) * 2 * Math.PI;
    const outer = size * 0.47;
    const inner = size * 0.43;
    const x1 = center + outer * Math.cos(angle);
    const y1 = center + outer * Math.sin(angle);
    const x2 = center + inner * Math.cos(angle);
    const y2 = center + inner * Math.sin(angle);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#14171C" strokeOpacity={0.18} strokeWidth={1.5} />;
  });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {ticks}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#E6E7E0" strokeWidth={6} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-medium" style={{ color }}>
          {Math.round(confidence * 100)}%
        </span>
        <span className="text-[10px] uppercase tracking-wide text-ink/60 mt-0.5">
          {VERDICT_LABELS[verdict] || verdict}
        </span>
      </div>
    </div>
  );
}
