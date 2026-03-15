import { useEffect, useRef, useState } from "react";
import "./contextMenu.css";

export default function ContextMenu({
  open,
  x,
  y,
  onClose,
  // Note actions (when right-clicking a note)
  onEdit,
  onDelete,
  // Canvas actions (when right-clicking empty canvas)
  onAddNote,
  // "canvas" | "note"
  mode = "note",
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (!open) return;

    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }

    function onKey(e) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const menuWidth = 220;
    const menuHeight = mode === "canvas" ? 80 : 120;
    const padding = 12;

    let nextX = x;
    let nextY = y;

    if (x + menuWidth > window.innerWidth - padding) {
      nextX = window.innerWidth - menuWidth - padding;
    }

    if (y + menuHeight > window.innerHeight - padding) {
      nextY = window.innerHeight - menuHeight - padding;
    }

    setPos({ x: nextX, y: nextY });
  }, [open, x, y, mode]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: pos.x, top: pos.y }}
    >
      {mode === "canvas" ? (
        <>
          <div className="context-menu-label">Add to board</div>

          <button
            className="context-menu-btn"
            onClick={() => {
              onAddNote?.();
              onClose();
            }}
          >
            <span>🗒️ Sticky note</span>
            <span className="context-menu-hint">N</span>
          </button>

          {/* Future items slot — add more buttons here */}
        </>
      ) : (
        <>
          <div className="context-menu-label">Note actions</div>

          <button
            className="context-menu-btn"
            onClick={() => {
              onEdit?.();
              onClose();
            }}
          >
            <span>✏️ Edit note</span>
            <span className="context-menu-hint">Enter</span>
          </button>

          <button
            className="context-menu-btn danger"
            onClick={() => {
              onDelete?.();
              onClose();
            }}
          >
            <span>🗑 Delete note</span>
            <span className="context-menu-hint">Del</span>
          </button>
        </>
      )}
    </div>
  );
}