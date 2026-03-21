import { useEffect, useRef, useState } from "react";
import ContextMenuCanvas    from "./ContextMenuCanvas";
import ContextMenuNote      from "./ContextMenuNote";
import ContextMenuShape     from "./ContextMenuShape";
import ContextMenuFlexLine  from "./ContextMenuFlexLine";
import "./contextMenu.css";

// Estimated max heights per mode for viewport overflow clamping
const MODE_HEIGHT = { canvas: 200, note: 340, shape: 400, flexline: 260 };

export default function ContextMenu({
  open, x, y, onClose, mode = "note",
  // canvas
  onAddNote, onAddShape,
  // note
  onEdit, onDelete, onChangeColor,
  // shape
  onEditShape, onDeleteShape, onShapeColor, onShapeFill,
  currentShapeColor = "black",
  currentShapeFill  = "none",
  // shared (note + shape)
  onTextColor, onFontFamily,
  currentTextColor  = "#111318",
  currentFontFamily = "sans",
  // flexline-only
  onLineType, currentLineType = "straight",
  onLineStyle, currentLineStyle = "solid",
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });

  // Clamp menu so it never overflows the viewport
  useEffect(() => {
    if (!open) return;
    const menuWidth  = 248;
    const menuHeight = MODE_HEIGHT[mode] ?? 120;
    const padding    = 12;
    let nx = x, ny = y;
    if (x + menuWidth  > window.innerWidth  - padding) nx = window.innerWidth  - menuWidth  - padding;
    if (y + menuHeight > window.innerHeight - padding) ny = window.innerHeight - menuHeight - padding;
    setPos({ x: nx, y: ny });
  }, [open, x, y, mode]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e)  { if (e.key === "Escape") onClose(); }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown",   onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown",   onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const textProps = { onTextColor, onFontFamily, currentTextColor, currentFontFamily };

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {mode === "canvas" && (
        <ContextMenuCanvas onAddNote={onAddNote} onAddShape={onAddShape} onClose={onClose} />
      )}
      {mode === "note" && (
        <ContextMenuNote
          onEdit={onEdit} onDelete={onDelete} onClose={onClose}
          onChangeColor={onChangeColor}
          {...textProps}
        />
      )}
      {mode === "shape" && (
        <ContextMenuShape
          onEditShape={onEditShape} onDeleteShape={onDeleteShape} onClose={onClose}
          onShapeColor={onShapeColor} onShapeFill={onShapeFill}
          currentShapeColor={currentShapeColor} currentShapeFill={currentShapeFill}
          {...textProps}
        />
      )}
      {mode === "flexline" && (
        <ContextMenuFlexLine
          onDeleteShape={onDeleteShape} onClose={onClose}
          onShapeColor={onShapeColor} currentShapeColor={currentShapeColor}
          onLineType={onLineType}     currentLineType={currentLineType}
          onLineStyle={onLineStyle}   currentLineStyle={currentLineStyle}
        />
      )}
    </div>
  );
}
