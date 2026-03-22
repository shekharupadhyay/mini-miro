import { useState } from "react";
import "./AIRefineModal.css";

const API = import.meta.env.VITE_API_BASE;

/**
 * Props:
 *   originalText  — the current text on the note/shape
 *   onAccept(refined) — called when user clicks "Use this"
 *   onClose       — called when user clicks "Keep original" or X
 */
export default function AIRefineModal({ originalText, onAccept, onClose }) {
  const [refined,  setRefined]  = useState(null);   // null = not fetched yet
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Called once when the modal mounts — kick off the API call immediately
  // We use a button instead so the user can see the original before AI runs
  async function refine() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/ai/refine`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: originalText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setRefined(data.refined);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>

        <div className="ai-modal-header">
          <span className="ai-modal-title">✨ Refine with AI</span>
          <button className="ai-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Original text */}
        <div className="ai-modal-section-label">Original</div>
        <div className="ai-modal-text original">{originalText || <em>Empty note</em>}</div>

        {/* Refined text — shown after fetch */}
        {refined !== null && (
          <>
            <div className="ai-modal-section-label">Refined</div>
            <div className="ai-modal-text refined">{refined}</div>
          </>
        )}

        {error && <div className="ai-modal-error">{error}</div>}

        <div className="ai-modal-actions">
          {/* Before fetching — show the Refine button */}
          {refined === null && !loading && (
            <button className="ai-modal-btn primary" onClick={refine}>
              ✨ Refine
            </button>
          )}

          {/* Loading spinner */}
          {loading && (
            <button className="ai-modal-btn primary" disabled>
              <span className="ai-spinner" /> Thinking…
            </button>
          )}

          {/* After fetching — show accept / retry */}
          {refined !== null && (
            <>
              <button className="ai-modal-btn primary" onClick={() => onAccept(refined)}>
                Use this
              </button>
              <button className="ai-modal-btn" onClick={refine}>
                Try again
              </button>
            </>
          )}

          <button className="ai-modal-btn" onClick={onClose}>
            Keep original
          </button>
        </div>

      </div>
    </div>
  );
}
