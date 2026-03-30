export function getBoardScale(el) {
  const worldEl = el.closest(".board-world");
  if (!worldEl) return 1;
  const matrix = new DOMMatrix(getComputedStyle(worldEl).transform);
  return matrix.a || 1;
}
