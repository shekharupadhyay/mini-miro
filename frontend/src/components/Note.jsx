import { useEffect, useMemo, useRef, useState } from "react";
import { updateNotePosition } from "../api/notesApi";
import "./note.css";

export default function Note({
  note,
  onPositionChange,
  screenToWorld,
  onOpenMenu,
  isEditing,
  onStartEdit,
  onStopEdit,
  onSaveEdit,
}) {
  const [dragging, setDragging] = useState(false);
  const [draftText, setDraftText] = useState(note.text);

  const offsetRef = useRef({ x: 0, y: 0 });
  const latestNoteRef = useRef(note);
  const textareaRef = useRef(null);

  // Stable per-note rotation derived from the note's ID
  const rotation = useMemo(() => {
    const hash = note._id
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return ((hash % 7) - 3); // –3 to +3 degrees
  }, [note._id]);

  useEffect(() => {
    latestNoteRef.current = note;
    setDraftText(note.text);
  }, [note]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  function handleMouseDown(e) {
    if (isEditing) return;
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

  function handleDoubleClick(e) {
    e.stopPropagation();
    onStartEdit();
  }

  async function saveEdit() {
    const trimmed = draftText.trim();
    await onSaveEdit(note._id, trimmed);
  }

  function cancelEdit() {
    setDraftText(note.text);
    onStopEdit();
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
      onDoubleClick={handleDoubleClick}
      style={{
        left: note.x,
        top: note.y,
        background: note.color,
        transform: `rotate(${rotation}deg)`,
        cursor: isEditing ? "text" : dragging ? "grabbing" : "grab",
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="note-editor"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              saveEdit();
            }
          }}
        />
      ) : (
        <div className="note-content">{note.text}</div>
      )}
    </div>
  );
}