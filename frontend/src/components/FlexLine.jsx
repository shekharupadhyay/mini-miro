import { useRef } from "react";
import { getBoardScale } from "../utils/canvas";
import { SHAPE_COLORS }  from "./contextMenuData";
import "./shape.css";

const FL_PAD = 24; // padding around the bounding box

export default function FlexLine({ shape: shapeData, isSelected, isGroupSelected, onSelect, onUpdate, onOpenMenu, onEndpointDrag, onGroupDragStart }) {
  const { _id, color = "black", points: pts,
          lineType = "straight", lineStyle = "solid", strokeWidth = 2 } = shapeData;
  const elRef = useRef(null);
  const strokeColor = SHAPE_COLORS.find(c => c.id === color)?.hex ?? "#1a1a1a";

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

  // World → SVG-local coords
  const lx = p => p.x - bx;
  const ly = p => p.y - by;

  const polylineStr = pts.map(p => `${lx(p)},${ly(p)}`).join(" ");

  // Step polyline: horizontal to midX then vertical between each pair
  const stepPolylineStr = (() => {
    const parts = [`${lx(pts[0])},${ly(pts[0])}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const mx = (lx(p) + lx(q)) / 2;
      parts.push(`${mx},${ly(p)}`, `${mx},${ly(q)}`, `${lx(q)},${ly(q)}`);
    }
    return parts.join(" ");
  })();

  // Curved path: Catmull-Rom spline → cubic bezier
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

  // Midpoints for drag handles
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
    const origPts = pts.map(p => ({ ...p }));
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
      ...pts.slice(0, segIdx + 1),
      { x: wx, y: wy },
      ...pts.slice(segIdx + 1),
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
