const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function analyze({ text, imageBase64, imageMediaType }) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      image_base64: imageBase64 || null,
      image_media_type: imageMediaType || "image/jpeg",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Something went wrong." }));
    throw new Error(err.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function getFraudWatch() {
  const res = await fetch(`${API_BASE}/fraud-watch`);
  if (!res.ok) throw new Error("Could not load Fraud Watch content.");
  return res.json();
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
