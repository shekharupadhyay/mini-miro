import { useEffect, useRef } from "react";
import "./modal.css";

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
    <div className="modal-overlay">
      <div ref={panelRef} className="modal-panel">
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            <div className="modal-subtitle">Make your changes below</div>
          </div>

          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}