export function bboxIntersects(el, wx1, wy1, wx2, wy2) {
  return el.x < wx2 && el.x + el.w > wx1 && el.y < wy2 && el.y + el.h > wy1;
}

export function lineIntersects(points, wx1, wy1, wx2, wy2) {
  const lx1 = Math.min(...points.map((p) => p.x));
  const lx2 = Math.max(...points.map((p) => p.x));
  const ly1 = Math.min(...points.map((p) => p.y));
  const ly2 = Math.max(...points.map((p) => p.y));
  return lx1 < wx2 && lx2 > wx1 && ly1 < wy2 && ly2 > wy1;
}
