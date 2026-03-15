import { useEffect, useRef, useState } from "react";
import "./shape.css";

function getBoardScale(el) {
  const worldEl = el.closest(".board-world");
  if (!worldEl) return 1;
  const matrix = new DOMMatrix(getComputedStyle(worldEl).transform);
  return matrix.a || 1;
}

// 8 colours — hex values used as stroke and (with opacity) as fill
const COLORS = [
  { id: "black",  hex: "#1a1a1a" },
  { id: "red",    hex: "#ef4444" },
  { id: "orange", hex: "#fb923c" },
  { id: "yellow", hex: "#eab308" },
  { id: "green",  hex: "#22c55e" },
  { id: "blue",   hex: "#3b82f6" },
  { id: "purple", hex: "#a855f7" },
  { id: "pink",   hex: "#ec4899" },
];

const FILL_MODES = [
  { id: "none",  label: "No fill",    icon: "○" },
  { id: "semi",  label: "Semi",       icon: "◐" },
  { id: "solid", label: "Solid fill", icon: "●" },
];

function getFill(hex, fillMode) {
  if (fillMode === "none")  return "none";
  if (fillMode === "semi")  return hex + "33"; // ~20% opacity
  if (fillMode === "solid") return hex + "cc"; // ~80% opacity
  return "none";
}

export default function Shape({
  shape: shapeData,
  isSelected,
  onSelect,
  onUpdate,
}) {
  const { _id, shape, x, y, w, h, text, color = "black", fillMode = "none" } = shapeData;

  const elRef       = useRef(null);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState(text ?? "");
  const textareaRef = useRef(null);

  const colorHex = COLORS.find(c => c.id === color)?.hex ?? "#1a1a1a";
  const strokeColor = colorHex;
  const fillColor   = getFill(colorHex, fillMode);
  const isLine      = shape === "line";
  const svgW        = w;
  const svgH        = isLine ? 4 : h;

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  // ── Drag to move ──────────────────────────────────────────────────
  function handleBodyMouseDown(e) {
    if (e.button !== 0 || editing) return;
    e.stopPropagation();
    onSelect(_id);

    const scale = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const origX = x, origY = y;
    let moved = false;

    function onMove(ev) {
      moved = true;
      onUpdate(_id, {
        x: origX + (ev.clientX - startX) / scale,
        y: origY + (ev.clientY - startY) / scale,
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!moved) onSelect(_id);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Resize ────────────────────────────────────────────────────────
  function handleResizeMouseDown(e, corner) {
    e.stopPropagation();
    e.preventDefault();
    const scale = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const origX = x, origY = y, origW = w, origH = h;

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      let patch = {};
      if (corner === "se") patch = { w: Math.max(40, origW + dx), h: Math.max(40, origH + dy) };
      else if (corner === "sw") { const nw = Math.max(40, origW - dx); patch = { x: origX + origW - nw, w: nw, h: Math.max(40, origH + dy) }; }
      else if (corner === "ne") { const nh = Math.max(40, origH - dy); patch = { y: origY + origH - nh, w: Math.max(40, origW + dx), h: nh }; }
      else if (corner === "nw") { const nw = Math.max(40, origW - dx); const nh = Math.max(40, origH - dy); patch = { x: origX + origW - nw, y: origY + origH - nh, w: nw, h: nh }; }
      onUpdate(_id, patch);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Text edit ─────────────────────────────────────────────────────
  function handleDoubleClick(e) {
    e.stopPropagation();
    if (isLine) return;
    setDraft(text ?? "");
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    onUpdate(_id, { text: draft });
  }

  // ── SVG ───────────────────────────────────────────────────────────
  function renderSVG() {
    if (isLine) return (
      <svg width={svgW} height={4} className="shape-svg">
        <line x1="2" y1="2" x2={svgW - 2} y2="2"
          stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
    if (shape === "circle") {
      const rx = svgW / 2 - 2, ry = svgH / 2 - 2;
      return (
        <svg width={svgW} height={svgH} className="shape-svg">
          <ellipse cx={svgW/2} cy={svgH/2} rx={rx} ry={ry} fill={fillColor} stroke={strokeColor} strokeWidth="2" />
        </svg>
      );
    }
    if (shape === "triangle") {
      const p = 3;
      return (
        <svg width={svgW} height={svgH} className="shape-svg">
          <polygon points={`${svgW/2},${p} ${svgW-p},${svgH-p} ${p},${svgH-p}`}
            fill={fillColor} stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    }
    // rectangle
    return (
      <svg width={svgW} height={svgH} className="shape-svg">
        <rect x="2" y="2" width={svgW - 4} height={svgH - 4} rx="10" ry="10"
          fill={fillColor} stroke={strokeColor} strokeWidth="2" />
      </svg>
    );
  }

  return (
    <div
      ref={elRef}
      className={`shape-card${isSelected ? " selected" : ""}`}
      style={{ left: x, top: y, width: svgW, height: svgH }}
      onMouseDown={handleBodyMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => e.preventDefault()}
    >
      {renderSVG()}

      {!editing && text && !isLine && (
        <div className="shape-text-overlay" style={{ color: strokeColor }}>{text}</div>
      )}

      {editing && (
        <textarea
          ref={textareaRef}
          className="shape-textarea"
          style={{ color: strokeColor }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === "Escape") { setEditing(false); setDraft(text ?? ""); }
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
          }}
          onMouseDown={e => e.stopPropagation()}
        />
      )}

      {/* Corner resize handles */}
      {isSelected && !isLine && (
        <>
          <div className="shape-handle nw" onMouseDown={e => handleResizeMouseDown(e, "nw")} />
          <div className="shape-handle ne" onMouseDown={e => handleResizeMouseDown(e, "ne")} />
          <div className="shape-handle sw" onMouseDown={e => handleResizeMouseDown(e, "sw")} />
          <div className="shape-handle se" onMouseDown={e => handleResizeMouseDown(e, "se")} />
        </>
      )}
      {isSelected && isLine && (
        <>
          <div className="shape-handle line-w" onMouseDown={e => handleResizeMouseDown(e, "sw")} />
          <div className="shape-handle line-e" onMouseDown={e => handleResizeMouseDown(e, "se")} />
        </>
      )}

      {/* ── Style toolbar — appears above shape when selected ── */}
      {isSelected && !editing && (
        <div
          className="shape-toolbar"
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Fill mode toggle */}
          <div className="shape-toolbar-group">
            {FILL_MODES.map(fm => (
              <button
                key={fm.id}
                className={`shape-toolbar-btn${fillMode === fm.id ? " active" : ""}`}
                title={fm.label}
                onClick={e => { e.stopPropagation(); onUpdate(_id, { fillMode: fm.id }); }}
              >
                {fm.icon}
              </button>
            ))}
          </div>

          <div className="shape-toolbar-sep" />

          {/* Colour swatches */}
          <div className="shape-toolbar-colors">
            {COLORS.map(c => (
              <button
                key={c.id}
                className={`shape-color-btn${color === c.id ? " active" : ""}`}
                title={c.id}
                style={{ "--swatch": c.hex }}
                onClick={e => { e.stopPropagation(); onUpdate(_id, { color: c.id }); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Double-click hint */}
      {isSelected && !editing && !isLine && (
        <div className="shape-hint">Double-click to edit text</div>
      )}
    </div>
  );
}