import { Link } from "react-router-dom";

const AVATAR_COLORS = [
  "#4f7dff", "#7c5cfc", "#22c55e", "#fb923c",
  "#ec4899", "#eab308", "#3b82f6", "#ef4444",
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function BoardTopbar({
  boardId,
  username,
  isAdmin,
  members,
  camera,
  onZoomIn,
  onZoomOut,
  onReset,
  onExport,
}) {
  return (
    <div className="board-topbar">
      <Link to="/" className="board-back-link">← Back</Link>

      <div className="board-divider" />

      <div className="board-brand">
        <div className="board-logo">
          <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
               strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="5" height="5" />
            <rect x="8" y="1" width="5" height="5" />
            <rect x="1" y="8" width="5" height="5" />
            <rect x="8" y="8" width="5" height="5" />
          </svg>
        </div>
        <span className="board-title">MiniMiro</span>
      </div>

      <div className="board-divider" />
      <span className="board-subtitle">{boardId}</span>

      <div className="board-presence">
        {members.map((name, i) => (
          <div
            key={name + i}
            className="board-avatar"
            title={name}
            style={{ background: avatarColor(name), zIndex: members.length - i }}
          >
            {initials(name)}
            {name === username && <span className="board-avatar-you" />}
          </div>
        ))}
        {members.length > 0 && (
          <span className="board-presence-count">{members.length} online</span>
        )}
      </div>

      <div className="board-user-pill">
        {isAdmin && <span className="board-admin-badge" title="Room Admin">👑</span>}
        <span className="board-username">{username}</span>
      </div>

      <div className="board-toolbar">
        <button className="btn-zoom" onClick={onZoomOut} title="Zoom out">−</button>
        <button className="btn-zoom" onClick={onZoomIn} title="Zoom in">+</button>
        <button onClick={onReset}>Reset</button>
        <div className="board-toolbar-sep" />
        <button className="btn-export" onClick={onExport} title="Export board as PNG">
          📥 Export PNG
        </button>
      </div>
    </div>
  );
}