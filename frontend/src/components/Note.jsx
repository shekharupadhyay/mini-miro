import { useEffect, useRef, useState } from "react";
import { getBoardScale } from "../utils/canvas";
import "./note.css";

export default function Note({
  note,
  isSelected,
  isGroupSelected,
  isEditing,
  onSelect,
  onUpdate,
  onOpenMenu,
  onStartEdit,
  onStopEdit,
  onSaveEdit,
  onGroupDragStart,
}) {
  const [draftText, setDraftText] = useState(note.text);
  const elRef       = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isEditing) setDraftText(note.text);
  }, [note.text, isEditing]);

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
    if (isGroupSelected && onGroupDragStart) { onGroupDragStart(e); return; }
    onSelect?.(note._id);

    const scale = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const origX = note.x, origY = note.y;

    function onMove(ev) {
      onUpdate(note._id, {
        x: origX + (ev.clientX - startX) / scale,
        y: origY + (ev.clientY - startY) / scale,
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── 4-corner resize ───────────────────────────────────────────────
  function handleResizeMouseDown(e, corner) {
    e.stopPropagation();
    e.preventDefault();

    const scale  = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const origW  = note.w ?? 180;
    const origH  = note.h ?? 110;

    const theta = ((note.rotation ?? 0) * Math.PI) / 180;
    const cosT  = Math.cos(theta);
    const sinT  = Math.sin(theta);

    const origCx = note.x + origW / 2;
    const origCy = note.y + origH / 2;

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

      newW = Math.max(120, newW);
      newH = Math.max(80,  newH);

      const newCx = anchorWx + (newW / 2) * localSignX * cosT - (newH / 2) * localSignY * sinT;
      const newCy = anchorWy + (newW / 2) * localSignX * sinT + (newH / 2) * localSignY * cosT;

      onUpdate(note._id, { x: newCx - newW / 2, y: newCy - newH / 2, w: newW, h: newH });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Rotate handle ─────────────────────────────────────────────────
  function handleRotateMouseDown(e) {
    e.stopPropagation();
    e.preventDefault();

    const el   = elRef.current;
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;

    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const startRot   = note.rotation ?? 0;

    function onMove(ev) {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI);
      const delta = angle - startAngle;
      onUpdate(note._id, { rotation: (startRot + delta + 360) % 360 });
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

  const w        = note.w ?? 180;
  const h        = note.h ?? 110;
  const rotation = note.rotation ?? 0;

  const FONT_MAP = {
    sans:        "system-ui, sans-serif",
    serif:       "Georgia, serif",
    mono:        "monospace",
    handwriting: "cursive",
  };

  const FONT_SIZE_MAP = { sm: 11, md: 14, lg: 17, xl: 21 };
  const V_ALIGN_MAP   = { top: "flex-start", center: "center", bottom: "flex-end" };

  const textStyle = {
    color:      note.textColor  ?? "inherit",
    fontFamily: FONT_MAP[note.fontFamily] ?? "inherit",
    fontSize:   FONT_SIZE_MAP[note.fontSize ?? "md"],
    textAlign:  note.textAlign  ?? "left",
  };

  return (
    <div
      ref={elRef}
      className={`note${isSelected ? " selected" : ""}${isGroupSelected && !isSelected ? " group-selected" : ""}`}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      style={{
        left:            note.x,
        top:             note.y,
        width:           w,
        minHeight:       h,
        background:      note.color,
        cursor:          isEditing ? "text" : "grab",
        transform:       `rotate(${rotation}deg)`,
        transformOrigin: "center center",
        display:         "flex",
        flexDirection:   "column",
        justifyContent:  V_ALIGN_MAP[note.verticalAlign ?? "top"],
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

      {/* 4-corner resize handles — only when single-selected */}
      {isSelected && !isGroupSelected && (
        <>
          <div className="note-handle nw" onMouseDown={e => handleResizeMouseDown(e, "nw")} />
          <div className="note-handle ne" onMouseDown={e => handleResizeMouseDown(e, "ne")} />
          <div className="note-handle sw" onMouseDown={e => handleResizeMouseDown(e, "sw")} />
          <div className="note-handle se" onMouseDown={e => handleResizeMouseDown(e, "se")} />
        </>
      )}

      {/* Rotate handle */}
      {isSelected && !isGroupSelected && !isEditing && (
        <div className="note-rotate-handle" onMouseDown={handleRotateMouseDown} title="Drag to rotate">
          ↻
        </div>
      )}
    </div>
  );
}
