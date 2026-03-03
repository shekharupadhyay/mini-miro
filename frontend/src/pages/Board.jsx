import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchNotes, createNote, updateNote, deleteNote } from "../api/notesApi";
import ContextMenu from "../components/ContextMenu";
import Note from "../components/Note";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function Board() {
  const { boardId } = useParams();
  const viewportRef = useRef(null);

  const [notes, setNotes] = useState([]);

  const [menu, setMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    noteId: null,
  });

  // camera: pan (x,y in screen px) + zoom scale
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });

  // panning state
  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    camStartX: 0,
    camStartY: 0,
  });

  // Load notes
  useEffect(() => {
    (async () => {
      const data = await fetchNotes(boardId);
      setNotes(data);
      setCamera((c) => ({ ...c, x: 80, y: 80 }));
    })();
  }, [boardId]);

  // Used by Note component while dragging (updates local state)
  function onPositionChange(id, x, y) {
    setNotes((prev) =>
      prev.map((n) => (n._id === id ? { ...n, x, y } : n))
    );
  }

  // screen -> world
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
  }, [camera]);

  // Add note (typed) at center of screen (in world coords)
  async function handleAdd() {
    const text = prompt("Note text?");
    if (text === null) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const world = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);

    const newNote = await createNote(boardId, {
      text: text.trim(),
      x: Math.round(world.x),
      y: Math.round(world.y),
      color: "yellow",
    });

    setNotes((prev) => [...prev, newNote]);
  }

  // Menu open/close
  function openMenu({ noteId, x, y }) {
    setMenu({ open: true, x, y, noteId });
  }

  function closeMenu() {
    setMenu((m) => ({ ...m, open: false, noteId: null }));
  }

  // Menu actions
  async function handleEditFromMenu() {
    const note = notes.find((n) => n._id === menu.noteId);
    if (!note) return;

    const text = prompt("Edit note text:", note.text);
    if (text === null) return;

    const updated = await updateNote(menu.noteId, { text });
    setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
  }

  async function handleDeleteFromMenu() {
    const ok = confirm("Delete this note?");
    if (!ok) return;

    await deleteNote(menu.noteId);
    setNotes((prev) => prev.filter((n) => n._id !== menu.noteId));
  }

  // Zoom helper: zoom around mouse point (or center)
  function zoomAt(clientX, clientY, zoomFactor) {
    const rect = viewportRef.current.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    setCamera((c) => {
      const nextScale = clamp(c.scale * zoomFactor, 0.3, 2.5);

      const worldX = (sx - c.x) / c.scale;
      const worldY = (sy - c.y) / c.scale;

      const nextX = sx - worldX * nextScale;
      const nextY = sy - worldY * nextScale;

      return { x: nextX, y: nextY, scale: nextScale };
    });
  }

  function handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAt(e.clientX, e.clientY, zoomFactor);
  }

  // Pan with right mouse button OR middle mouse button
  function handleMouseDown(e) {
    // If context menu is open and user left-clicks anywhere, close it
    if (e.button === 0 && menu.open) closeMenu();

    // right-click or middle-click pans
    if (e.button !== 1 && e.button !== 2) return;
    e.preventDefault();

    panRef.current.active = true;
    panRef.current.startX = e.clientX;
    panRef.current.startY = e.clientY;
    panRef.current.camStartX = camera.x;
    panRef.current.camStartY = camera.y;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(e) {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;

    setCamera((c) => ({
      ...c,
      x: panRef.current.camStartX + dx,
      y: panRef.current.camStartY + dy,
    }));
  }

  function handleMouseUp() {
    panRef.current.active = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
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

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Link to="/" style={{ color: "white", opacity: 0.9 }}>
          ← Back
        </Link>
        <div style={{ fontWeight: 700 }}>Mini Miro</div>
        <div style={{ opacity: 0.7 }}>Board: {boardId}</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={handleAdd}>+ Add Note</button>
          <button onClick={zoomOut}>−</button>
          <button onClick={zoomIn}>+</button>
          <button onClick={resetView}>Reset</button>
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 20px 20px, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          cursor: panRef.current.active ? "grabbing" : "default",
        }}
      >
        {/* World layer (pan+zoom applied here) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            transformOrigin: "0 0",
            width: 1,
            height: 1,
          }}
        >
          {notes.map((n) => (
            <Note
              key={n._id}
              note={n}
              onPositionChange={onPositionChange}
              screenToWorld={screenToWorld}
              onOpenMenu={openMenu}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 12,
            opacity: 0.9,
          }}
        >
          Pan: Right click drag / Middle mouse drag • Zoom: Mouse wheel • Scale:{" "}
          {camera.scale.toFixed(2)}
        </div>
      </div>

      <ContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        onClose={closeMenu}
        onEdit={handleEditFromMenu}
        onDelete={handleDeleteFromMenu}
      />
    </div>
  );
}