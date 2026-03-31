import { memo, useRef } from "react";
import { useDrag }                  from "../hooks/useDrag";
import { useRotationAwareResize }   from "../hooks/useRotationAwareResize";
import { useRotate }                from "../hooks/useRotate";
import { useTextEditing }           from "../hooks/useTextEditing";
import { FONT_MAP, FONT_SIZE_MAP, V_ALIGN_MAP } from "../utils/typography";
import "./note.css";

export default memo(function Note({
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
  const elRef = useRef(null);

  const { setDraftText, textareaRef, saveEdit, cancelEdit } = useTextEditing({
    text:      note.text,
    isEditing,
    id:        note._id,
    onSaveEdit,
    onUpdate,
    onStopEdit,
  });

  const handleMouseDown = useDrag({
    elRef,
    id:             note._id,
    getPosition:    () => ({ x: note.x, y: note.y }),
    onUpdate,
    disabled:       isEditing,
    isGroupSelected,
    onSelect,
    onGroupDragStart,
  });

  const handleResizeMouseDown = useRotationAwareResize({
    elRef,
    id:       note._id,
    x:        note.x,
    y:        note.y,
    w:        note.w ?? 180,
    h:        note.h ?? 110,
    rotation: note.rotation ?? 0,
    onUpdate,
    minW: 120,
    minH: 80,
  });

  const handleRotateMouseDown = useRotate({
    elRef,
    id:       note._id,
    rotation: note.rotation ?? 0,
    onUpdate,
  });

  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    onOpenMenu({ noteId: note._id, x: e.clientX, y: e.clientY });
  }

  function handleDoubleClick(e) {
    e.stopPropagation();
    onStartEdit?.(note._id);
  }

  const w        = note.w ?? 180;
  const h        = note.h ?? 110;
  const rotation = note.rotation ?? 0;

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
});
