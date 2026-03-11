import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchNotes, createNote, updateNote, deleteNote } from "../api/notesApi";
import Modal from "../components/Modal";
import ContextMenu from "../components/ContextMenu";
import Note from "../components/Note";
import "./Board.css";

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

  const [editModal, setEditModal] = useState({
    open: false,
    noteId: null,
    text: "",
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
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
    const world = screenToWorld(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );

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

  // Context menu actions -> open modals
  function openEditModal() {
    const note = notes.find((n) => n._id === menu.noteId);
    if (!note) return;

    setEditModal({ open: true, noteId: note._id, text: note.text });
    closeMenu();
  }

  function openDeleteModal() {
    setDeleteModal({ open: true, noteId: menu.noteId });
    closeMenu();
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
    // close menu on left click anywhere
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
    <div className="board-page">
      {/* Top bar */}
      <div className="board-topbar">
        <Link to="/" className="board-back-link">
          ← Back
        </Link>
        <div className="board-title">Mini Miro</div>
        <div className="board-subtitle">Board: {boardId}</div>

        <div className="board-toolbar">
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
  className="board-viewport"
  style={{
    cursor: panRef.current.active ? "grabbing" : "default",
  }}
>
        {/* World layer (pan+zoom applied here) */}
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
              onOpenMenu={openMenu}
            />
          ))}
        </div>

        <div className="board-hint">
          Pan: Right click drag / Middle mouse drag • Zoom: Mouse wheel • Scale:{" "}
          {camera.scale.toFixed(2)}
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        onClose={closeMenu}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      />

      {/* Edit Modal */}
      <Modal
        open={editModal.open}
        title="Edit note"
        onClose={() => setEditModal({ open: false, noteId: null, text: "" })}
      >
        <textarea
          value={editModal.text}
          onChange={(e) =>
            setEditModal((m) => ({ ...m, text: e.target.value }))
          }
          rows={6}
          style={{
            width: "100%",
            resize: "vertical",
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.25)",
            color: "white",
            outline: "none",
            fontSize: 14,
            lineHeight: 1.4,
          }}
          autoFocus
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 12,
          }}
        >
          <button
            onClick={() =>
              setEditModal({ open: false, noteId: null, text: "" })
            }
            style={secondaryBtn}
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              const id = editModal.noteId;
              if (!id) return;

              const text = editModal.text.trim();
              const updated = await updateNote(id, { text });

              setNotes((prev) =>
                prev.map((n) => (n._id === updated._id ? updated : n))
              );

              setEditModal({ open: false, noteId: null, text: "" });
            }}
            style={primaryBtn}
          >
            Save
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal.open}
        title="Delete note?"
        onClose={() => setDeleteModal({ open: false, noteId: null })}
      >
        <div style={{ opacity: 0.9, lineHeight: 1.4 }}>
          This will permanently delete the note.
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 14,
          }}
        >
          <button
            onClick={() => setDeleteModal({ open: false, noteId: null })}
            style={secondaryBtn}
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              const id = deleteModal.noteId;
              if (!id) return;

              await deleteNote(id);
              setNotes((prev) => prev.filter((n) => n._id !== id));

              setDeleteModal({ open: false, noteId: null });
            }}
            style={dangerBtn}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

const primaryBtn = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  borderRadius: 12,
  padding: "10px 14px",
  cursor: "pointer",
};

const secondaryBtn = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "transparent",
  color: "white",
  borderRadius: 12,
  padding: "10px 14px",
  cursor: "pointer",
  opacity: 0.9,
};

const dangerBtn = {
  border: "1px solid rgba(255,120,120,0.35)",
  background: "rgba(255,80,80,0.18)",
  color: "white",
  borderRadius: 12,
  padding: "10px 14px",
  cursor: "pointer",
};