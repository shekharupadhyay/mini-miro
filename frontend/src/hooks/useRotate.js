export function useRotate({ elRef, id, rotation, onUpdate }) {
  return function handleRotateMouseDown(e) {
    e.stopPropagation();
    e.preventDefault();
    const el   = elRef.current;
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const startRot   = rotation;
    function onMove(ev) {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI);
      onUpdate(id, { rotation: (startRot + (angle - startAngle) + 360) % 360 });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
}
