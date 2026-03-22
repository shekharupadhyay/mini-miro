import { getBoardScale } from "../utils/canvas";

/**
 * Returns a mousedown handler for 4-corner resize with rotation-aware math.
 * minW / minH are the minimum allowed dimensions (defaults 40×40).
 */
export function useRotationAwareResize({ elRef, id, x, y, w, h, rotation, onUpdate, minW = 40, minH = 40 }) {
  return function handleResizeMouseDown(e, corner) {
    e.stopPropagation();
    e.preventDefault();
    const scale  = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const origW  = w, origH = h;
    const theta  = (rotation * Math.PI) / 180;
    const cosT   = Math.cos(theta);
    const sinT   = Math.sin(theta);
    const origCx = x + origW / 2;
    const origCy = y + origH / 2;
    const anchors = {
      se: { lx: -origW / 2, ly: -origH / 2 },
      sw: { lx:  origW / 2, ly: -origH / 2 },
      ne: { lx: -origW / 2, ly:  origH / 2 },
      nw: { lx:  origW / 2, ly:  origH / 2 },
    };
    const anchor   = anchors[corner];
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
      newW = Math.max(minW, newW);
      newH = Math.max(minH, newH);
      const newCx = anchorWx + (newW / 2) * localSignX * cosT - (newH / 2) * localSignY * sinT;
      const newCy = anchorWy + (newW / 2) * localSignX * sinT + (newH / 2) * localSignY * cosT;
      onUpdate(id, { x: newCx - newW / 2, y: newCy - newH / 2, w: newW, h: newH });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
}
