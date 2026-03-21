import { useState } from "react";
import { NOTE_COLORS, TEXT_COLORS, FONTS } from "./contextMenuData";

export default function ContextMenuNote({
  onEdit, onDelete, onClose,
  onChangeColor, onTextColor, onFontFamily,
  currentTextColor  = "#111318",
  currentFontFamily = "sans",
}) {
  const [hoveredColor, setHoveredColor] = useState(null);

  return (
    <>
      <div className="context-menu-label">Note actions</div>
      <button className="context-menu-btn" onClick={() => { onEdit?.(); onClose(); }}>
        <span>✏️ Edit note</span>
        <span className="context-menu-hint">Enter</span>
      </button>

      <div className="context-menu-label" style={{ marginTop: 4 }}>Note colour</div>
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
            onClick={() => onChangeColor?.({ color: c.id })}
          />
        ))}
      </div>

      <div className="context-menu-label" style={{ marginTop: 4 }}>Text colour</div>
      <div className="shape-color-row">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.id}
            className={`shape-color-dot${currentTextColor === c.id ? " active" : ""}`}
            title={c.id}
            style={{ "--dot": c.hex }}
            onClick={() => onTextColor?.(c.id)}
          />
        ))}
      </div>

      <div className="context-menu-label" style={{ marginTop: 4 }}>Font</div>
      <div className="font-row">
        {FONTS.map((f) => (
          <button
            key={f.id}
            className={`font-btn${currentFontFamily === f.id ? " active" : ""}`}
            style={{ fontFamily: f.style }}
            onClick={() => onFontFamily?.(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="context-menu-divider" style={{ margin: "6px 4px" }} />
      <button className="context-menu-btn danger" onClick={() => { onDelete?.(); onClose(); }}>
        <span>🗑 Delete note</span>
        <span className="context-menu-hint">Del</span>
      </button>
    </>
  );
}
