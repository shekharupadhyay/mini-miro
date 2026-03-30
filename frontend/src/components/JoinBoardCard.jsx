export default function JoinBoardCard({
  joinName, setJoinName,
  joinError, setJoinError,
  joining,
  onJoin,
}) {
  return (
    <div className="db-action-card db-action-card-join open">
      <div className="db-action-card-btn">
        <div className="db-action-icon">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 10h12M11 5l5 5-5 5"/>
          </svg>
        </div>
        <div>
          <div className="db-action-label">Join</div>
          <div className="db-action-sub">Enter a code or paste a link</div>
        </div>
      </div>

      <div className="db-action-form">
        <form onSubmit={onJoin}>
          <input
            className="db-form-input"
            value={joinName}
            onChange={e => { setJoinName(e.target.value); setJoinError(""); }}
            placeholder="Invite code or board link"
          />
          {joinError && <div className="db-form-error">{joinError}</div>}
          <div className="db-form-row">
            <button className="db-form-btn primary" type="submit" disabled={joining}>
              {joining ? "Checking…" : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
