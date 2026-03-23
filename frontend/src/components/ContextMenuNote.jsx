import { useState } from "react";
import { NOTE_COLORS, TEXT_COLORS, FONTS, FONT_SIZES, TEXT_ALIGNS, VERT_ALIGNS } from "./contextMenuData";

const H_ICONS = {
  left:   <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="3" width="12" height="2" rx="1"/><rect x="2" y="7" width="8"  height="2" rx="1"/><rect x="2" y="11" width="10" height="2" rx="1"/></svg>,
  center: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="3" width="12" height="2" rx="1"/><rect x="4" y="7" width="8"  height="2" rx="1"/><rect x="3" y="11" width="10" height="2" rx="1"/></svg>,
  right:  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="3" width="12" height="2" rx="1"/><rect x="6" y="7" width="8"  height="2" rx="1"/><rect x="4" y="11" width="10" height="2" rx="1"/></svg>,
};
const V_ICONS = {
  top:    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="2" rx="1"/><rect x="5" y="5" width="6"  height="8" rx="1" opacity="0.35"/><rect x="4" y="5" width="8"  height="2" rx="1"/></svg>,
  center: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="7" width="12" height="2" rx="1"/><rect x="5" y="3" width="6"  height="10" rx="1" opacity="0.35"/><rect x="4" y="7" width="8"  height="2" rx="1"/></svg>,
  bottom: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="12" width="12" height="2" rx="1"/><rect x="5" y="3" width="6"  height="8" rx="1" opacity="0.35"/><rect x="4" y="9" width="8"  height="2" rx="1"/></svg>,
};

const FONT_SIZE_PX = { sm: 11, md: 14, lg: 17, xl: 21 };

export default function ContextMenuNote({
  onEdit, onDelete, onClose,
  onChangeColor, onTextColor, onFontFamily,
  onFontSize, onTextAlign, onVerticalAlign,
  currentTextColor  = "#111318",
  currentFontFamily = "sans",
  currentFontSize   = "md",
  currentTextAlign  = "left",
  currentVerticalAlign = "top",
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

      <div className="context-menu-label" style={{ marginTop: 4 }}>Font size</div>
      <div className="font-size-row">
        {FONT_SIZES.map((s) => (
          <button
            key={s.id}
            className={`font-size-btn${currentFontSize === s.id ? " active" : ""}`}
            style={{ fontSize: FONT_SIZE_PX[s.id] }}
            onClick={() => onFontSize?.(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="context-menu-label" style={{ marginTop: 4 }}>H align</div>
      <div className="align-row">
        {TEXT_ALIGNS.map((a) => (
          <button
            key={a.id}
            className={`align-btn${currentTextAlign === a.id ? " active" : ""}`}
            title={a.title}
            onClick={() => onTextAlign?.(a.id)}
          >
            {H_ICONS[a.id]}
          </button>
        ))}
      </div>

      <div className="context-menu-label" style={{ marginTop: 4 }}>V align</div>
      <div className="align-row">
        {VERT_ALIGNS.map((a) => (
          <button
            key={a.id}
            className={`align-btn${currentVerticalAlign === a.id ? " active" : ""}`}
            title={a.title}
            onClick={() => onVerticalAlign?.(a.id)}
          >
            {V_ICONS[a.id]}
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
