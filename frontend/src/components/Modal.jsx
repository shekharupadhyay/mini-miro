import { useEffect, useRef } from "react";

export default function Modal({ open, title, children, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e) {
      if (e.key === "Escape") onClose();
    }

    function onMouseDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        ref={panelRef}
        style={{
          width: "min(520px, 95vw)",
          borderRadius: 16,
          background: "rgba(20,20,20,0.95)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "6px 6px 12px",
          }}
        >
          <div style={{ fontWeight: 700 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.16)",
              background: "transparent",
              color: "white",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}