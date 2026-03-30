import { useRef } from "react";

const MAX = 50;

/**
 * Ref-based undo/redo stack — no re-renders triggered internally.
 *
 * Entry shape: { type, noteId?, shapeId?, before, after }
 *
 * Context-sensitive lookup:
 *  - selectedNoteId  → only look at entries for that note
 *  - selectedShapeId → only look at entries for that shape
 *  - neither         → use the most recent / first entry globally
 */
export function useHistory() {
  const pastRef   = useRef([]); // oldest → newest
  const futureRef = useRef([]); // newest undo first

  function push(entry) {
    pastRef.current   = [...pastRef.current.slice(-(MAX - 1)), entry];
    futureRef.current = []; // any new action clears redo stack
  }

  function undo(noteId, shapeId) {
    const p = pastRef.current;
    let idx = -1;
    if (noteId) {
      for (let i = p.length - 1; i >= 0; i--) { if (p[i].noteId  === noteId)  { idx = i; break; } }
    } else if (shapeId) {
      for (let i = p.length - 1; i >= 0; i--) { if (p[i].shapeId === shapeId) { idx = i; break; } }
    } else {
      idx = p.length - 1;
    }
    if (idx === -1) return null;
    const entry = p[idx];
    pastRef.current   = p.filter((_, i) => i !== idx);
    futureRef.current = [entry, ...futureRef.current.slice(0, MAX - 1)];
    return entry;
  }

  function redo(noteId, shapeId) {
    const f = futureRef.current;
    let idx = -1;
    if (noteId)  { idx = f.findIndex(e => e.noteId  === noteId);  }
    else if (shapeId) { idx = f.findIndex(e => e.shapeId === shapeId); }
    else { idx = f.length > 0 ? 0 : -1; }
    if (idx === -1) return null;
    const entry = f[idx];
    futureRef.current = f.filter((_, i) => i !== idx);
    pastRef.current   = [...pastRef.current.slice(-(MAX - 1)), entry];
    return entry;
  }

  return { push, undo, redo, pastRef, futureRef };
}
