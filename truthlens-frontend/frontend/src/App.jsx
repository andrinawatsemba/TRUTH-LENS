import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Analyzer from "./pages/Analyzer.jsx";
import FraudWatch from "./pages/FraudWatch.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <Routes>
        <Route path="/" element={<Analyzer />} />
        <Route path="/fraud-watch" element={<FraudWatch />} />
      </Routes>
    </div>
  );
}
