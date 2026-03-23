import { useRef, useState } from "react";
import { bboxIntersects, lineIntersects } from "../utils/geometry";

/**
 * Manages multi-select box drag and group movement.
 */
export function useMultiSelect({
  viewportRef, cameraRef, notesRef, shapesRef,
  handleNoteUpdateWithSync, handleShapeUpdateWithSync, handleShapeUpdate,
  onDeselect,
  closeMenu,
}) {
  const [selBox,        setSelBox]        = useState(null);
  const [multiSelected, setMultiSelected] = useState(null);

  const multiSelectedRef = useRef(null);
  multiSelectedRef.current = multiSelected;

  // Stable refs so group-drag callbacks always use the latest update functions
  const syncNoteRef  = useRef(handleNoteUpdateWithSync);
  syncNoteRef.current  = handleNoteUpdateWithSync;
  const syncShapeRef = useRef(handleShapeUpdateWithSync);
  syncShapeRef.current = handleShapeUpdateWithSync;
  const shapeUpdateRef = useRef(handleShapeUpdate);
  shapeUpdateRef.current = handleShapeUpdate;

  function handleGroupDragStart(e) {
    e.stopPropagation();
    const group = multiSelectedRef.current;
    if (!group) return;
    const scale  = cameraRef.current.scale;
    const startX = e.clientX, startY = e.clientY;
    const origNotes  = group.noteIds.map((id) => {
      const n = notesRef.current.find((n) => n._id === id);
      return { id, x: n?.x ?? 0, y: n?.y ?? 0 };
    });
    const origShapes = group.shapeIds.map((id) => {
      const s = shapesRef.current.find((s) => s._id === id);
      const isLine = s?.shape === "line" && s?.points?.length >= 2;
      return { id, x: s?.x ?? 0, y: s?.y ?? 0, isLine, origPts: isLine ? s.points : null };
    });

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      origNotes.forEach(({ id, x, y }) => syncNoteRef.current(id, { x: x + dx, y: y + dy }));
      origShapes.forEach(({ id, x, y, isLine, origPts }) => {
        if (isLine) shapeUpdateRef.current(id, { points: origPts.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) });
        else syncShapeRef.current(id, { x: x + dx, y: y + dy });
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }

  // Call this from handleViewportMouseDown on left-click with no tool active
  function handleSelectionMouseDown(e) {
    closeMenu();
    const rect = viewportRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    let dragging = false;

    function onMove(ev) {
      const ex = ev.clientX - rect.left, ey = ev.clientY - rect.top;
      if (!dragging && (Math.abs(ex - sx) > 5 || Math.abs(ey - sy) > 5)) dragging = true;
      if (dragging) setSelBox({ x1: sx, y1: sy, x2: ex, y2: ey });
    }
    function onUp(ev) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      if (dragging) {
        const ex = ev.clientX - rect.left, ey = ev.clientY - rect.top;
        const { scale, x: cx, y: cy } = cameraRef.current;
        const wx1 = (Math.min(sx, ex) - cx) / scale, wy1 = (Math.min(sy, ey) - cy) / scale;
        const wx2 = (Math.max(sx, ex) - cx) / scale, wy2 = (Math.max(sy, ey) - cy) / scale;
        const selNoteIds  = notesRef.current.filter((n) => bboxIntersects(n, wx1, wy1, wx2, wy2)).map((n) => n._id);
        const selShapeIds = shapesRef.current.filter((s) =>
          s.shape === "line" && s.points?.length >= 2
            ? lineIntersects(s.points, wx1, wy1, wx2, wy2)
            : bboxIntersects(s, wx1, wy1, wx2, wy2)
        ).map((s) => s._id);
        setSelBox(null);
        if (selNoteIds.length + selShapeIds.length > 0) {
          setMultiSelected({ noteIds: selNoteIds, shapeIds: selShapeIds });
          onDeselect();
        } else {
          setMultiSelected(null); onDeselect();
        }
      } else {
        setMultiSelected(null); onDeselect();
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }

  return { selBox, setSelBox, multiSelected, setMultiSelected, handleGroupDragStart, handleSelectionMouseDown };
}
