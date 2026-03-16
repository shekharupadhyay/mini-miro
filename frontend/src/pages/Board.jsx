import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { fetchNotes, createNote, updateNote, deleteNote } from "../api/notesApi";
import { fetchShapes, createShape, updateShape, deleteShape } from "../api/shapesApi";
import Modal from "../components/Modal";
import ContextMenu from "../components/ContextMenu";
import Note from "../components/Note";
import Shape from "../components/Shape";
import "./board.css";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function Board() {
  const { boardId } = useParams();
  const location = useLocation();
  const { username = "Guest", isAdmin = false } = location.state || {};
  const viewportRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [editingShapeId,  setEditingShapeId]  = useState(null);
  const [placingTool,     setPlacingTool]     = useState(null); // null | "note"

  // Single menu state — mode tells ContextMenu which section to render
  const [menu, setMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    mode: "canvas",   // "canvas" | "note" | "shape"
    noteId: null,
    shapeId: null,
    worldX: 0,
    worldY: 0,
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    noteId: null,
  });

  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [editingNoteId, setEditingNoteId] = useState(null);

  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    camStartX: 0,
    camStartY: 0,
    button: 0,
    moved: false,
  });

  // Cancel placement mode on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setPlacingTool(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    (async () => {
      const [notesData, shapesData] = await Promise.all([
        fetchNotes(boardId),
        fetchShapes(boardId),
      ]);
      setNotes(notesData);
      setShapes(shapesData);
      setCamera((c) => ({ ...c, x: 80, y: 80 }));
    })();
  }, [boardId]);


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

  // Live position update during note drag (local state only, API saved on mouseup in Note)
  function onPositionChange(id, x, y) {
    setNotes(prev => prev.map(n => n._id === id ? { ...n, x, y } : n));
  }

  // ── Add note ──────────────────────────────────────────────────────
  async function addNoteAt(worldX, worldY, color = "yellow") {
    const newNote = await createNote(boardId, {
      text: "",
      x: Math.round(worldX),
      y: Math.round(worldY),
      w: 200,
      h: 120,
      color,
      rotation: 0,
    });
    setNotes((prev) => [...prev, newNote]);
    setEditingNoteId(newNote._id);
  }

  // Toolbar button — activates note placement mode
  function handleAdd() {
    setPlacingTool(prev => prev === "note" ? null : "note");
  }

  // ── Add shape ─────────────────────────────────────────────────────
  async function addShapeAt(worldX, worldY, { shape }) {
    const isLine = shape === "line";
    const saved = await createShape(boardId, {
      shape,
      x: Math.round(worldX),
      y: Math.round(worldY),
      w: isLine ? 160 : 120,
      h: isLine ? 4   : 120,
      text:     "",
      color:    "black",
      fillMode: "none",
    });
    setShapes(prev => [...prev, saved]);
    setSelectedShapeId(saved._id);
  }

  // Debounce timer ref — avoids hammering the API on every pixel during resize/drag
  const updateTimerRef = useRef({});

  const handleShapeUpdate = useCallback((id, patch) => {
    // Update local state immediately for smooth interaction
    setShapes(prev => prev.map(sh => sh._id === id ? { ...sh, ...patch } : sh));

    // Debounce the API call — flush 300ms after the last update
    clearTimeout(updateTimerRef.current[id]);
    updateTimerRef.current[id] = setTimeout(() => {
      updateShape(id, patch).catch(console.error);
    }, 300);
  }, []);

  const handleNoteUpdate = useCallback((id, patch) => {
    setNotes(prev => prev.map(n => n._id === id ? { ...n, ...patch } : n));

    clearTimeout(updateTimerRef.current[id]);
    updateTimerRef.current[id] = setTimeout(() => {
      updateNote(id, patch).catch(console.error);
    }, 300);
  }, []);

  // ── Menu helpers ──────────────────────────────────────────────────
  function closeMenu() {
    setMenu((m) => ({ ...m, open: false }));
  }

  // Called by Note component when the user right-clicks a note
  function openNoteMenu({ noteId, x, y }) {
    setMenu({ open: true, x, y, mode: "note", noteId, shapeId: null, worldX: 0, worldY: 0 });
  }

  // Called by Shape component on right-click
  function openShapeMenu({ shapeId, x, y }) {
    setMenu({ open: true, x, y, mode: "shape", noteId: null, shapeId, worldX: 0, worldY: 0 });
  }

  function openShapeEdit() {
    setEditingShapeId(menu.shapeId);
    closeMenu();
  }

  async function handleDeleteShape() {
    const id = menu.shapeId;
    if (!id) return;
    await deleteShape(id);
    setShapes(prev => prev.filter(s => s._id !== id));
    setSelectedShapeId(null);
    closeMenu();
  }

  function openEditInline() {
    setEditingNoteId(menu.noteId);
    closeMenu();
  }

  function openDeleteModal() {
    setDeleteModal({ open: true, noteId: menu.noteId });
    closeMenu();
  }

  // ── Zoom ──────────────────────────────────────────────────────────
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

  // ── Pan / right-click ─────────────────────────────────────────────
  function handleMouseDown(e) {
    if (e.button === 0) {
      // Placement mode — drop a note or shape at click position
      if (placingTool === "note") {
        const world = screenToWorld(e.clientX, e.clientY);
        addNoteAt(world.x, world.y);
        setPlacingTool(null);
        return;
      }
      if (placingTool?.startsWith("shape:")) {
        const world = screenToWorld(e.clientX, e.clientY);
        const shapeType = placingTool.split(":")[1];
        addShapeAt(world.x, world.y, { shape: shapeType });
        setPlacingTool(null);
        return;
      }
      if (menu.open) closeMenu();
      setSelectedShapeId(null);
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(e) {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      panRef.current.moved = true;
    }

    if (panRef.current.moved) {
      setCamera((c) => ({
        ...c,
        x: panRef.current.camStartX + dx,
        y: panRef.current.camStartY + dy,
      }));
    }
  }

  function handleMouseUp(e) {
    const { moved, button, startX, startY } = panRef.current;
    panRef.current.active = false;
    panRef.current.moved = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);

    // Right-click that didn't pan → open canvas context menu
    if (button === 2 && !moved) {
      const world = screenToWorld(startX, startY);
      setMenu({
        open: true,
        x: startX,
        y: startY,
        mode: "canvas",
        noteId: null,
        worldX: world.x,
        worldY: world.y,
      });
    }
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
    <div className="board-page">
      {/* Top bar */}
      <div className="board-topbar">
        <Link to="/" className="board-back-link">← Back</Link>

        <div className="board-divider" />

        <div className="board-brand">
          <div className="board-logo">
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="5" height="5" />
              <rect x="8" y="1" width="5" height="5" />
              <rect x="1" y="8" width="5" height="5" />
              <rect x="8" y="8" width="5" height="5" />
            </svg>
          </div>
          <span className="board-title">MiniMiro</span>
        </div>

        <div className="board-divider" />
        <span className="board-subtitle">{boardId}</span>

        <div className="board-user-pill">
          {isAdmin && <span className="board-admin-badge" title="Room Admin">👑</span>}
          <span className="board-username">{username}</span>
        </div>

        <div className="board-toolbar">
          <button className="btn-zoom" onClick={zoomOut} title="Zoom out">−</button>
          <button className="btn-zoom" onClick={zoomIn} title="Zoom in">+</button>
          <button onClick={resetView}>Reset</button>
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => e.preventDefault()}
        className="board-viewport"
        style={{ cursor: (placingTool) ? "crosshair" : panRef.current.active ? "grabbing" : "default" }}
      >
        <div
          className="board-world"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          }}
        >
          {notes.map((n) => (
            <Note
              key={n._id}
              note={n}
              isEditing={editingNoteId === n._id}
              onOpenMenu={openNoteMenu}
              onUpdate={handleNoteUpdate}
              onPositionChange={onPositionChange}
              screenToWorld={screenToWorld}
              onStartEdit={() => setEditingNoteId(n._id)}
              onStopEdit={() => setEditingNoteId(null)}
              onSaveEdit={async (noteId, text) => {
                const updated = await updateNote(noteId, { text });
                setNotes(prev => prev.map(n => n._id === updated._id ? updated : n));
                setEditingNoteId(null);
              }}
            />
          ))}

          {shapes.map((s) => (
            <Shape
              key={s._id}
              shape={s}
              isSelected={selectedShapeId === s._id}
              isEditing={editingShapeId === s._id}
              onSelect={id => setSelectedShapeId(id)}
              onDeselect={() => setSelectedShapeId(null)}
              onUpdate={handleShapeUpdate}
              onOpenMenu={openShapeMenu}
              onStopEdit={() => setEditingShapeId(null)}
            />
          ))}
        </div>

        <div className="board-hint">
          Right-click canvas to add • Right-click note for actions • Pan: right-click drag / middle mouse • Zoom: scroll • Scale: {camera.scale.toFixed(2)}
        </div>
      </div>

      {/* Unified Context Menu */}
      <ContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        mode={menu.mode}
        onClose={closeMenu}
        onAddNote={({ color } = {}) => addNoteAt(menu.worldX - 90, menu.worldY - 20, color)}
        onAddShape={({ shape }) => addShapeAt(menu.worldX - 60, menu.worldY - 60, { shape })}
        onEdit={openEditInline}
        onDelete={openDeleteModal}
        onChangeColor={({ color }) => handleNoteUpdate(menu.noteId, { color })}
        onEditShape={openShapeEdit}
        onDeleteShape={handleDeleteShape}
        onShapeColor={colorId => handleShapeUpdate(menu.shapeId, { color: colorId })}
        onShapeFill={fillId   => handleShapeUpdate(menu.shapeId, { fillMode: fillId })}
        currentShapeColor={shapes.find(s => s._id === menu.shapeId)?.color      ?? "black"}
        currentShapeFill={shapes.find(s  => s._id === menu.shapeId)?.fillMode   ?? "none"}
        onTextColor={colorId  => menu.mode === "note"
          ? handleNoteUpdate(menu.noteId,   { textColor: colorId })
          : handleShapeUpdate(menu.shapeId, { textColor: colorId })}
        onFontFamily={fontId  => menu.mode === "note"
          ? handleNoteUpdate(menu.noteId,   { fontFamily: fontId })
          : handleShapeUpdate(menu.shapeId, { fontFamily: fontId })}
        currentTextColor={(() => {
          if (menu.mode === "note") {
            return notes.find(n => n._id === menu.noteId)?.textColor ?? "#111318";
          }
          const s = shapes.find(s => s._id === menu.shapeId);
          if (!s) return "#111318";
          // If textColor is explicitly set, use it; otherwise show the shape's stroke color
          if (s.textColor) return s.textColor;
          const SHAPE_COLOR_HEX = {
            black: "#1a1a1a", red: "#ef4444", orange: "#fb923c", yellow: "#eab308",
            green: "#22c55e", blue: "#3b82f6", purple: "#a855f7", pink: "#ec4899",
          };
          return SHAPE_COLOR_HEX[s.color ?? "black"] ?? "#1a1a1a";
        })()}
        currentFontFamily={menu.mode === "note"
          ? (notes.find(n  => n._id === menu.noteId)?.fontFamily  ?? "sans")
          : (shapes.find(s => s._id === menu.shapeId)?.fontFamily ?? "sans")}
      />

      {/* Delete Modal */}
      <Modal
        open={deleteModal.open}
        title="Delete note?"
        onClose={() => setDeleteModal({ open: false, noteId: null })}
      >
        <div className="modal-delete-icon">🗑️</div>
        <div className="modal-delete-message">
          This note will be permanently removed from the board. This action cannot be undone.
        </div>
        <div className="modal-actions">
          <button
            className="modal-btn modal-btn-secondary"
            onClick={() => setDeleteModal({ open: false, noteId: null })}
          >
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-danger"
            onClick={async () => {
              const id = deleteModal.noteId;
              if (!id) return;
              await deleteNote(id);
              setNotes((prev) => prev.filter((n) => n._id !== id));
              setDeleteModal({ open: false, noteId: null });
            }}
          >
            Delete note
          </button>
        </div>
      </Modal>
      {/* Floating left-center toolbar */}
      <div className="board-left-toolbar">
        <button
          className={`left-toolbar-btn${placingTool === "note" ? " active" : ""}`}
          onClick={handleAdd}
          title="Add sticky note — click to place"
        >
          🗒️
          <span className="left-toolbar-label">Note</span>
        </button>

        <div className="left-toolbar-divider" />

        {/* Shape button — toggles inline shape picker */}
        <button
          className={`left-toolbar-btn${placingTool?.startsWith("shape:") ? " active" : ""}`}
          onClick={() => setPlacingTool(v => v?.startsWith("shape:") ? null : "shape:rectangle")}
          title="Add shape"
        >
          🔷
          <span className="left-toolbar-label">Shape</span>
        </button>

        {/* Shape type sub-panel */}
        {placingTool?.startsWith("shape:") && (
          <div className="left-toolbar-shape-picker">
            {[
              { id: "rectangle", icon: "▭" },
              { id: "circle",    icon: "○" },
              { id: "triangle",  icon: "△" },
              { id: "line",      icon: "╱" },
            ].map(s => (
              <button
                key={s.id}
                className={`left-toolbar-shape-btn${placingTool === `shape:${s.id}` ? " active" : ""}`}
                title={s.id}
                onClick={() => setPlacingTool(`shape:${s.id}`)}
              >
                {s.icon}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const secondaryBtn = {
  border: "1px solid rgba(0,0,0,0.1)",
  background: "transparent",
  color: "rgba(17,19,24,0.55)",
  borderRadius: 8,
  padding: "9px 16px",
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 13,
  fontFamily: "var(--font)",
  letterSpacing: "0.01em",
  transition: "background 0.15s, color 0.15s",
};

const dangerBtn = {
  border: "1px solid rgba(224,60,60,0.3)",
  background: "rgba(224,60,60,0.08)",
  color: "#c02020",
  borderRadius: 8,
  padding: "9px 16px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  fontFamily: "var(--font)",
  letterSpacing: "0.01em",
  transition: "background 0.15s",
};