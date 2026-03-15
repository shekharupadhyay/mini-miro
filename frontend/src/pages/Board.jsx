import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchNotes, createNote, updateNote, deleteNote } from "../api/notesApi";
import Modal from "../components/Modal";
import ContextMenu from "../components/ContextMenu";
import Note from "../components/Note";
import "./board.css";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function Board() {
  const { boardId } = useParams();
  const viewportRef = useRef(null);

  const [notes, setNotes] = useState([]);

  // Single menu state — mode tells ContextMenu which section to render
  const [menu, setMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    mode: "canvas",   // "canvas" | "note"
    noteId: null,
    // world coords stored so canvas-add knows where to place the note
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

  // Load notes
  useEffect(() => {
    (async () => {
      const data = await fetchNotes(boardId);
      setNotes(data);
      setCamera((c) => ({ ...c, x: 80, y: 80 }));
    })();
  }, [boardId]);

  function onPositionChange(id, x, y) {
    setNotes((prev) =>
      prev.map((n) => (n._id === id ? { ...n, x, y } : n))
    );
  }

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

  // ── Add note ──────────────────────────────────────────────────────
  async function addNoteAt(worldX, worldY) {
    const newNote = await createNote(boardId, {
      text: "",
      x: Math.round(worldX),
      y: Math.round(worldY),
      color: "yellow",
    });
    setNotes((prev) => [...prev, newNote]);
    setEditingNoteId(newNote._id);
  }

  // Toolbar button — adds at screen center
  async function handleAdd() {
    const rect = viewportRef.current.getBoundingClientRect();
    const world = screenToWorld(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
    await addNoteAt(world.x, world.y);
  }

  // ── Menu helpers ──────────────────────────────────────────────────
  function closeMenu() {
    setMenu((m) => ({ ...m, open: false }));
  }

  // Called by Note component when the user right-clicks a note
  function openNoteMenu({ noteId, x, y }) {
    setMenu({ open: true, x, y, mode: "note", noteId, worldX: 0, worldY: 0 });
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
    if (e.button === 0 && menu.open) closeMenu();
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

        <div className="board-toolbar">
          <button className="add-note-btn" onClick={handleAdd}>+ Add Note</button>
          <div className="board-toolbar-sep" />
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
        style={{ cursor: panRef.current.active ? "grabbing" : "default" }}
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
              onPositionChange={onPositionChange}
              screenToWorld={screenToWorld}
              onOpenMenu={openNoteMenu}
              isEditing={editingNoteId === n._id}
              onStartEdit={() => setEditingNoteId(n._id)}
              onStopEdit={() => setEditingNoteId(null)}
              onSaveEdit={async (noteId, text) => {
                const updated = await updateNote(noteId, { text });
                setNotes((prev) =>
                  prev.map((n) => (n._id === updated._id ? updated : n))
                );
                setEditingNoteId(null);
              }}
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
        onAddNote={() => addNoteAt(menu.worldX - 90, menu.worldY - 20)}
        onEdit={openEditInline}
        onDelete={openDeleteModal}
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