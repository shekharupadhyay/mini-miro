import { useEffect, useRef, useReducer } from "react";

const INIT = { renaming: false, draft: "", error: "", busy: false };

function renameReducer(state, action) {
  switch (action.type) {
    case "START":  return { renaming: true, draft: action.boardName, error: "", busy: false };
    case "CHANGE": return { ...state, draft: action.value, error: "" };
    case "BUSY":   return { ...state, busy: true, error: "" };
    case "DONE":   return { ...state, renaming: false, busy: false };
    case "ERROR":  return { ...state, busy: false, error: action.message };
    case "CANCEL": return INIT;
    default:       return state;
  }
}

export default function BoardNameEditor({ boardName, isAdmin, onRename }) {
  const [state, dispatch] = useReducer(renameReducer, INIT);
  const { renaming, draft, error, busy } = state;
  const renameRef = useRef(null);

  // Focus + select input text when entering rename mode
  useEffect(() => {
    if (renaming) setTimeout(() => renameRef.current?.select(), 0);
  }, [renaming]);

  async function commitRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === boardName) { dispatch({ type: "CANCEL" }); return; }
    dispatch({ type: "BUSY" });
    try {
      await onRename(trimmed);
      dispatch({ type: "DONE" });
    } catch (err) {
      dispatch({ type: "ERROR", message: err.message || "Rename failed" });
    }
  }

  if (renaming) {
    return (
      <div className="board-rename-wrap">
        <input
          ref={renameRef}
          className="board-rename-input"
          value={draft}
          onChange={(e) => dispatch({ type: "CHANGE", value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter")  { e.preventDefault(); commitRename(); }
            if (e.key === "Escape") dispatch({ type: "CANCEL" });
          }}
          disabled={busy}
          maxLength={40}
        />
        <button className="board-rename-ok" onClick={commitRename}
          disabled={busy || !draft.trim()} title="Save">✓</button>
        <button className="board-rename-cancel" onClick={() => dispatch({ type: "CANCEL" })}
          disabled={busy} title="Cancel">✕</button>
        {error && <span className="board-rename-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="board-name-area">
      <span className="board-name-label">{boardName}</span>
      {isAdmin && (
        <button className="board-edit-name-btn"
          onClick={() => dispatch({ type: "START", boardName })}
          title="Rename board">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 2.5a1.5 1.5 0 0 1 2.1 2.1L5 13.2l-3 .8.8-3 8.7-8.5z"/>
          </svg>
        </button>
      )}
    </div>
  );
}
