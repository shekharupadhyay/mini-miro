import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { avatarColor, initials } from "../utils/avatar";
import ReactionPicker       from "./ReactionPicker";
import PresenceAvatars      from "./PresenceAvatars";
import BoardNameEditor      from "./BoardNameEditor";
import ShareDropdown        from "./ShareDropdown";
import DeleteConfirmButton  from "./DeleteConfirmButton";
import "./reaction.css";

export default function BoardTopbar({
  boardName,
  inviteCode,
  username,
  isAdmin,
  members,
  onExport,
  chatOpen,
  onChatToggle,
  hasUnread,
  onReact,
  getAvatarPosRef,
  onRename,
  onDelete,
}) {
  const avatarEls  = useRef({});
  const myAvatarEl = useRef(null);

  // Expose a function that returns the bounding rect of any member's avatar
  useEffect(() => {
    if (getAvatarPosRef) {
      getAvatarPosRef.current = (name) => {
        const el = avatarEls.current[name] ?? myAvatarEl.current;
        return el ? el.getBoundingClientRect() : null;
      };
    }
  });

  return (
    <div className="board-topbar">

      {/* ── Left: Logo ── */}
      <div className="board-brand-area">
        <Link to="/" className="board-brand-link">
          <div className="board-logo">
            <svg viewBox="0 0 14 14" fill="none" strokeWidth="1.5"
                 strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="5" height="5" />
              <rect x="8" y="1" width="5" height="5" />
              <rect x="1" y="8" width="5" height="5" />
              <rect x="8" y="8" width="5" height="5" />
            </svg>
          </div>
          <span className="board-title">MiniMiro</span>
        </Link>
      </div>

      {/* ── Center: Board name / rename ── */}
      <div className="board-center-area">
        <BoardNameEditor boardName={boardName} isAdmin={isAdmin} onRename={onRename} />
      </div>

      {/* ── Right: presence + reaction + chat + export + share + delete + user ── */}
      <div className="board-topbar-right">

        <PresenceAvatars members={members} username={username} avatarEls={avatarEls} />

        <ReactionPicker myAvatarEl={myAvatarEl} onReact={onReact} />

        <button
          className={`board-icon-btn${chatOpen ? " active" : ""}`}
          onClick={onChatToggle}
          title="Chat"
          style={{ position: "relative" }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6l-3 3V4z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
          {hasUnread && !chatOpen && <span className="chat-unread-dot" />}
        </button>

        <button className="board-export-btn" onClick={onExport} title="Export as PNG">
          Export
        </button>

        <ShareDropdown inviteCode={inviteCode} />

        {isAdmin && <DeleteConfirmButton onDelete={onDelete} />}

        {/* Current user avatar */}
        <div
          ref={myAvatarEl}
          className="board-avatar board-user-avatar"
          title={`${username}${isAdmin ? " (admin)" : ""}`}
          style={{ background: avatarColor(username) }}
        >
          {initials(username)}
          {isAdmin && <span className="board-avatar-crown">👑</span>}
        </div>
      </div>
    </div>
  );
}
