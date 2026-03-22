export default function CreateBoardCard({
  createName, setCreateName,
  createError, setCreateError,
  creating,
  onCreate,
  onCreateRandom,
}) {
  return (
    <div className="db-action-card open">
      <div className="db-action-card-btn">
        <div className="db-action-icon">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M10 4v12M4 10h12"/>
          </svg>
        </div>
        <div>
          <div className="db-action-label">New Board</div>
          <div className="db-action-sub">Start from scratch</div>
        </div>
      </div>

      <div className="db-action-form">
        <form onSubmit={onCreate}>
          <input
            className="db-form-input"
            value={createName}
            onChange={e => { setCreateName(e.target.value); setCreateError(""); }}
            placeholder="Board name"
          />
          {createError && <div className="db-form-error">{createError}</div>}
          <div className="db-form-row">
            <button className="db-form-btn primary" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </button>
            <button className="db-form-btn ghost" type="button" onClick={onCreateRandom} disabled={creating}>
              🎲 Random
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
