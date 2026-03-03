import { useEffect, useRef, useState } from "react";
import { updateNotePosition } from "../api/notesApi";

export default function Note({ note, onPositionChange, screenToWorld }) {
  const [dragging, setDragging] = useState(false);

  // offset between mouse(world) and note(world) when drag started
  const offsetRef = useRef({ x: 0, y: 0 });

  // always keep latest note so we save correct x/y on mouseup
  const latestNoteRef = useRef(note);
  useEffect(() => {
    latestNoteRef.current = note;
  }, [note]);

  function handleMouseDown(e) {
    if (e.button !== 0) return; // left click only
    e.stopPropagation(); // so board panning doesn't start
    e.preventDefault();

    setDragging(true);

    const world = screenToWorld(e.clientX, e.clientY);

    // store offset in WORLD coords
    offsetRef.current = {
      x: world.x - note.x,
      y: world.y - note.y,
    };
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
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: note.x,
        top: note.y,
        width: 180,
        minHeight: 110,
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.18)",
        background: note.color,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      {note.text}
    </div>
  );
}