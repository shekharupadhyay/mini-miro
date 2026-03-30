export default function ZoomBar({ scale, onZoomIn, onZoomOut, onResetView }) {
  return (
    <div className="board-bottom-bar">
      <button className="bbar-btn" onClick={onZoomOut} title="Zoom out">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/><path d="M6.5 9h5"/>
        </svg>
      </button>
      <span className="bbar-zoom-label">{Math.round(scale * 100)}%</span>
      <button className="bbar-btn" onClick={onZoomIn} title="Zoom in">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/><path d="M9 6.5v5M6.5 9h5"/>
        </svg>
      </button>
      <div className="bbar-sep" />
      <button className="bbar-fit-btn" onClick={onResetView}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"/>
        </svg>
        Fit View
      </button>
    </div>
  );
}
