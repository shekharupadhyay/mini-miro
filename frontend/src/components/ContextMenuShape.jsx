import { SHAPE_COLORS, FILL_MODES, TEXT_COLORS, FONTS } from "./contextMenuData";

export default function ContextMenuShape({
  onEditShape, onDeleteShape, onClose,
  onShapeColor, onShapeFill,
  onTextColor, onFontFamily,
  currentShapeColor = "black",
  currentShapeFill  = "none",
  currentTextColor  = "#111318",
  currentFontFamily = "sans",
}) {
  return (
    <>
      <div className="context-menu-label">Shape actions</div>
      <button className="context-menu-btn" onClick={() => { onEditShape?.(); onClose(); }}>
        <span>✏️ Edit text</span>
        <span className="context-menu-hint">Enter</span>
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

      <div className="context-menu-divider" style={{ margin: "6px 4px" }} />
      <button className="context-menu-btn danger" onClick={() => { onDeleteShape?.(); onClose(); }}>
        <span>🗑 Delete shape</span>
        <span className="context-menu-hint">Del</span>
      </button>
    </>
  );
}
