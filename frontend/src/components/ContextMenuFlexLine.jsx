import { SHAPE_COLORS, STROKE_WIDTHS } from "./contextMenuData";

const LINE_TYPES = [
  {
    id: "straight",
    label: "Straight",
    icon: (
      <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
        <line x1="3" y1="15" x2="25" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "curved",
    label: "Curved",
    icon: (
      <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
        <path d="M3 15 C 14 15 14 3 25 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
];

const LINE_STYLES = [
  {
    id: "solid",
    label: "Solid",
    icon: (
      <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
        <line x1="2" y1="5" x2="26" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "dashed",
    label: "Dashed",
    icon: (
      <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
        <line x1="2" y1="5" x2="26" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "dotted",
    label: "Dotted",
    icon: (
      <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
        <line x1="2" y1="5" x2="26" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="1 4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function ContextMenuFlexLine({
  onDeleteShape, onClose,
  onShapeColor,  currentShapeColor  = "black",
  onLineType,    currentLineType    = "straight",
  onLineStyle,   currentLineStyle   = "solid",
  onStrokeWidth, currentStrokeWidth = 2,
}) {
  return (
    <>
      <div className="context-menu-label">Line colour</div>
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

      <div className="context-menu-label" style={{ marginTop: 6 }}>Line type</div>
      <div className="line-type-row">
        {LINE_TYPES.map((t) => (
          <button
            key={t.id}
            className={`line-type-btn${currentLineType === t.id ? " active" : ""}`}
            title={t.label}
            onClick={() => onLineType?.(t.id)}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="context-menu-label" style={{ marginTop: 6 }}>Line style</div>
      <div className="line-type-row">
        {LINE_STYLES.map((s) => (
          <button
            key={s.id}
            className={`line-type-btn${currentLineStyle === s.id ? " active" : ""}`}
            title={s.label}
            onClick={() => onLineStyle?.(s.id)}
          >
            {s.icon}
          </button>
        ))}
      </div>

      <div className="context-menu-label" style={{ marginTop: 6 }}>Line width</div>
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
      <button className="context-menu-btn danger" onClick={() => { onDeleteShape?.(); onClose(); }}>
        <span>🗑 Delete line</span>
        <span className="context-menu-hint">Del</span>
      </button>
    </>
  );
}
