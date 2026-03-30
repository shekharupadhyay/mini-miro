export function getAnchorPos(el, side) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  let ax, ay;
  if (el.shape === "triangle") {
    // Tip at top-center; left/right anchors on the slanted edges, not the bounding box sides.
    if (side === "top")    { ax = cx;                 ay = el.y; }
    if (side === "bottom") { ax = cx;                 ay = el.y + el.h; }
    if (side === "left")   { ax = el.x + el.w / 4;   ay = cy; }
    if (side === "right")  { ax = el.x + el.w * 3/4; ay = cy; }
  } else {
    if (side === "top")    { ax = cx;          ay = el.y; }
    if (side === "bottom") { ax = cx;          ay = el.y + el.h; }
    if (side === "left")   { ax = el.x;        ay = cy; }
    if (side === "right")  { ax = el.x + el.w; ay = cy; }
  }
  const rotation = el.rotation ?? 0;
  if (!rotation) return { x: ax, y: ay };
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = ax - cx, dy = ay - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

const SIDES = ["top", "bottom", "left", "right"];

export function getAllAnchors(notes, shapes) {
  return [
    ...notes.flatMap((n) =>
      SIDES.map((side) => ({ ...getAnchorPos(n, side), connId: n._id, connType: "note", connSide: side }))
    ),
    ...shapes
      .filter((s) => !(s.shape === "line" && s.points?.length >= 2))
      .flatMap((s) =>
        SIDES.map((side) => ({ ...getAnchorPos(s, side), connId: s._id, connType: "shape", connSide: side }))
      ),
  ];
}

export function findNearestAnchor(anchors, worldX, worldY, threshold) {
  let best = null, bestDist = threshold;
  for (const a of anchors) {
    const d = Math.hypot(a.x - worldX, a.y - worldY);
    if (d < bestDist) { best = a; bestDist = d; }
  }
  return best;
}
