import { memo, useEffect, useRef, useState } from "react";
import { useDrag }                from "../hooks/useDrag";
import { useRotationAwareResize } from "../hooks/useRotationAwareResize";
import { useRotate }              from "../hooks/useRotate";
import { SHAPE_COLORS }           from "./contextMenuData";
import { FONT_MAP, FONT_SIZE_MAP, H_ALIGN_MAP, V_ALIGN_MAP } from "../utils/typography";
import FlexLine                   from "./FlexLine";
import "./shape.css";

function getFill(hex, fillMode) {
  if (fillMode === "none")  return "none";
  if (fillMode === "semi")  return hex + "33";
  if (fillMode === "solid") return hex + "cc";
  return "none";
}

function RegularShape({
  shape: shapeData,
  isSelected,
  isGroupSelected,
  isEditing,
  onSelect,
  onUpdate,
  onOpenMenu,
  onStopEdit,
  onGroupDragStart,
}) {
  const { _id, shape, x, y, w, h, text, color = "black", fillMode = "none",
          textColor = null, fontFamily = "sans", rotation = 0,
          fontSize = "md", textAlign = "center", verticalAlign = "center",
          strokeWidth = 2 } = shapeData;

  const elRef       = useRef(null);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState(text ?? "");
  const textareaRef = useRef(null);

  const colorHex          = SHAPE_COLORS.find(c => c.id === color)?.hex ?? "#1a1a1a";
  const strokeColor       = colorHex;
  const fillColor         = getFill(colorHex, fillMode);
  const resolvedTextColor = textColor ?? strokeColor;
  const resolvedFont      = FONT_MAP[fontFamily] ?? FONT_MAP.sans;
  const isLine            = shape === "line";
  const svgW              = w;
  const svgH              = isLine ? 4 : h;

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.textContent = draft;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [editing]); // eslint-disable-line

  useEffect(() => {
    if (isEditing && !editing) {
      setDraft(text ?? "");
      setEditing(true);
    }
  }, [isEditing]); // eslint-disable-line

  const handleBodyMouseDown = useDrag({
    elRef,
    id:             _id,
    getPosition:    () => ({ x, y }),
    onUpdate,
    disabled:       editing,
    isGroupSelected,
    onSelect,
    onGroupDragStart,
  });

  const handleResizeMouseDown = useRotationAwareResize({
    elRef, id: _id, x, y, w, h, rotation, onUpdate,
  });

  const handleRotateMouseDown = useRotate({
    elRef, id: _id, rotation, onUpdate,
  });

  function handleDoubleClick(e) {
    e.stopPropagation();
    setDraft(text ?? "");
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    onUpdate(_id, { text: draft });
    onStopEdit?.();
  }

  function renderSVG() {
    if (isLine) return (
      <svg width={svgW} height={4} className="shape-svg">
        <line x1="2" y1="2" x2={svgW - 2} y2="2"
          stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      </svg>
    );
    if (shape === "circle") {
      const rx = svgW / 2 - 2, ry = svgH / 2 - 2;
      return (
        <svg width={svgW} height={svgH} className="shape-svg">
          <ellipse cx={svgW/2} cy={svgH/2} rx={rx} ry={ry} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
    }
    if (shape === "triangle") {
      const p = 3;
      return (
        <svg width={svgW} height={svgH} className="shape-svg">
          <polygon points={`${svgW/2},${p} ${svgW-p},${svgH-p} ${p},${svgH-p}`}
            fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    }
    return (
      <svg width={svgW} height={svgH} className="shape-svg">
        <rect x="2" y="2" width={svgW - 4} height={svgH - 4} rx="10" ry="10"
          fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      </svg>
    );
  }

  const lineHasLabel = isLine && (text || editing);
  const containerH   = isLine ? (lineHasLabel ? 36 : 4) : svgH;

  return (
    <div
      ref={elRef}
      className={`shape-card${isSelected ? " selected" : ""}${isGroupSelected && !isSelected ? " group-selected" : ""}`}
      style={{
        left: x, top: y, width: svgW, height: containerH,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }}
      onMouseDown={handleBodyMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(_id);
        onOpenMenu?.({ shapeId: _id, x: e.clientX, y: e.clientY });
      }}
    >
      {isLine ? (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          {renderSVG()}
        </div>
      ) : renderSVG()}

      {!editing && text && !isLine && (
        <div className="shape-text-overlay" style={{
          color: resolvedTextColor, fontFamily: resolvedFont,
          fontSize: FONT_SIZE_MAP[fontSize],
          alignItems: V_ALIGN_MAP[verticalAlign],
          justifyContent: H_ALIGN_MAP[textAlign],
          textAlign,
        }}>{text}</div>
      )}
      {!editing && text && isLine && (
        <div className="shape-line-label" style={{ color: resolvedTextColor, fontFamily: resolvedFont, fontSize: FONT_SIZE_MAP[fontSize] }}>{text}</div>
      )}

      {editing && (
        <div className={isLine ? "shape-line-label-edit" : "shape-textarea-wrap"} style={!isLine ? {
          alignItems: V_ALIGN_MAP[verticalAlign],
        } : {}}>
          <div
            ref={textareaRef}
            className="shape-textarea"
            style={{ color: resolvedTextColor, fontFamily: resolvedFont, fontSize: FONT_SIZE_MAP[fontSize], textAlign }}
            contentEditable
            suppressContentEditableWarning
            onInput={e => setDraft(e.currentTarget.textContent)}
            onBlur={commitEdit}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === "Escape") { setEditing(false); setDraft(text ?? ""); onStopEdit?.(); }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
            }}
            onMouseDown={e => e.stopPropagation()}
          />
        </div>
      )}

      {isSelected && !isGroupSelected && !isLine && (
        <>
          <div className="shape-handle nw" onMouseDown={e => handleResizeMouseDown(e, "nw")} />
          <div className="shape-handle ne" onMouseDown={e => handleResizeMouseDown(e, "ne")} />
          <div className="shape-handle sw" onMouseDown={e => handleResizeMouseDown(e, "sw")} />
          <div className="shape-handle se" onMouseDown={e => handleResizeMouseDown(e, "se")} />
        </>
      )}
      {isSelected && !isGroupSelected && isLine && (
        <>
          <div className="shape-handle line-w" onMouseDown={e => handleResizeMouseDown(e, "sw")} />
          <div className="shape-handle line-e" onMouseDown={e => handleResizeMouseDown(e, "se")} />
        </>
      )}

      {isSelected && !isGroupSelected && !editing && (
        <div className="shape-rotate-handle" onMouseDown={handleRotateMouseDown} title="Drag to rotate">↻</div>
      )}
      {isSelected && !isGroupSelected && !editing && (
        <div className="shape-hint">
          {isLine ? "Double-click to add label" : "Double-click to edit text"}
        </div>
      )}
    </div>
  );
}

export default memo(function Shape({ onEndpointDrag, isGroupSelected, onGroupDragStart, ...props }) {
  const { shape: shapeData } = props;
  if (shapeData.shape === "line" && shapeData.points?.length >= 2) {
    return <FlexLine {...props} onEndpointDrag={onEndpointDrag} isGroupSelected={isGroupSelected} onGroupDragStart={onGroupDragStart} />;
  }
  return <RegularShape {...props} isGroupSelected={isGroupSelected} onGroupDragStart={onGroupDragStart} />;
});
