import { SHAPE_COLORS, FILL_MODES, TEXT_COLORS, FONTS, FONT_SIZES, TEXT_ALIGNS, VERT_ALIGNS, STROKE_WIDTHS } from "./contextMenuData";

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

export default function ContextMenuShape({
  onEditShape, onDeleteShape, onClose, onRefine,
  onShapeColor, onShapeFill,
  onTextColor, onFontFamily,
  onFontSize, onTextAlign, onVerticalAlign, onStrokeWidth,
  currentShapeColor    = "black",
  currentShapeFill     = "none",
  currentTextColor     = "#111318",
  currentFontFamily    = "sans",
  currentFontSize      = "md",
  currentTextAlign     = "center",
  currentVerticalAlign = "center",
  currentStrokeWidth   = 2,
}) {
  return (
    <>
      <div className="context-menu-label">Shape actions</div>
      <button className="context-menu-btn" onClick={() => { onEditShape?.(); onClose(); }}>
        <span>✏️ Edit text</span>
        <span className="context-menu-hint">Enter</span>
      </button>
      <button className="context-menu-btn" onClick={() => { onRefine?.(); onClose(); }}>
        <span>✨ Refine text</span>
      </button>

      <div className="context-menu-label" style={{ marginTop: 4 }}>Fill</div>
      <div className="shape-fill-row">
        {FILL_MODES.map((fm) => (
          <button
            key={fm.id}
            className={`shape-fill-btn${currentShapeFill === fm.id ? " active" : ""}`}
            title={fm.label}
            onClick={() => onShapeFill?.(fm.id)}
          >
            <span className="shape-fill-icon">{fm.icon}</span>
            <span className="shape-fill-label">{fm.label}</span>
          </button>
        ))}
      </div>

      <div className="context-menu-label" style={{ marginTop: 4 }}>Colour</div>
      <div className="shape-color-row">
        {SHAPE_COLORS.map((c) => (
          <button
            key={c.id}
            className={`shape-color-dot${currentShapeColor === c.id ? " active" : ""}`}
            title={c.id}
            style={{ "--dot": c.hex }}
            onClick={() => onShapeColor?.(c.id)}
          />
        ))}
      </div>

      <div className="context-menu-label" style={{ marginTop: 4 }}>Border width</div>
      <div className="stroke-row">
        {STROKE_WIDTHS.map((sw) => (
          <button
            key={sw}
            className={`stroke-btn${currentStrokeWidth === sw ? " active" : ""}`}
            title={`${sw}px`}
            onClick={() => onStrokeWidth?.(sw)}
          >
            <svg width="28" height="14" viewBox="0 0 28 14">
              <line x1="3" y1="7" x2="25" y2="7" stroke="#1a1a1a" strokeWidth={sw} strokeLinecap="round"/>
            </svg>
          </button>
        ))}
      </div>

      <div className="context-menu-divider" style={{ margin: "6px 4px" }} />

      <div className="context-menu-label">Text colour</div>
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
      <button className="context-menu-btn danger" onClick={() => { onDeleteShape?.(); onClose(); }}>
        <span>🗑 Delete shape</span>
        <span className="context-menu-hint">Del</span>
      </button>
    </>
  );
}
