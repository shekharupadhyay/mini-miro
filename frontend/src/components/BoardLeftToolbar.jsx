const SHAPES = [
  { id: "rectangle", label: "Rect",     icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="12" height="9" rx="1.5"/></svg> },
  { id: "circle",    label: "Circle",   icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5.5"/></svg> },
  { id: "triangle",  label: "Triangle", icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2.5l5.5 10H2.5L8 2.5z"/></svg> },
  { id: "line",      label: "Line",     icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="14" x2="14" y2="2"/></svg> },
];

export default function BoardLeftToolbar({ placingTool, setPlacingTool, onUndo, onRedo }) {
  const shapeActive = placingTool?.startsWith("shape:");

  return (
    <div className="board-left-toolbar">

      {/* Cursor / Select */}
      <button
        className={`left-toolbar-btn${!placingTool ? " active" : ""}`}
        onClick={() => setPlacingTool(null)}
        title="Select"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M4 2l12 8-6 1.5L7.5 18 4 2z" stroke="currentColor" strokeWidth="1.6"
                strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="left-toolbar-divider" />

      {/* Undo */}
      <button className="left-toolbar-btn" onClick={onUndo} title="Undo (Ctrl+Z)">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M4 7H13a4 4 0 0 1 0 8H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 4L4 7l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Redo */}
      <button className="left-toolbar-btn" onClick={onRedo} title="Redo (Ctrl+Y)">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M16 7H7a4 4 0 0 0 0 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="left-toolbar-divider" />

      {/* Sticky note */}
      <button
        className={`left-toolbar-btn${placingTool === "note" ? " active" : ""}`}
        onClick={() => setPlacingTool((prev) => (prev === "note" ? null : "note"))}
        title="Add sticky note — click to place"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M12 17v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M12 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M6 7h8M6 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Shapes */}
      <button
        className={`left-toolbar-btn${shapeActive ? " active" : ""}`}
        onClick={() => setPlacingTool((v) => (v?.startsWith("shape:") ? null : "shape:rectangle"))}
        title="Add shape"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="13" cy="13" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="2.5" y="2.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      </button>

      {shapeActive && (
        <div className="left-toolbar-shape-picker">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              className={`left-toolbar-shape-btn${placingTool === `shape:${s.id}` ? " active" : ""}`}
              title={s.label}
              onClick={() => setPlacingTool(`shape:${s.id}`)}
            >
              {s.icon}
            </button>
          ))}
        </div>
      )}


    </div>
  );
}
