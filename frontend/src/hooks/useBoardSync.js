import { getAnchorPos } from "../utils/anchors";

/**
 * Keeps flex-line endpoints in sync when a connected note/shape moves.
 */
export function useBoardSync({ shapesRef, notesRef, handleShapeUpdate, handleNoteUpdate }) {
  function syncConnectedLines(elementId, updatedEl) {
    shapesRef.current
      .filter((s) => s.shape === "line" && s.points?.length >= 2 &&
                     s.points.some((p) => p.connId === elementId))
      .forEach((line) => {
        const newPoints = line.points.map((p) => {
          if (p.connId !== elementId) return p;
          const pos = getAnchorPos(updatedEl, p.connSide);
          return { ...p, x: Math.round(pos.x), y: Math.round(pos.y) };
        });
        handleShapeUpdate(line._id, { points: newPoints });
      });
  }

  function handleNoteUpdateWithSync(id, patch) {
    handleNoteUpdate(id, patch);
    const note = notesRef.current.find((n) => n._id === id);
    if (note) syncConnectedLines(id, { ...note, ...patch });
  }

  function handleShapeUpdateWithSync(id, patch) {
    handleShapeUpdate(id, patch);
    const shape = shapesRef.current.find((s) => s._id === id);
    if (shape && !(shape.shape === "line" && shape.points?.length >= 2)) {
      syncConnectedLines(id, { ...shape, ...patch });
    }
  }

  return { syncConnectedLines, handleNoteUpdateWithSync, handleShapeUpdateWithSync };
}
