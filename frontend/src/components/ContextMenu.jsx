import { useEffect, useRef, useState } from "react";
import "./contextMenu.css";

const NOTE_COLORS = [
  { id: "#fff9c4", label: "Yellow", bg: "#fff9c4", border: "#eab308" },
  { id: "#ffe0b2", label: "Orange", bg: "#ffe0b2", border: "#fb923c" },
  { id: "#fce4ec", label: "Pink",   bg: "#fce4ec", border: "#ec4899" },
  { id: "#f86262", label: "Red",    bg: "#f86262", border: "#f86262" },
  { id: "#e8f5e9", label: "Green",  bg: "#e8f5e9", border: "#22c55e" },
  { id: "#e3f2fd", label: "Blue",   bg: "#e3f2fd", border: "#3b82f6" },
  { id: "#f3e5f5", label: "Purple", bg: "#f3e5f5", border: "#a855f7" },
  { id: "#f5f5f5", label: "Gray",   bg: "#f5f5f5", border: "#9ca3af" },
];

const SHAPES = [
  { id: "rectangle", label: "Rect",     icon: "▭" },
  { id: "circle",    label: "Circle",   icon: "○" },
  { id: "triangle",  label: "Triangle", icon: "△" },
  { id: "line",      label: "Line",     icon: "╱" },
];

export default function ContextMenu({
  open, x, y, onClose,
  onEdit, onDelete,
  onAddNote,
  onAddShape,
  onEditShape,    // () => void
  onDeleteShape,  // () => void
  mode = "note",  // "canvas" | "note" | "shape"
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });
  const [expanded, setExpanded] = useState(null); // null | "note" | "shape"
  const [hoveredColor, setHoveredColor] = useState(null);

  useEffect(() => {
    if (!open) { setExpanded(null); setHoveredColor(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e)  { if (e.key === "Escape") onClose(); }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const menuWidth = 248;
    let menuHeight = 80;
    if (mode === "canvas") {
      if (expanded === "note")  menuHeight = 144;
      if (expanded === "shape") menuHeight = 160;
    } else {
      menuHeight = 120; // covers both "note" and "shape" modes
    }
    const padding = 12;
    let nextX = x, nextY = y;
    if (x + menuWidth  > window.innerWidth  - padding) nextX = window.innerWidth  - menuWidth  - padding;
    if (y + menuHeight > window.innerHeight - padding) nextY = window.innerHeight - menuHeight - padding;
    setPos({ x: nextX, y: nextY });
  }, [open, x, y, mode, expanded]);

  if (!open) return null;

  function toggle(panel) { setExpanded(v => v === panel ? null : panel); }

  return (
    <div ref={ref} className="context-menu" style={{ left: pos.x, top: pos.y }}>

      {mode === "canvas" ? (
        <>
          <div className="context-menu-label">Add to board</div>

          {/* Sticky note */}
          <button
            className={`context-menu-btn${expanded === "note" ? " active" : ""}`}
            onClick={() => toggle("note")}
          >
            <span>🗒️ Sticky note</span>
            <span className={`context-menu-chevron${expanded === "note" ? " rotated" : ""}`}>›</span>
          </button>

          {expanded === "note" && (
            <div className="context-menu-color-picker">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.id}
                  className="color-swatch"
                  style={{
                    background: c.bg,
                    borderColor: hoveredColor === c.id ? c.border : "rgba(0,0,0,0.1)",
                    boxShadow: hoveredColor === c.id ? `0 0 0 3px ${c.border}44` : "none",
                  }}
                  title={c.label}
                  onMouseEnter={() => setHoveredColor(c.id)}
                  onMouseLeave={() => setHoveredColor(null)}
                  onClick={() => { onAddNote?.({ color: c.id }); onClose(); }}
                />
              ))}
            </div>
          )}

          {/* Shape — just pick the type, everything else happens on canvas */}
          <button
            className={`context-menu-btn${expanded === "shape" ? " active" : ""}`}
            onClick={() => toggle("shape")}
          >
            <span>🔷 Shape</span>
            <span className={`context-menu-chevron${expanded === "shape" ? " rotated" : ""}`}>›</span>
          </button>

          {expanded === "shape" && (
            <div className="shape-type-picker">
              <div className="shape-type-hint">Pick a shape — resize & add text on canvas</div>
              <div className="shape-type-row">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    className="shape-type-btn"
                    title={s.label}
                    onClick={() => { onAddShape?.({ shape: s.id }); onClose(); }}
                  >
                    <span className="shape-type-icon">{s.icon}</span>
                    <span className="shape-type-label">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : mode === "shape" ? (
        <>
          <div className="context-menu-label">Shape actions</div>
          <button className="context-menu-btn" onClick={() => { onEditShape?.(); onClose(); }}>
            <span>✏️ Edit text</span>
            <span className="context-menu-hint">Enter</span>
          </button>
          <button className="context-menu-btn danger" onClick={() => { onDeleteShape?.(); onClose(); }}>
            <span>🗑 Delete shape</span>
            <span className="context-menu-hint">Del</span>
          </button>
        </>
      ) : (
        <>
          <div className="context-menu-label">Note actions</div>
          <button className="context-menu-btn" onClick={() => { onEdit?.(); onClose(); }}>
            <span>✏️ Edit note</span>
            <span className="context-menu-hint">Enter</span>
          </button>
          <button className="context-menu-btn danger" onClick={() => { onDelete?.(); onClose(); }}>
            <span>🗑 Delete note</span>
            <span className="context-menu-hint">Del</span>
          </button>
        </>
      )}
    </div>
  );
}