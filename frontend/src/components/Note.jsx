import { useState } from "react";
import { updateNotePosition } from "../api/notesApi";

export default function Note({ note, onPositionChange }) {
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handleMouseDown(e) {
    setDragging(true);

    // mouse position relative to note
    setOffset({
      x: e.clientX - note.x,
      y: e.clientY - note.y,
    });
  }

  function handleMouseMove(e) {
    if (!dragging) return;

    const newX = e.clientX - offset.x;
    const newY = e.clientY - offset.y;

    onPositionChange(note._id, newX, newY);
  }

  async function handleMouseUp() {
    if (!dragging) return;

    setDragging(false);

    // save final position to backend
    await updateNotePosition(note._id, note.x, note.y);
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: "absolute",
        left: note.x,
        top: note.y,
        width: 160,
        minHeight: 90,
        padding: 10,
        borderRadius: 10,
        border: "1px solid #999",
        background: note.color,
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {note.text}
    </div>
  );
}