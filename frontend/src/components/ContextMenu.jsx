import { useEffect, useRef } from "react";

export default function ContextMenu({
  open,
  x,
  y,
  onClose,
  onEdit,
  onDelete,
}) {
  const ref = useRef(null);

  // Close on outside click
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
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        width: 170,
        padding: 6,
        borderRadius: 12,
        background: "rgba(20,20,20,0.92)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
      }}
    >
      <button
        onClick={() => {
          onEdit();
          onClose();
        }}
        style={btnStyle}
      >
        ✏️ Edit
      </button>

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        style={{ ...btnStyle, color: "#ffb4b4" }}
      >
        🗑 Delete
      </button>
    </div>
  );
}

const btnStyle = {
  width: "100%",
  padding: "10px 10px",
  textAlign: "left",
  border: "none",
  borderRadius: 10,
  background: "transparent",
  color: "white",
  cursor: "pointer",
  fontSize: 14,
};