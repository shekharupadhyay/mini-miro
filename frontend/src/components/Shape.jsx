import { useEffect, useRef, useState } from "react";
import { getBoardScale } from "../utils/canvas";
import "./shape.css";

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

function getFill(hex, fillMode) {
  if (fillMode === "none")  return "none";
  if (fillMode === "semi")  return hex + "33"; // ~20% opacity
  if (fillMode === "solid") return hex + "cc"; // ~80% opacity
  return "none";
}

export default function Shape({
  shape: shapeData,
  isSelected,
  isEditing,       // controlled from Board — true when context menu "Edit text" chosen
  onSelect,
  onUpdate,
  onOpenMenu,
  onStopEdit,      // () => void — called when textarea blurs/commits
}) {
  const { _id, shape, x, y, w, h, text, color = "black", fillMode = "none",
          textColor = null, fontFamily = "sans", rotation = 0 } = shapeData;

  const FONT_MAP = {
    sans:        "DM Sans, system-ui, sans-serif",
    serif:       "Georgia, serif",
    mono:        "monospace",
    handwriting: "cursive",
  };

  const elRef       = useRef(null);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState(text ?? "");
  const textareaRef = useRef(null);

  const colorHex    = COLORS.find(c => c.id === color)?.hex ?? "#1a1a1a";
  const strokeColor = colorHex;
  const fillColor   = getFill(colorHex, fillMode);
  const resolvedTextColor = textColor ?? strokeColor;
  const resolvedFont      = FONT_MAP[fontFamily] ?? FONT_MAP.sans;
  const isLine      = shape === "line";
  const svgW        = w;
  const svgH        = isLine ? 4 : h;

  // Focus contenteditable when editing starts — set text and select all
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.textContent = draft;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [editing]); // eslint-disable-line

  // Sync controlled isEditing prop → local editing state
  useEffect(() => {
    if (isEditing && !editing) {
      setDraft(text ?? "");
      setEditing(true);
    }
  }, [isEditing]); // eslint-disable-line

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
    const origW = w, origH = h;

    // Capture rotation at drag-start in radians
    const theta = (rotation * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Shape center in world coords (stays fixed for SE corner;
    // for other corners the opposite corner is fixed instead)
    const origCx = x + origW / 2;
    const origCy = y + origH / 2;

    // For each corner, identify which corner is the FIXED anchor
    // (the corner diagonally opposite) in local space, then convert to world.
    // Local coords: origin at shape top-left, x→right, y→down
    const anchors = {
      se: { lx: -origW / 2, ly: -origH / 2 }, // NW is fixed
      sw: { lx:  origW / 2, ly: -origH / 2 }, // NE is fixed
      ne: { lx: -origW / 2, ly:  origH / 2 }, // SW is fixed
      nw: { lx:  origW / 2, ly:  origH / 2 }, // SE is fixed
    };
    const anchor = anchors[corner];
    // Anchor in world coords
    const anchorWx = origCx + anchor.lx * cosT - anchor.ly * sinT;
    const anchorWy = origCy + anchor.lx * sinT + anchor.ly * cosT;

    function onMove(ev) {
      // Raw screen delta → world delta
      const sdx = (ev.clientX - startX) / scale;
      const sdy = (ev.clientY - startY) / scale;

      // Project screen delta onto shape's local axes
      const localDx =  sdx * cosT + sdy * sinT;
      const localDy = -sdx * sinT + sdy * cosT;

      // New size depending on which corner is dragged
      let newW = origW, newH = origH;
      let localSignX = 1, localSignY = 1;

      if (corner === "se") { newW = origW + localDx; newH = origH + localDy; localSignX =  1; localSignY =  1; }
      if (corner === "sw") { newW = origW - localDx; newH = origH + localDy; localSignX = -1; localSignY =  1; }
      if (corner === "ne") { newW = origW + localDx; newH = origH - localDy; localSignX =  1; localSignY = -1; }
      if (corner === "nw") { newW = origW - localDx; newH = origH - localDy; localSignX = -1; localSignY = -1; }

      newW = Math.max(40, newW);
      newH = Math.max(40, newH);

      // New center: anchor stays fixed, center is at anchor + half-size in local axes
      const newCx = anchorWx + (newW / 2) * localSignX * cosT - (newH / 2) * localSignY * sinT;
      const newCy = anchorWy + (newW / 2) * localSignX * sinT + (newH / 2) * localSignY * cosT;

      // Back to top-left world position
      const newX = newCx - newW / 2;
      const newY = newCy - newH / 2;

      onUpdate(_id, { x: newX, y: newY, w: newW, h: newH });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Rotate handle ─────────────────────────────────────────────────
  function handleRotateMouseDown(e) {
    e.stopPropagation();
    e.preventDefault();

    const el = elRef.current;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;

    // Angle from center to starting mouse position
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const startRot   = rotation;

    function onMove(ev) {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI);
      const delta = angle - startAngle;
      onUpdate(_id, { rotation: (startRot + delta + 360) % 360 });
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
    setDraft(text ?? "");
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    onUpdate(_id, { text: draft });
    onStopEdit?.();
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

  // For lines: expand container height when text is present or being edited
  const lineHasLabel = isLine && (text || editing);
  const containerH = isLine ? (lineHasLabel ? 36 : 4) : svgH;

  return (
    <div
      ref={elRef}
      className={`shape-card${isSelected ? " selected" : ""}`}
      style={{
        left: x, top: y, width: svgW, height: containerH,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }}
      onMouseDown={handleBodyMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(_id);
        onOpenMenu?.({ shapeId: _id, x: e.clientX, y: e.clientY });
      }}
    >
      {/* For lines, render the line at the bottom of the container */}
      {isLine ? (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          {renderSVG()}
        </div>
      ) : renderSVG()}

      {/* Text overlay for non-lines */}
      {!editing && text && !isLine && (
        <div className="shape-text-overlay" style={{ color: resolvedTextColor, fontFamily: resolvedFont }}>{text}</div>
      )}

      {/* Label above line */}
      {!editing && text && isLine && (
        <div className="shape-line-label" style={{ color: resolvedTextColor, fontFamily: resolvedFont }}>{text}</div>
      )}

      {editing && (
        <div className={isLine ? "shape-line-label-edit" : "shape-textarea-wrap"}>
          <div
            ref={textareaRef}
            className="shape-textarea"
            style={{ color: resolvedTextColor, fontFamily: resolvedFont }}
            contentEditable
            suppressContentEditableWarning
            onInput={e => setDraft(e.currentTarget.textContent)}
            onBlur={commitEdit}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === "Escape") { setEditing(false); setDraft(text ?? ""); onStopEdit?.(); }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
            }}
            onMouseDown={e => e.stopPropagation()}
          />
        </div>
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

      {/* Rotate handle — circular arrow above shape center */}
      {isSelected && !editing && (
        <div className="shape-rotate-handle" onMouseDown={handleRotateMouseDown} title="Drag to rotate">
          ↻
        </div>
      )}

      {/* Double-click hint */}
      {isSelected && !editing && (
        <div className="shape-hint">
          {isLine ? "Double-click to add label" : "Double-click to edit text"}
        </div>
      )}
    </div>
  );
}