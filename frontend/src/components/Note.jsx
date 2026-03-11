import { useEffect, useRef, useState } from "react";
import { updateNotePosition } from "../api/notesApi";
import "./Note.css";

export default function Note({
  note,
  onPositionChange,
  screenToWorld,
  onOpenMenu,
}) {
  const [dragging, setDragging] = useState(false);

  const offsetRef = useRef({ x: 0, y: 0 });
  const latestNoteRef = useRef(note);

  useEffect(() => {
    latestNoteRef.current = note;
  }, [note]);

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    setDragging(true);

    const world = screenToWorld(e.clientX, e.clientY);
    offsetRef.current = {
      x: world.x - note.x,
      y: world.y - note.y,
    };
  }

  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    onOpenMenu({ noteId: note._id, x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!dragging) return;

    function onMove(e) {
      const world = screenToWorld(e.clientX, e.clientY);
      const newX = world.x - offsetRef.current.x;
      const newY = world.y - offsetRef.current.y;
      onPositionChange(note._id, newX, newY);
    }

    async function onUp() {
      setDragging(false);

      const { _id, x, y } = latestNoteRef.current;
      await updateNotePosition(_id, x, y);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, note._id, onPositionChange, screenToWorld]);

  return (
    <div
      className="note"
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      style={{
        left: note.x,
        top: note.y,
        background: note.color,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      {note.text}
    </div>
  );
}