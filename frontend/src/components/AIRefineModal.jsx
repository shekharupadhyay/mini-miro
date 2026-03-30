import { useEffect, useState } from "react";
import "./AIRefineModal.css";

const API = import.meta.env.VITE_API_BASE;

export default function AIRefineModal({ text, type, onAccept, onClose }) {
  const [refined, setRefined] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => { refine(); }, []); // eslint-disable-line

  async function refine() {
    setLoading(true);
    setError("");
    setRefined("");
    try {
      const res = await fetch(`${API}/api/ai/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setRefined(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="refine-overlay" onMouseDown={onClose}>
      <div className="refine-modal" onMouseDown={(e) => e.stopPropagation()}>

        <div className="refine-header">
          <span className="refine-title">✨ AI Refine</span>
          <button className="refine-close" onClick={onClose}>✕</button>
        </div>

        <div className="refine-body">
          <div className="refine-col">
            <div className="refine-col-label">Original</div>
            <div className="refine-text">
              {text?.trim() ? text : <span className="refine-empty">No text</span>}
            </div>
          </div>

          <div className="refine-arrow">→</div>

          <div className="refine-col">
            <div className="refine-col-label">Refined</div>
            <div className={`refine-text refined ${loading ? "loading" : ""}`}>
              {loading && <span className="refine-spinner" />}
              {!loading && error   && <span className="refine-error">{error}</span>}
              {!loading && !error  && (refined || <span className="refine-empty">—</span>)}
            </div>
          </div>
        </div>

        <div className="refine-footer">
          <button className="refine-btn secondary" onClick={onClose}>Cancel</button>
          {error && (
            <button className="refine-btn secondary" onClick={refine}>Retry</button>
          )}
          <button
            className="refine-btn primary"
            disabled={!refined || loading}
            onClick={() => onAccept(refined)}
          >
            Accept
          </button>
        </div>

      </div>
    </div>
  );
}
