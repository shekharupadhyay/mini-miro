import { useEffect, useRef, useState } from "react";
import { getBoardScale } from "../utils/canvas";
import "./shape.css";

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
  if (fillMode === "semi")  return hex + "33";
  if (fillMode === "solid") return hex + "cc";
  return "none";
}

// ── Flexible polyline ─────────────────────────────────────────────────
const FL_PAD = 24; // padding around the bounding box

function FlexLine({ shape: shapeData, isSelected, isGroupSelected, onSelect, onUpdate, onOpenMenu, onEndpointDrag, onGroupDragStart }) {
  const { _id, color = "black", points: pts,
          lineType = "straight", lineStyle = "solid", strokeWidth = 2 } = shapeData;
  const elRef = useRef(null);
  const strokeColor = COLORS.find(c => c.id === color)?.hex ?? "#1a1a1a";

  // Stroke dash pattern
  const dashArray = lineStyle === "dashed" ? "8 5"
                  : lineStyle === "dotted" ? "2 5"
                  : undefined;

  // Bounding box in world space
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const bx = Math.min(...xs) - FL_PAD;
  const by = Math.min(...ys) - FL_PAD;
  const bw = Math.max(...xs) - bx + FL_PAD;
  const bh = Math.max(...ys) - by + FL_PAD;

  // Convert world → SVG-local coords
  const lx = p => p.x - bx;
  const ly = p => p.y - by;

  const polylineStr = pts.map(p => `${lx(p)},${ly(p)}`).join(" ");

  // Step polyline: between each pair, go horizontal to midX then vertical
  const stepPolylineStr = (() => {
    const parts = [`${lx(pts[0])},${ly(pts[0])}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const mx = (lx(p) + lx(q)) / 2;
      parts.push(`${mx},${ly(p)}`, `${mx},${ly(q)}`, `${lx(q)},${ly(q)}`);
    }
    return parts.join(" ");
  })();

  // Curved path: Catmull-Rom spline converted to cubic bezier
  const curvedPathStr = (() => {
    let d = `M ${lx(pts[0])},${ly(pts[0])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const cur  = pts[i];
      const next = pts[i + 1];
      const far  = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = lx(cur)  + (lx(next) - lx(prev)) / 6;
      const cp1y = ly(cur)  + (ly(next) - ly(prev)) / 6;
      const cp2x = lx(next) - (lx(far)  - lx(cur))  / 6;
      const cp2y = ly(next) - (ly(far)  - ly(cur))  / 6;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${lx(next)},${ly(next)}`;
    }
    return d;
  })();

  const activePolyStr = lineType === "step" ? stepPolylineStr : polylineStr;

  // Midpoints for drag handles — on the actual curve for "curved", straight midpoint otherwise
  const midpoints = pts.slice(0, -1).map((p, i) => {
    if (lineType === "curved") {
      const prev = pts[Math.max(0, i - 1)];
      const cur  = pts[i];
      const next = pts[i + 1];
      const far  = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = lx(cur)  + (lx(next) - lx(prev)) / 6;
      const cp1y = ly(cur)  + (ly(next) - ly(prev)) / 6;
      const cp2x = lx(next) - (lx(far)  - lx(cur))  / 6;
      const cp2y = ly(next) - (ly(far)  - ly(cur))  / 6;
      // Cubic bezier at t=0.5: (P0 + 3*P1 + 3*P2 + P3) / 8
      const mlx = (lx(cur) + 3 * cp1x + 3 * cp2x + lx(next)) / 8;
      const mly = (ly(cur) + 3 * cp1y + 3 * cp2y + ly(next)) / 8;
      return { wx: mlx + bx, wy: mly + by, lx: mlx, ly: mly, segIdx: i };
    }
    return {
      wx: (p.x + pts[i + 1].x) / 2,
      wy: (p.y + pts[i + 1].y) / 2,
      lx: (lx(p) + lx(pts[i + 1])) / 2,
      ly: (ly(p) + ly(pts[i + 1])) / 2,
      segIdx: i,
    };
  });

  function handlePolylineMouseDown(e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (isGroupSelected && onGroupDragStart) { onGroupDragStart(e); return; }
    onSelect(_id);
    const scale = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const origPts = pts.map(p => ({ ...p })); // preserve connId/connType/connSide

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      onUpdate(_id, { points: origPts.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleCornerDrag(e, idx) {
    e.stopPropagation();
    e.preventDefault();
    const scale = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const origPt = { x: pts[idx].x, y: pts[idx].y };

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      onUpdate(_id, {
        points: pts.map((p, i) => i === idx ? { x: origPt.x + dx, y: origPt.y + dy } : p),
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleMidpointDrag(e, segIdx, wx, wy) {
    e.stopPropagation();
    e.preventDefault();
    const scale = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const newIdx = segIdx + 1;
    const basePts = [
      ...pts.slice(0, segIdx + 1),         // preserve all fields inc. connId
      { x: wx, y: wy },                    // new bend point — no connection
      ...pts.slice(segIdx + 1),            // preserve all fields inc. connId
    ];
    onUpdate(_id, { points: basePts });

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      onUpdate(_id, {
        points: basePts.map((p, i) => i === newIdx ? { x: wx + dx, y: wy + dy } : p),
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      ref={elRef}
      style={{ position: "absolute", left: bx, top: by, width: bw, height: bh, pointerEvents: "none" }}
    >
      <svg
        width={bw} height={bh}
        style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}
      >
        {/* Wide transparent stroke — actual hit area */}
        {lineType === "curved" ? (
          <path
            d={curvedPathStr}
            fill="none" stroke="transparent" strokeWidth="14"
            style={{ pointerEvents: "stroke", cursor: "move" }}
            onMouseDown={handlePolylineMouseDown}
            onContextMenu={(e) => {
              e.preventDefault(); e.stopPropagation();
              onSelect(_id);
              onOpenMenu?.({ shapeId: _id, x: e.clientX, y: e.clientY });
            }}
          />
        ) : (
          <polyline
            points={activePolyStr}
            fill="none" stroke="transparent" strokeWidth="14"
            strokeLinejoin={lineType === "step" ? "miter" : "round"}
            style={{ pointerEvents: "stroke", cursor: "move" }}
            onMouseDown={handlePolylineMouseDown}
            onContextMenu={(e) => {
              e.preventDefault(); e.stopPropagation();
              onSelect(_id);
              onOpenMenu?.({ shapeId: _id, x: e.clientX, y: e.clientY });
            }}
          />
        )}
        {/* Group-selected glow */}
        {isGroupSelected && (lineType === "curved" ? (
          <path d={curvedPathStr} fill="none" stroke="#3b82f6" strokeWidth="7" strokeLinecap="round" opacity="0.35" style={{ pointerEvents: "none" }} />
        ) : (
          <polyline points={activePolyStr} fill="none" stroke="#3b82f6" strokeWidth="7" strokeLinecap="round" opacity="0.35" style={{ pointerEvents: "none" }} />
        ))}
        {/* Visible line */}
        {lineType === "curved" ? (
          <path
            d={curvedPathStr}
            fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={dashArray}
            style={{ pointerEvents: "none" }}
          />
        ) : (
          <polyline
            points={activePolyStr}
            fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin={lineType === "step" ? "miter" : "round"}
            strokeDasharray={dashArray}
            style={{ pointerEvents: "none" }}
          />
        )}
        {/* Corner handles ○ — only when single-selected */}
        {isSelected && !isGroupSelected && pts.map((p, i) => {
          const isEndpoint = i === 0 || i === pts.length - 1;
          return (
            <circle
              key={`c${i}`}
              cx={lx(p)} cy={ly(p)} r={isEndpoint ? 6 : 5}
              fill="white" stroke="#3b82f6" strokeWidth="2"
              style={{ pointerEvents: "all", cursor: isEndpoint ? "crosshair" : "move" }}
              onMouseDown={(e) => {
                if (isEndpoint && onEndpointDrag) onEndpointDrag(e, i);
                else handleCornerDrag(e, i);
              }}
            />
          );
        })}
        {/* Midpoint handles ● — only when single-selected */}
        {isSelected && !isGroupSelected && midpoints.map((m) => (
          <circle
            key={`m${m.segIdx}`}
            cx={m.lx} cy={m.ly} r={4}
            fill="#3b82f6" stroke="white" strokeWidth="1.5"
            style={{ pointerEvents: "all", cursor: "crosshair" }}
            onMouseDown={(e) => handleMidpointDrag(e, m.segIdx, m.wx, m.wy)}
          />
        ))}
      </svg>
    </div>
  );
}

// ── Regular shapes (rect / circle / triangle / old line) ─────────────
function RegularShape({
  shape: shapeData,
  isSelected,
  isGroupSelected,
  isEditing,
  onSelect,
  onUpdate,
  onOpenMenu,
  onStopEdit,
  onGroupDragStart,
}) {
  const { _id, shape, x, y, w, h, text, color = "black", fillMode = "none",
          textColor = null, fontFamily = "sans", rotation = 0,
          fontSize = "md", textAlign = "center", verticalAlign = "center",
          strokeWidth = 2 } = shapeData;

  const FONT_MAP = {
    sans:        "DM Sans, system-ui, sans-serif",
    serif:       "Georgia, serif",
    mono:        "monospace",
    handwriting: "cursive",
  };

  const FONT_SIZE_MAP = { sm: 11, md: 13, lg: 16, xl: 20 };
  const H_ALIGN_MAP   = { left: "flex-start", center: "center", right: "flex-end" };
  const V_ALIGN_MAP   = { top: "flex-start",  center: "center", bottom: "flex-end" };

  const elRef       = useRef(null);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState(text ?? "");
  const textareaRef = useRef(null);

  const colorHex          = COLORS.find(c => c.id === color)?.hex ?? "#1a1a1a";
  const strokeColor       = colorHex;
  const fillColor         = getFill(colorHex, fillMode);
  const resolvedTextColor = textColor ?? strokeColor;
  const resolvedFont      = FONT_MAP[fontFamily] ?? FONT_MAP.sans;
  const isLine            = shape === "line";
  const svgW              = w;
  const svgH              = isLine ? 4 : h;

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

  useEffect(() => {
    if (isEditing && !editing) {
      setDraft(text ?? "");
      setEditing(true);
    }
  }, [isEditing]); // eslint-disable-line

  function handleBodyMouseDown(e) {
    if (e.button !== 0 || editing) return;
    e.stopPropagation();
    if (isGroupSelected && onGroupDragStart) { onGroupDragStart(e); return; }
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

  function handleResizeMouseDown(e, corner) {
    e.stopPropagation();
    e.preventDefault();
    const scale = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const origW = w, origH = h;

    const theta = (rotation * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const origCx = x + origW / 2;
    const origCy = y + origH / 2;

    const anchors = {
      se: { lx: -origW / 2, ly: -origH / 2 },
      sw: { lx:  origW / 2, ly: -origH / 2 },
      ne: { lx: -origW / 2, ly:  origH / 2 },
      nw: { lx:  origW / 2, ly:  origH / 2 },
    };
    const anchor = anchors[corner];
    const anchorWx = origCx + anchor.lx * cosT - anchor.ly * sinT;
    const anchorWy = origCy + anchor.lx * sinT + anchor.ly * cosT;

    function onMove(ev) {
      const sdx = (ev.clientX - startX) / scale;
      const sdy = (ev.clientY - startY) / scale;
      const localDx =  sdx * cosT + sdy * sinT;
      const localDy = -sdx * sinT + sdy * cosT;

      let newW = origW, newH = origH;
      let localSignX = 1, localSignY = 1;

      if (corner === "se") { newW = origW + localDx; newH = origH + localDy; localSignX =  1; localSignY =  1; }
      if (corner === "sw") { newW = origW - localDx; newH = origH + localDy; localSignX = -1; localSignY =  1; }
      if (corner === "ne") { newW = origW + localDx; newH = origH - localDy; localSignX =  1; localSignY = -1; }
      if (corner === "nw") { newW = origW - localDx; newH = origH - localDy; localSignX = -1; localSignY = -1; }

      newW = Math.max(40, newW);
      newH = Math.max(40, newH);

      const newCx = anchorWx + (newW / 2) * localSignX * cosT - (newH / 2) * localSignY * sinT;
      const newCy = anchorWy + (newW / 2) * localSignX * sinT + (newH / 2) * localSignY * cosT;

      onUpdate(_id, { x: newCx - newW / 2, y: newCy - newH / 2, w: newW, h: newH });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleRotateMouseDown(e) {
    e.stopPropagation();
    e.preventDefault();
    const el = elRef.current;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const startRot   = rotation;

    function onMove(ev) {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI);
      onUpdate(_id, { rotation: (startRot + (angle - startAngle) + 360) % 360 });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

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

  function renderSVG() {
    if (isLine) return (
      <svg width={svgW} height={4} className="shape-svg">
        <line x1="2" y1="2" x2={svgW - 2} y2="2"
          stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      </svg>
    );
    if (shape === "circle") {
      const rx = svgW / 2 - 2, ry = svgH / 2 - 2;
      return (
        <svg width={svgW} height={svgH} className="shape-svg">
          <ellipse cx={svgW/2} cy={svgH/2} rx={rx} ry={ry} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
    }
    if (shape === "triangle") {
      const p = 3;
      return (
        <svg width={svgW} height={svgH} className="shape-svg">
          <polygon points={`${svgW/2},${p} ${svgW-p},${svgH-p} ${p},${svgH-p}`}
            fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    }
    return (
      <svg width={svgW} height={svgH} className="shape-svg">
        <rect x="2" y="2" width={svgW - 4} height={svgH - 4} rx="10" ry="10"
          fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      </svg>
    );
  }

  const lineHasLabel = isLine && (text || editing);
  const containerH   = isLine ? (lineHasLabel ? 36 : 4) : svgH;

  return (
    <div
      ref={elRef}
      className={`shape-card${isSelected ? " selected" : ""}${isGroupSelected && !isSelected ? " group-selected" : ""}`}
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
      {isLine ? (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          {renderSVG()}
        </div>
      ) : renderSVG()}

      {!editing && text && !isLine && (
        <div className="shape-text-overlay" style={{
          color: resolvedTextColor, fontFamily: resolvedFont,
          fontSize: FONT_SIZE_MAP[fontSize],
          alignItems: V_ALIGN_MAP[verticalAlign],
          justifyContent: H_ALIGN_MAP[textAlign],
          textAlign,
        }}>{text}</div>
      )}
      {!editing && text && isLine && (
        <div className="shape-line-label" style={{ color: resolvedTextColor, fontFamily: resolvedFont, fontSize: FONT_SIZE_MAP[fontSize] }}>{text}</div>
      )}

      {editing && (
        <div className={isLine ? "shape-line-label-edit" : "shape-textarea-wrap"} style={!isLine ? {
          alignItems: V_ALIGN_MAP[verticalAlign],
        } : {}}>
          <div
            ref={textareaRef}
            className="shape-textarea"
            style={{ color: resolvedTextColor, fontFamily: resolvedFont, fontSize: FONT_SIZE_MAP[fontSize], textAlign }}
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

      {isSelected && !isGroupSelected && !isLine && (
        <>
          <div className="shape-handle nw" onMouseDown={e => handleResizeMouseDown(e, "nw")} />
          <div className="shape-handle ne" onMouseDown={e => handleResizeMouseDown(e, "ne")} />
          <div className="shape-handle sw" onMouseDown={e => handleResizeMouseDown(e, "sw")} />
          <div className="shape-handle se" onMouseDown={e => handleResizeMouseDown(e, "se")} />
        </>
      )}
      {isSelected && !isGroupSelected && isLine && (
        <>
          <div className="shape-handle line-w" onMouseDown={e => handleResizeMouseDown(e, "sw")} />
          <div className="shape-handle line-e" onMouseDown={e => handleResizeMouseDown(e, "se")} />
        </>
      )}

      {isSelected && !isGroupSelected && !editing && (
        <div className="shape-rotate-handle" onMouseDown={handleRotateMouseDown} title="Drag to rotate">↻</div>
      )}
      {isSelected && !isGroupSelected && !editing && (
        <div className="shape-hint">
          {isLine ? "Double-click to add label" : "Double-click to edit text"}
        </div>
      )}
    </div>
  );
}

// ── Public export — picks the right renderer ──────────────────────────
export default function Shape({ onEndpointDrag, isGroupSelected, onGroupDragStart, ...props }) {
  const { shape: shapeData } = props;
  if (shapeData.shape === "line" && shapeData.points?.length >= 2) {
    return <FlexLine {...props} onEndpointDrag={onEndpointDrag} isGroupSelected={isGroupSelected} onGroupDragStart={onGroupDragStart} />;
  }
  return <RegularShape {...props} isGroupSelected={isGroupSelected} onGroupDragStart={onGroupDragStart} />;
}
