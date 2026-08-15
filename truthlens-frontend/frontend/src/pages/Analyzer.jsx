import { useState, useRef } from "react";
import { analyze, fileToBase64 } from "../api.js";
import VerdictCard from "../components/VerdictCard.jsx";
import fraudHeroImg from "../assets/fraud-hero.jpg";

export default function Analyzer() {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let imageBase64 = null;
      let imageMediaType = null;
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
        imageMediaType = imageFile.type;
      }
      const data = await analyze({ text, imageBase64, imageMediaType });
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong while analyzing this.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="relative rounded-2xl overflow-hidden mb-10 h-56 md:h-64">
        <img src={fraudHeroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-lens/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-end text-center p-6 md:p-8">
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-paper">
            Bring the claim into focus
          </h1>
          <p className="mt-3 text-paper/80 max-w-xl">
            Verify suspicious messages instantly and learn to spot the next scam.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border border-paper-dim rounded-2xl bg-white p-2 focus-within:border-lens transition-colors">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a message, email, or claim to check…"
            rows={5}
            className="w-full resize-none px-4 py-3 bg-transparent outline-none text-ink placeholder:text-ink/35"
          />

          {imagePreview && (
            <div className="px-4 pb-2">
              <div className="relative inline-block">
                <img src={imagePreview} alt="Attached preview" className="h-20 rounded-lg border border-paper-dim" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-paper text-xs flex items-center justify-center"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <label className="text-sm text-lens hover:text-lens-light cursor-pointer transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              + Attach image
            </label>

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="bg-lens text-paper text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-lens-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-6 border border-risk rounded-xl p-4 bg-risk-bg text-risk text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8">
          <VerdictCard result={result} />
        </div>
      )}
    </div>
  );
}
