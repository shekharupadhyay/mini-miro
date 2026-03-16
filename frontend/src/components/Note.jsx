import { useEffect, useMemo, useRef, useState } from "react";
import { updateNotePosition } from "../api/notesApi";
import "./note.css";

export default function Note({
  note,
  onUpdate,       // (id, patch) => void  — unified patch, debounced in Board
  onPositionChange, // (id, x, y) => void — live position during drag
  screenToWorld,
  onOpenMenu,
  isEditing,
  onStartEdit,
  onStopEdit,
  onSaveEdit,
}) {
  const [dragging,  setDragging]  = useState(false);
  const [draftText, setDraftText] = useState(note.text);

  const offsetRef     = useRef({ x: 0, y: 0 });
  const latestNoteRef = useRef(note);
  const textareaRef   = useRef(null);

  const rotation = useMemo(() => {
    const hash = note._id
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return ((hash % 7) - 3);
  }, [note._id]);

  useEffect(() => {
    latestNoteRef.current = note;
    setDraftText(note.text);
  }, [note]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.textContent = draftText;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [isEditing]); // eslint-disable-line

  // ── Drag to move ─────────────────────────────────────────────────
  function handleMouseDown(e) {
    if (isEditing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    const world = screenToWorld(e.clientX, e.clientY);
    offsetRef.current = { x: world.x - note.x, y: world.y - note.y };
  }

  useEffect(() => {
    if (!dragging) return;

    function onMove(e) {
      const world = screenToWorld(e.clientX, e.clientY);
      const newX = world.x - offsetRef.current.x;
      const newY = world.y - offsetRef.current.y;
      onPositionChange?.(note._id, newX, newY);
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

  // ── Resize handle ─────────────────────────────────────────────────
  function handleResizeMouseDown(e) {
    e.stopPropagation();
    e.preventDefault();

    const worldEl = e.currentTarget.closest(".board-world");
    const scale = worldEl
      ? (new DOMMatrix(getComputedStyle(worldEl).transform).a || 1)
      : 1;

    const startX = e.clientX;
    const startY = e.clientY;
    const origW  = latestNoteRef.current.w ?? 180;
    const origH  = latestNoteRef.current.h ?? 110;

    function onMove(ev) {
      const newW = Math.max(140, origW + (ev.clientX - startX) / scale);
      const newH = Math.max(80,  origH + (ev.clientY - startY) / scale);
      // Update local state immediately for smooth feel
      onUpdate?.(note._id, { w: newW, h: newH });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Text editing ─────────────────────────────────────────────────
  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    onOpenMenu({ noteId: note._id, x: e.clientX, y: e.clientY });
  }

  function handleDoubleClick(e) {
    e.stopPropagation();
    onStartEdit?.();
  }

  async function saveEdit() {
    const trimmed = draftText.trim();
    if (onSaveEdit) await onSaveEdit(note._id, trimmed);
    else onUpdate?.(note._id, { text: trimmed });
  }

  function cancelEdit() {
    setDraftText(note.text);
    onStopEdit?.();
  }

  const w = note.w ?? 180;
  const h = note.h ?? 110;

  const FONT_MAP = {
    sans:        "system-ui, sans-serif",
    serif:       "Georgia, serif",
    mono:        "monospace",
    handwriting: "cursive",
  };

  const textStyle = {
    color:      note.textColor  ?? "inherit",
    fontFamily: FONT_MAP[note.fontFamily] ?? "inherit",
  };

  return (
    <div
      className="note"
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      style={{
        left:      note.x,
        top:       note.y,
        width:     w,
        minHeight: h,
        background: note.color,
        transform: `rotate(${rotation}deg)`,
        cursor: isEditing ? "text" : dragging ? "grabbing" : "grab",
      }}
    >
      {isEditing ? (
        <div
          ref={textareaRef}
          className="note-editor"
          contentEditable
          suppressContentEditableWarning
          style={textStyle}
          onInput={e => setDraftText(e.currentTarget.textContent)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); }
          }}
          onMouseDown={e => e.stopPropagation()}
        />
      ) : (
        <div className="note-content" style={textStyle}>{note.text}</div>
      )}

      {/* Resize handle — bottom-right corner, visible on hover */}
      <div
        className="note-resize-handle"
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize"
      />
    </div>
  );
}