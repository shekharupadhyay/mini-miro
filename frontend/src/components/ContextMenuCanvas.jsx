import { useState } from "react";
import { NOTE_COLORS, SHAPES } from "./contextMenuData";

export default function ContextMenuCanvas({ onAddNote, onAddShape, onClose }) {
  const [expanded,     setExpanded]     = useState(null);
  const [hoveredColor, setHoveredColor] = useState(null);

  function toggle(panel) { setExpanded((v) => (v === panel ? null : panel)); }

  return (
    <>
      <div className="context-menu-label">Add to board</div>

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
                background:  c.bg,
                borderColor: hoveredColor === c.id ? c.border : "rgba(0,0,0,0.1)",
                boxShadow:   hoveredColor === c.id ? `0 0 0 3px ${c.border}44` : "none",
              }}
              title={c.label}
              onMouseEnter={() => setHoveredColor(c.id)}
              onMouseLeave={() => setHoveredColor(null)}
              onClick={() => { onAddNote?.({ color: c.id }); onClose(); }}
            />
          ))}
        </div>
      )}

      <button
        className={`context-menu-btn${expanded === "shape" ? " active" : ""}`}
        onClick={() => toggle("shape")}
      >
        <span>🔷 Shape</span>
        <span className={`context-menu-chevron${expanded === "shape" ? " rotated" : ""}`}>›</span>
      </button>

      {expanded === "shape" && (
        <div className="shape-type-picker">
          <div className="shape-type-hint">Pick a shape — resize &amp; add text on canvas</div>
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
  );
}
