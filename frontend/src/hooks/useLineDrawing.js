import { useRef, useState } from "react";
import { getAllAnchors, findNearestAnchor } from "../utils/anchors";

export function useLineDrawing({
  viewportRef, screenToWorldRef, cameraRef, addFlexLineRef, shapesRef,
  notes, shapes,
  setPlacingTool, selectShape, handleShapeUpdate,
}) {
  const [drawingLine,      setDrawingLine]      = useState(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState(false);

  const handleShapeUpdateRef = useRef(handleShapeUpdate);
  handleShapeUpdateRef.current = handleShapeUpdate;

  const findNearestAnchorRef = useRef(null);
  findNearestAnchorRef.current = (worldX, worldY, threshold) =>
    findNearestAnchor(getAllAnchors(notes, shapes), worldX, worldY, threshold);

  function beginLineDraw(p1, p1Screen) {
    const rect = viewportRef.current.getBoundingClientRect();
    setDrawingLine({ p1: p1Screen, p2: p1Screen });

    const onMove = (ev) => {
      const w = screenToWorldRef.current(ev.clientX, ev.clientY);
      const { scale, x: cx, y: cy } = cameraRef.current;
      const snapped = findNearestAnchorRef.current(w.x, w.y, 25 / scale);
      const p2Screen = snapped
        ? { x: snapped.x * scale + cx, y: snapped.y * scale + cy }
        : { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      setDrawingLine({ p1: p1Screen, p2: p2Screen });
    };

    const onUp = async (ev) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const w = screenToWorldRef.current(ev.clientX, ev.clientY);
      const { scale } = cameraRef.current;
      const snapped = findNearestAnchorRef.current(w.x, w.y, 25 / scale);
      const p2 = snapped
        ? { x: Math.round(snapped.x), y: Math.round(snapped.y), connId: snapped.connId, connType: snapped.connType, connSide: snapped.connSide }
        : { x: Math.round(w.x), y: Math.round(w.y) };
      setDrawingLine(null);
      setPlacingTool(null);
      if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 5) {
        try {
          const newId = await addFlexLineRef.current(p1, p2);
          selectShape(newId);
        } catch (err) {
          console.error("addFlexLine failed:", err);
        }
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleFlexEndpointDrag(shapeId, idx, e) {
    e.stopPropagation();
    e.preventDefault();
    setDraggingEndpoint(true);

    let lastSnapped = null;

    function makePoint(ev) {
      const pts = shapesRef.current.find((s) => s._id === shapeId)?.points ?? [];
      const w = screenToWorldRef.current(ev.clientX, ev.clientY);
      const { scale } = cameraRef.current;
      const snapped = findNearestAnchorRef.current(w.x, w.y, 30 / scale)
        ?? (lastSnapped && Math.hypot(w.x - lastSnapped.x, w.y - lastSnapped.y) < 50 / scale ? lastSnapped : null);
      const newPt = snapped
        ? { x: Math.round(snapped.x), y: Math.round(snapped.y), connId: snapped.connId, connType: snapped.connType, connSide: snapped.connSide }
        : { x: Math.round(w.x), y: Math.round(w.y) };
      return { pts, newPt, snapped };
    }

    function onMove(ev) {
      const { pts, newPt, snapped } = makePoint(ev);
      lastSnapped = snapped ?? null;
      handleShapeUpdateRef.current(shapeId, { points: pts.map((p, i) => (i === idx ? newPt : p)) });
    }
    function onUp(ev) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDraggingEndpoint(false);
      const { pts, newPt } = makePoint(ev);
      handleShapeUpdateRef.current(shapeId, { points: pts.map((p, i) => (i === idx ? newPt : p)) });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startLineFromAnchor(worldX, worldY, connId, connType, connSide) {
    const { scale, x: cx, y: cy } = cameraRef.current;
    const p1 = { x: Math.round(worldX), y: Math.round(worldY), connId, connType, connSide };
    const p1Screen = { x: worldX * scale + cx, y: worldY * scale + cy };
    beginLineDraw(p1, p1Screen);
  }

  return {
    drawingLine, setDrawingLine,
    draggingEndpoint,
    beginLineDraw, handleFlexEndpointDrag, startLineFromAnchor,
  };
}
