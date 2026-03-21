import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

import { useSocket }  from "../hooks/useSocket";
import { useCamera }  from "../hooks/useCamera";
import { useNotes }   from "../hooks/useNotes";
import { useShapes }  from "../hooks/useShapes";
import { exportAsPng }  from "../utils/exportAsPng";
import { authHeaders }  from "../utils/auth";

import BoardTopbar      from "../components/BoardTopbar";
import BoardLeftToolbar from "../components/BoardLeftToolbar";
import DeleteNoteModal  from "../components/DeleteNoteModal";
import ContextMenu      from "../components/ContextMenu";
import ChatPanel        from "../components/ChatPanel";
import Note             from "../components/Note";
import Shape            from "../components/Shape";
import ReactionOverlay  from "../components/ReactionOverlay";

import "./board.css";

const API = import.meta.env.VITE_API_BASE;

export default function Board() {
  const { boardId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { username = "Guest", isAdmin = false } = location.state || {};
  const viewportRef = useRef(null);

  // ── UI-only state ─────────────────────────────────────────────────
  const [placingTool,    setPlacingTool]    = useState(null);
  const [drawingLine,    setDrawingLine]    = useState(null); // { p1, p2 } preview while drag-drawing
  const [editingNoteId,  setEditingNoteId]  = useState(null);
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [selectedShapeId,setSelectedShapeId]= useState(null);
  const [chatOpen,       setChatOpen]       = useState(false);
  const [deleteModal,    setDeleteModal]    = useState({ open: false, noteId: null });
  const [reactions,      setReactions]      = useState([]);
  const [menu, setMenu] = useState({
    open: false, x: 0, y: 0,
    mode: "canvas", noteId: null, shapeId: null,
    worldX: 0, worldY: 0,
  });

  // ── Hooks ─────────────────────────────────────────────────────────
  const socketRef        = useRef(null);
  const onReactionRef    = useRef(null);
  const onBoardEventRef  = useRef(null);
  const getAvatarPosRef  = useRef(null);  // set by BoardTopbar

  const {
    notes, setNotes,
    addNoteAt, handleNoteUpdate,
    handleDeleteNote, handleSaveNoteText,
  } = useNotes(boardId, socketRef);

  const {
    shapes, setShapes,
    addShapeAt, addFlexLine, handleShapeUpdate, handleDeleteShape,
  } = useShapes(boardId, socketRef);

  const { socket, members } = useSocket(
    boardId, username, setNotes, setShapes, socketRef, onReactionRef, onBoardEventRef
  );

  // ── Reactions ─────────────────────────────────────────────────────
  onReactionRef.current = function handleReaction({ emoji, username: sender }) {
    const x = 5 + Math.random() * 85;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setReactions((prev) => [...prev, { id, emoji, username: sender, x: `${x}vw` }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3400);
  };

  // ── Board events (rename / delete broadcast) ──────────────────────
  onBoardEventRef.current = function handleBoardEvent({ type, newName }) {
    if (type === "renamed") {
      navigate(`/board/${newName}`, { replace: true, state: { username, isAdmin } });
    }
    if (type === "deleted") {
      navigate("/", { replace: true });
    }
  };

  function sendReaction(emoji) {
    socket?.emit("reaction", { emoji, username });
  }

  const onExport = () => exportAsPng(boardId, notes, shapes);

  // ── Board rename (admin) ───────────────────────────────────────────
  async function handleBoardRename(newName) {
    const res = await fetch(`${API}/api/rooms/${encodeURIComponent(boardId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || "Rename failed");
    }
    socket?.emit("board:rename", { newName });
  }

  // ── Board delete (admin) ───────────────────────────────────────────
  async function handleBoardDelete() {
    const res = await fetch(`${API}/api/rooms/${encodeURIComponent(boardId)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Delete failed");
    socket?.emit("board:delete");
  }

  const {
    camera, screenToWorld,
    buildMouseDownHandler, zoomIn, zoomOut, resetView, panRef,
  } = useCamera(viewportRef);

  // Escape cancels placing tool
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") { setPlacingTool(null); setDrawingLine(null); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Menu helpers ──────────────────────────────────────────────────
  function closeMenu() { setMenu((m) => ({ ...m, open: false })); }

  function openNoteMenu({ noteId, x, y }) {
    setMenu({ open: true, x, y, mode: "note", noteId, shapeId: null, worldX: 0, worldY: 0 });
  }

  function openShapeMenu({ shapeId, x, y }) {
    const shape = shapes.find((s) => s._id === shapeId);
    const mode = shape?.shape === "line" && shape?.points?.length >= 2 ? "flexline" : "shape";
    setMenu({ open: true, x, y, mode, noteId: null, shapeId, worldX: 0, worldY: 0 });
  }

  // ── Mouse handler (built by useCamera, wired here) ─────────────
  const handleMouseDown = buildMouseDownHandler({
    placingTool,
    onPlace: async (worldX, worldY) => {
      if (placingTool === "note") {
        const newId = await addNoteAt(worldX, worldY);
        setEditingNoteId(newId);
        setPlacingTool(null);
      } else if (placingTool?.startsWith("shape:")) {
        const shapeType = placingTool.split(":")[1];
        const newId = await addShapeAt(worldX, worldY, { shape: shapeType });
        setSelectedShapeId(newId);
        setPlacingTool(null);
      }
    },
    onRightClickCanvas: (screenX, screenY) => {
      const world = screenToWorld(screenX, screenY);
      setMenu({
        open: true, x: screenX, y: screenY,
        mode: "canvas", noteId: null, shapeId: null,
        worldX: world.x, worldY: world.y,
      });
    },
    onDeselect: () => { setSelectedShapeId(null); setSelectedNoteId(null); },
    closeMenu,
  });

  // ── Line draw interceptor (must be after handleMouseDown) ─────────
  const screenToWorldRef = useRef(screenToWorld);
  screenToWorldRef.current = screenToWorld;
  const addFlexLineRef = useRef(addFlexLine);
  addFlexLineRef.current = addFlexLine;

  const handleViewportMouseDown = (e) => {
    if (placingTool === "shape:line" && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      // Store viewport-relative screen coords for the preview SVG
      const rect = viewportRef.current.getBoundingClientRect();
      const p1Screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      // Store world coords for final shape creation
      const p1World = screenToWorldRef.current(e.clientX, e.clientY);
      const p1 = { x: Math.round(p1World.x), y: Math.round(p1World.y) };

      setDrawingLine({ p1: p1Screen, p2: p1Screen });

      const onMove = (ev) => {
        setDrawingLine({ p1: p1Screen, p2: { x: ev.clientX - rect.left, y: ev.clientY - rect.top } });
      };
      const onUp = async (ev) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setDrawingLine(null);
        setPlacingTool(null);
        const p2World = screenToWorldRef.current(ev.clientX, ev.clientY);
        const p2 = { x: Math.round(p2World.x), y: Math.round(p2World.y) };
        if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 5) {
          try {
            const newId = await addFlexLineRef.current(p1, p2);
            setSelectedShapeId(newId);
          } catch (err) {
            console.error("addFlexLine failed:", err);
          }
        }
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return;
    }
    handleMouseDown(e);
  };

  // ── Derived context menu values ───────────────────────────────────
  const COLOR_HEX = {
    black: "#1a1a1a", red: "#ef4444", orange: "#fb923c", yellow: "#eab308",
    green: "#22c55e", blue: "#3b82f6", purple: "#a855f7", pink: "#ec4899",
  };

  const menuNote  = notes.find((n) => n._id === menu.noteId);
  const menuShape = shapes.find((s) => s._id === menu.shapeId);

  const currentTextColor = (() => {
    if (menu.mode === "note") return menuNote?.textColor ?? "#111318";
    if (!menuShape) return "#111318";
    if (menuShape.textColor) return menuShape.textColor;
    return COLOR_HEX[menuShape.color ?? "black"] ?? "#1a1a1a";
  })();

  const currentFontFamily =
    menu.mode === "note"
      ? (menuNote?.fontFamily  ?? "sans")
      : (menuShape?.fontFamily ?? "sans");

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="board-page">
      <BoardTopbar
        boardId={boardId}
        username={username}
        isAdmin={isAdmin}
        members={members}
        onExport={onExport}
        chatOpen={chatOpen}
        onChatToggle={() => setChatOpen((o) => !o)}
        onReact={sendReaction}
        getAvatarPosRef={getAvatarPosRef}
        onRename={handleBoardRename}
        onDelete={handleBoardDelete}
      />

      <div className="board-body">
        <div
          ref={viewportRef}
          onMouseDown={handleViewportMouseDown}
          onContextMenu={(e) => e.preventDefault()}
          className="board-viewport"
          style={{
            cursor: placingTool
              ? "crosshair"
              : panRef.current.active
              ? "grabbing"
              : "default",
          }}
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
                isSelected={selectedNoteId === n._id}
                isEditing={editingNoteId === n._id}
                onSelect={(id) => setSelectedNoteId(id)}
                onOpenMenu={openNoteMenu}
                onUpdate={handleNoteUpdate}
                onStartEdit={() => setEditingNoteId(n._id)}
                onStopEdit={() => setEditingNoteId(null)}
                onSaveEdit={async (noteId, text) => {
                  await handleSaveNoteText(noteId, text);
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
                onSelect={(id) => setSelectedShapeId(id)}
                onDeselect={() => setSelectedShapeId(null)}
                onUpdate={handleShapeUpdate}
                onOpenMenu={openShapeMenu}
                onStopEdit={() => setEditingShapeId(null)}
              />
            ))}

          </div>

          {/* ── Line draw preview (viewport-level, screen coords) ── */}
          {drawingLine && (
            <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 50 }}>
              <line
                x1={drawingLine.p1.x} y1={drawingLine.p1.y}
                x2={drawingLine.p2.x} y2={drawingLine.p2.y}
                stroke="#010029" strokeWidth="2" strokeDasharray="7 4" opacity="0.7"
                strokeLinecap="round"
              />
              <circle cx={drawingLine.p1.x} cy={drawingLine.p1.y} r="5"
                fill="white" stroke="#010029" strokeWidth="2" />
              <circle cx={drawingLine.p2.x} cy={drawingLine.p2.y} r="5"
                fill="white" stroke="#010029" strokeWidth="2" />
            </svg>
          )}

          {/* ── Bottom zoom bar ────────────────────────────── */}
          <div className="board-bottom-bar">
            <button className="bbar-btn" onClick={zoomOut} title="Zoom out">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/><path d="M6.5 9h5"/>
              </svg>
            </button>
            <span className="bbar-zoom-label">{Math.round(camera.scale * 100)}%</span>
            <button className="bbar-btn" onClick={zoomIn} title="Zoom in">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/><path d="M9 6.5v5M6.5 9h5"/>
              </svg>
            </button>
            <div className="bbar-sep" />
            <button className="bbar-fit-btn" onClick={resetView}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"/>
              </svg>
              Fit View
            </button>
          </div>
        </div>

        <ContextMenu
          open={menu.open}
          x={menu.x}
          y={menu.y}
          mode={menu.mode}
          onClose={closeMenu}
          onAddNote={({ color } = {}) => addNoteAt(menu.worldX - 90, menu.worldY - 20, color)}
          onAddShape={({ shape }) => addShapeAt(menu.worldX - 60, menu.worldY - 60, { shape })}
          onEdit={() => { setEditingNoteId(menu.noteId); closeMenu(); }}
          onDelete={() => { setDeleteModal({ open: true, noteId: menu.noteId }); closeMenu(); }}
          onChangeColor={({ color }) => handleNoteUpdate(menu.noteId, { color })}
          onEditShape={() => { setEditingShapeId(menu.shapeId); closeMenu(); }}
          onDeleteShape={async () => {
            await handleDeleteShape(menu.shapeId);
            setSelectedShapeId(null);
            closeMenu();
          }}
          onShapeColor={(colorId) => handleShapeUpdate(menu.shapeId, { color: colorId })}
          onShapeFill={(fillId)   => handleShapeUpdate(menu.shapeId, { fillMode: fillId })}
          currentShapeColor={menuShape?.color    ?? "black"}
          currentShapeFill={menuShape?.fillMode  ?? "none"}
          onTextColor={(colorId) =>
            menu.mode === "note"
              ? handleNoteUpdate(menu.noteId,   { textColor: colorId })
              : handleShapeUpdate(menu.shapeId, { textColor: colorId })
          }
          onFontFamily={(fontId) =>
            menu.mode === "note"
              ? handleNoteUpdate(menu.noteId,   { fontFamily: fontId })
              : handleShapeUpdate(menu.shapeId, { fontFamily: fontId })
          }
          currentTextColor={currentTextColor}
          currentFontFamily={currentFontFamily}
          onLineType={(lt) => handleShapeUpdate(menu.shapeId, { lineType: lt })}
          currentLineType={menuShape?.lineType  ?? "straight"}
          onLineStyle={(ls) => handleShapeUpdate(menu.shapeId, { lineStyle: ls })}
          currentLineStyle={menuShape?.lineStyle ?? "solid"}
        />

        <DeleteNoteModal
          open={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, noteId: null })}
          onConfirm={async () => {
            await handleDeleteNote(deleteModal.noteId);
            setDeleteModal({ open: false, noteId: null });
          }}
        />

        <ChatPanel
          socket={socket}
          username={username}
          isOpen={chatOpen}
          onToggle={() => setChatOpen((o) => !o)}
        />
      </div>

      <BoardLeftToolbar
        placingTool={placingTool}
        setPlacingTool={setPlacingTool}
      />

      <ReactionOverlay reactions={reactions} />
    </div>
  );
}
