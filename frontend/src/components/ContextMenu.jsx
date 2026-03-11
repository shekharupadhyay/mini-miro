import { useEffect, useRef } from "react";
import "./ContextMenu.css";

export default function ContextMenu({
  open,
  x,
  y,
  onClose,
  onEdit,
  onDelete,
}) {
  const ref = useRef(null);

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

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{
        left: x,
        top: y,
      }}
    >
      <button
        className="context-menu-btn"
        onClick={() => {
          onEdit();
          onClose();
        }}
      >
        ✏️ Edit
      </button>

      <button
        className="context-menu-btn delete"
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        🗑 Delete
      </button>
    </div>
  );
}