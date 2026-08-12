import { NavLink } from "react-router-dom";

function LensMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#2B3A67" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5.5" stroke="#2B3A67" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.6" fill="#2B3A67" />
    </svg>
  );
}

const linkClass = ({ isActive }) =>
  `text-sm font-medium px-3 py-2 rounded-md transition-colors ${
    isActive ? "bg-lens text-paper" : "text-ink/70 hover:text-ink hover:bg-paper-dim"
  }`;

export default function Nav() {
  return (
    <header className="border-b border-paper-dim">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LensMark />
          <span className="font-display font-semibold text-lg tracking-tight">TruthLens</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>Analyzer</NavLink>
          <NavLink to="/fraud-watch" className={linkClass}>Fraud Watch</NavLink>
        </nav>
      </div>
    </header>
  );
}
