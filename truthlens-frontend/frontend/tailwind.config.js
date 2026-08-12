/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14171C",
        paper: "#F2F3EF",
        "paper-dim": "#E6E7E0",
        lens: "#2B3A67",
        "lens-light": "#4C5C8C",
        risk: "#D6553F",
        "risk-bg": "#FBEAE6",
        caution: "#B77A1F",
        "caution-bg": "#FBF0DD",
        safe: "#1F9E7A",
        "safe-bg": "#E4F5EF",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
