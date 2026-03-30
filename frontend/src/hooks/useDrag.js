import { getBoardScale } from "../utils/canvas";

export function useDrag({ elRef, id, getPosition, onUpdate, disabled, isGroupSelected, onSelect, onGroupDragStart }) {
  return function handleDragStart(e) {
    if (e.button !== 0 || disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (isGroupSelected && onGroupDragStart) { onGroupDragStart(e); return; }
    onSelect?.(id);
    const scale = getBoardScale(elRef.current);
    const startX = e.clientX, startY = e.clientY;
    const { x: origX, y: origY } = getPosition();
    function onMove(ev) {
      onUpdate(id, { x: origX + (ev.clientX - startX) / scale, y: origY + (ev.clientY - startY) / scale });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
}
