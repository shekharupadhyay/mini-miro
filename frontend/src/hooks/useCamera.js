import { useMemo, useRef, useState } from "react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Owns all camera / viewport logic: pan, zoom, coordinate mapping.
 */
export function useCamera(viewportRef) {
  const [camera, setCamera] = useState({ x: 80, y: 80, scale: 1 });
  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    camStartX: 0,
    camStartY: 0,
    button: 0,
    moved: false,
  });

  const screenToWorld = useMemo(() => {
    return (clientX, clientY) => {
      const rect = viewportRef.current.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - camera.x) / camera.scale,
        y: (sy - camera.y) / camera.scale,
      };
    };
  }, [camera, viewportRef]);

  function zoomAt(clientX, clientY, zoomFactor) {
    const rect = viewportRef.current.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    setCamera((c) => {
      const nextScale = clamp(c.scale * zoomFactor, 0.3, 2.5);
      const worldX = (sx - c.x) / c.scale;
      const worldY = (sy - c.y) / c.scale;
      return {
        x: sx - worldX * nextScale,
        y: sy - worldY * nextScale,
        scale: nextScale,
      };
    });
  }

  function handleWheel(e) {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 0.9);
  }

  function handleMouseMove(e) {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) panRef.current.moved = true;
    if (panRef.current.moved) {
      setCamera((c) => ({
        ...c,
        x: panRef.current.camStartX + dx,
        y: panRef.current.camStartY + dy,
      }));
    }
  }

  function handleMouseUp(e, onRightClickCanvas) {
    const { moved, button, startX, startY } = panRef.current;
    panRef.current.active = false;
    panRef.current.moved = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", (ev) => handleMouseUp(ev, onRightClickCanvas));

    if (button === 2 && !moved) {
      onRightClickCanvas(startX, startY);
    }
  }

  /**
   * Returns a mousedown handler bound to the given callbacks.
   * onPlace(worldX, worldY)  — called when placingTool is active on left-click
   * onRightClickCanvas(screenX, screenY) — called on right-click without drag
   * onDeselect() — called on plain left-click to clear selection
   */
  function buildMouseDownHandler({ placingTool, onPlace, onRightClickCanvas, onDeselect, closeMenu }) {
    return function handleMouseDown(e) {
      if (e.button === 0) {
        if (placingTool) {
          const world = screenToWorld(e.clientX, e.clientY);
          onPlace(world.x, world.y);
          return;
        }
        closeMenu();
        onDeselect();
      }

      if (e.button !== 1 && e.button !== 2) return;
      e.preventDefault();
      panRef.current = {
        active: true,
        moved: false,
        button: e.button,
        startX: e.clientX,
        startY: e.clientY,
        camStartX: camera.x,
        camStartY: camera.y,
      };

      function onMove(ev) { handleMouseMove(ev); }
      function onUp(ev) {
        const { moved, button, startX, startY } = panRef.current;
        panRef.current.active = false;
        panRef.current.moved = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (button === 2 && !moved) {
          onRightClickCanvas(startX, startY);
        }
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };
  }

  function zoomIn() {
    const rect = viewportRef.current.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.15);
  }
  function zoomOut() {
    const rect = viewportRef.current.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.87);
  }
  function resetView() {
    setCamera({ x: 80, y: 80, scale: 1 });
  }

  return {
    camera,
    setCamera,
    screenToWorld,
    handleWheel,
    buildMouseDownHandler,
    zoomIn,
    zoomOut,
    resetView,
    panRef,
  };
}