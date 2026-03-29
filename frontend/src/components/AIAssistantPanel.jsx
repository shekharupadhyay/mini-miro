import { useState } from "react";
import "./AIAssistantPanel.css";

const API = import.meta.env.VITE_API_BASE;

const MODES = [
  { id: "brainstorm",  label: "Brainstorm" },
  { id: "summarize",   label: "Summarize"  },
  { id: "connections", label: "Connections" },
];

export default function AIAssistantPanel({ notes, shapes }) {
  const [open,    setOpen]    = useState(false);
  const [mode,    setMode]    = useState("brainstorm");
  const [prompt,  setPrompt]  = useState("");
  const [result,  setResult]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleGenerate() {
    setLoading(true);
    setResult("");
    setError("");
    try {
      const res = await fetch(`${API}/api/ai/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prompt, notes, shapes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    setResult("");
    setError("");
  }

  return (
    <div className="ai-panel-root">
      {open && (
        <div className="ai-panel">
          {/* Header */}
          <div className="ai-panel-header">
            <span className="ai-panel-title">✨ AI Assistant</span>
            <button className="ai-panel-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Mode tabs */}
          <div className="ai-panel-tabs">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={`ai-panel-tab ${mode === m.id ? "active" : ""}`}
                onClick={() => handleModeChange(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="ai-panel-body">
            {mode === "brainstorm" && (
              <input
                className="ai-panel-input"
                placeholder="Enter a topic to brainstorm…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
                maxLength={200}
              />
            )}

            <button
              className="ai-panel-btn"
              onClick={handleGenerate}
              disabled={loading || (mode === "brainstorm" && !prompt.trim())}
            >
              {loading ? <span className="ai-panel-spinner" /> : "Generate"}
            </button>

            {/* Output */}
            {(result || error) && (
              <div className={`ai-panel-output ${error ? "error" : ""}`}>
                {error ? error : result}
              </div>
            )}

            {!result && !error && !loading && (
              <p className="ai-panel-hint">
                {mode === "brainstorm" && "Type a topic and generate ideas based on your board."}
                {mode === "summarize"  && "Summarize all notes and shapes currently on the board."}
                {mode === "connections" && "Discover relationships between elements on the board."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        className="ai-panel-fab"
        onClick={() => setOpen((o) => !o)}
        title="AI Assistant"
      >
        ✨
      </button>
    </div>
  );
}
