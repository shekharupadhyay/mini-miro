import { useEffect, useRef, useState } from "react";

export default function ShareDropdown({ inviteCode }) {
  const [shareOpen,  setShareOpen]  = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareRef = useRef(null);

  useEffect(() => {
    if (!shareOpen) return;
    function onDown(e) {
      if (!shareRef.current?.contains(e.target)) setShareOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [shareOpen]);

  function copyCode() {
    navigator.clipboard.writeText(inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="board-share-wrap" ref={shareRef}>
      <button
        className={`board-share-btn${shareOpen ? " active" : ""}`}
        onClick={() => setShareOpen(o => !o)}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M11 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM5 6a2.5 2.5 0 1 1 0 5A2.5 2.5 0 0 1 5 6zm6 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M7.4 7.3l1.2-.8M7.4 8.7l1.2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Share
      </button>

      {shareOpen && (
        <div className="board-share-dropdown">
          <p className="board-share-section-label">Invite code</p>
          <div className="board-share-code-row">
            <span className="board-share-code">{inviteCode || "—"}</span>
            <button className="board-share-copy-btn" onClick={copyCode}>
              {codeCopied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="board-share-divider" />
          <button className="board-share-link-btn" onClick={copyLink}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1"/>
              <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"/>
            </svg>
            {linkCopied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
