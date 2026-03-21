import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { avatarColor, initials } from "../utils/avatar";
import "./reaction.css";

const EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "👏", "🎉", "👋"];

export default function BoardTopbar({
  boardId,
  username,
  isAdmin,
  members,
  onExport,
  chatOpen,
  onChatToggle,
  onReact,           // (emoji, avatarRect) => void
  getAvatarPosRef,   // ref — Board writes a getter fn into this
  onRename,          // async (newName) => void  — admin only
  onDelete,          // async () => void          — admin only
}) {
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [renaming,      setRenaming]      = useState(false);
  const [draft,         setDraft]         = useState(boardId);
  const [renameError,   setRenameError]   = useState("");
  const [renaming_busy, setRenamingBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const pickerRef   = useRef(null);
  const buttonRef   = useRef(null);
  const renameRef   = useRef(null);
  const avatarEls   = useRef({});
  const myAvatarEl  = useRef(null);

  // Expose a function that returns the bounding rect of any member's avatar
  useEffect(() => {
    if (getAvatarPosRef) {
      getAvatarPosRef.current = (name) => {
        const el = avatarEls.current[name] ?? myAvatarEl.current;
        return el ? el.getBoundingClientRect() : null;
      };
    }
  });

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e) {
      if (pickerRef.current?.contains(e.target)) return;
      if (buttonRef.current?.contains(e.target)) return;
      setPickerOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renaming) {
      setDraft(boardId);
      setRenameError("");
      setTimeout(() => { renameRef.current?.select(); }, 0);
    }
  }, [renaming, boardId]);

  function handlePickEmoji(emoji) {
    const rect = myAvatarEl.current?.getBoundingClientRect() ?? null;
    onReact?.(emoji, rect);
  }

  async function commitRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === boardId) { setRenaming(false); return; }
    setRenamingBusy(true);
    setRenameError("");
    try {
      await onRename(trimmed);
      // navigation happens via socket broadcast — no need to setRenaming(false)
    } catch (err) {
      setRenameError(err.message || "Rename failed");
    } finally {
      setRenamingBusy(false);
    }
  }

  async function commitDelete() {
    setDeleting(true);
    try {
      await onDelete();
      // navigation happens via socket broadcast
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="board-topbar">

      {/* ── Left: Logo + board name ──────────────────────────── */}
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

        {/* Board name / rename */}
        {renaming ? (
          <div className="board-rename-wrap">
            <input
              ref={renameRef}
              className="board-rename-input"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setRenameError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter")  { e.preventDefault(); commitRename(); }
                if (e.key === "Escape") { setRenaming(false); setRenameError(""); }
              }}
              disabled={renaming_busy}
              maxLength={40}
            />
            <button
              className="board-rename-ok"
              onClick={commitRename}
              disabled={renaming_busy || !draft.trim()}
              title="Save"
            >✓</button>
            <button
              className="board-rename-cancel"
              onClick={() => { setRenaming(false); setRenameError(""); }}
              disabled={renaming_busy}
              title="Cancel"
            >✕</button>
            {renameError && <span className="board-rename-error">{renameError}</span>}
          </div>
        ) : (
          <div className="board-name-area">
            <span className="board-subtitle">{boardId.toUpperCase()}</span>
            {isAdmin && (
              <button
                className="board-edit-name-btn"
                onClick={() => setRenaming(true)}
                title="Rename board"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 2.5a1.5 1.5 0 0 1 2.1 2.1L5 13.2l-3 .8.8-3 8.7-8.5z"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Right: presence + reaction + chat + export + share + user ── */}
      <div className="board-topbar-right">

        {/* Presence avatars — exclude self */}
        {(() => {
          const others = members.filter((name) => name !== username);
          if (!others.length) return null;
          return (
            <div className="board-presence">
              {others.slice(0, 3).map((name, i) => (
                <div
                  key={name + i}
                  ref={(el) => { if (el) avatarEls.current[name] = el; }}
                  className="board-avatar"
                  title={name}
                  style={{ background: avatarColor(name), zIndex: others.length - i }}
                >
                  {initials(name)}
                </div>
              ))}
              {others.length > 3 && (
                <div className="board-avatar board-avatar-overflow">
                  +{others.length - 3}
                </div>
              )}
            </div>
          );
        })()}

        {/* Reaction picker */}
        <div className="reaction-picker-wrap">
          <button
            ref={buttonRef}
            className={`board-icon-btn${pickerOpen ? " active" : ""}`}
            onClick={() => setPickerOpen((o) => !o)}
            title="React"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M7 11.5s1 1.5 3 1.5 3-1.5 3-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="7.5" cy="8.5" r="1" fill="currentColor"/>
              <circle cx="12.5" cy="8.5" r="1" fill="currentColor"/>
            </svg>
          </button>

          {pickerOpen && (
            <div ref={pickerRef} className="reaction-picker">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className="reaction-pick-btn"
                  onClick={() => handlePickEmoji(e)}
                  title={e}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        <button
          className={`board-icon-btn${chatOpen ? " active" : ""}`}
          onClick={onChatToggle}
          title="Chat"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6l-3 3V4z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        </button>

        <button className="board-export-btn" onClick={onExport} title="Export as PNG">
          Export
        </button>

        <button className="board-share-btn">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M11 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM5 6a2.5 2.5 0 1 1 0 5A2.5 2.5 0 0 1 5 6zm6 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7.4 7.3l1.2-.8M7.4 8.7l1.2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Share
        </button>

        {/* Admin: delete board */}
        {isAdmin && !deleteConfirm && (
          <button
            className="board-icon-btn board-delete-btn"
            onClick={() => setDeleteConfirm(true)}
            title="Delete board"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11"/>
            </svg>
          </button>
        )}

        {isAdmin && deleteConfirm && (
          <div className="board-delete-confirm">
            <span className="board-delete-confirm-text">Delete board?</span>
            <button className="board-delete-yes" onClick={commitDelete} disabled={deleting}>
              {deleting ? "…" : "Delete"}
            </button>
            <button className="board-delete-no" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
              Cancel
            </button>
          </div>
        )}

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
