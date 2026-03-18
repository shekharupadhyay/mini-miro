const SHAPES = [
  { id: "rectangle", icon: "▭" },
  { id: "circle",    icon: "〇" },
  { id: "triangle",  icon: "△" },
  { id: "line",      icon: "╱" },
];

export default function BoardLeftToolbar({ placingTool, setPlacingTool, chatOpen, setChatOpen }) {
  const shapeActive = placingTool?.startsWith("shape:");

  return (
    <div className="board-left-toolbar">
      <button
        className={`left-toolbar-btn${placingTool === "note" ? " active" : ""}`}
        onClick={() => setPlacingTool((prev) => (prev === "note" ? null : "note"))}
        title="Add sticky note — click to place"
      >
        🗒️
        <span className="left-toolbar-label">Note</span>
      </button>

      <div className="left-toolbar-divider" />

      <button
        className={`left-toolbar-btn${shapeActive ? " active" : ""}`}
        onClick={() =>
          setPlacingTool((v) => (v?.startsWith("shape:") ? null : "shape:rectangle"))
        }
        title="Add shape"
      >
        🔷
        <span className="left-toolbar-label">Shape</span>
      </button>

      {shapeActive && (
        <div className="left-toolbar-shape-picker">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              className={`left-toolbar-shape-btn${
                placingTool === `shape:${s.id}` ? " active" : ""
              }`}
              title={s.id}
              onClick={() => setPlacingTool(`shape:${s.id}`)}
            >
              {s.icon}
            </button>
          ))}
        </div>
      )}

      <div className="left-toolbar-divider" />

      <button
        className={`left-toolbar-btn${chatOpen ? " active" : ""}`}
        onClick={() => setChatOpen((o) => !o)}
        title="Chat"
      >
        💬
        <span className="left-toolbar-label">Chat</span>
      </button>
    </div>
  );
}