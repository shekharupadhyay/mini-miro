import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";

import { useSocket }  from "../hooks/useSocket";
import { useCamera }  from "../hooks/useCamera";
import { useNotes }   from "../hooks/useNotes";
import { useShapes }  from "../hooks/useShapes";
import { exportAsPng }  from "../utils/exportAsPng";

import BoardTopbar      from "../components/BoardTopbar";
import BoardLeftToolbar from "../components/BoardLeftToolbar";
import DeleteNoteModal  from "../components/DeleteNoteModal";
import ContextMenu      from "../components/ContextMenu";
import ChatPanel        from "../components/ChatPanel";
import Note             from "../components/Note";
import Shape            from "../components/Shape";

import "./board.css";

export default function Board() {
  const { boardId } = useParams();
  const location = useLocation();
  const { username = "Guest", isAdmin = false } = location.state || {};
  const viewportRef = useRef(null);

  // ── UI-only state ─────────────────────────────────────────────────
  const [placingTool,    setPlacingTool]    = useState(null);
  const [editingNoteId,  setEditingNoteId]  = useState(null);
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [selectedShapeId,setSelectedShapeId]= useState(null);
  const [chatOpen,       setChatOpen]       = useState(false);
  const [deleteModal,    setDeleteModal]    = useState({ open: false, noteId: null });
  const [menu, setMenu] = useState({
    open: false, x: 0, y: 0,
    mode: "canvas", noteId: null, shapeId: null,
    worldX: 0, worldY: 0,
  });

  // ── Notes & Shapes state (used by useSocket for remote events) ────
  const [notesState,  setNotesState]  = useState([]);
  const [shapesState, setShapesState] = useState([]);

  // ── Hooks ─────────────────────────────────────────────────────────
  const { socket, socketRef, members } = useSocket(
    boardId, username, setNotesState, setShapesState
  );

  const {
    notes, setNotes,
    addNoteAt, handleNoteUpdate, onPositionChange,
    handleDeleteNote, handleSaveNoteText,
  } = useNotes(boardId, socketRef);

  const {
    shapes, setShapes,
    addShapeAt, handleShapeUpdate, handleDeleteShape,
  } = useShapes(boardId, socketRef);

  const onExport = () => exportAsPng(boardId, notes, shapes);

  const {
    camera, screenToWorld, handleWheel,
    buildMouseDownHandler, zoomIn, zoomOut, resetView, panRef,
  } = useCamera(viewportRef);

  // Keep notes/shapes in sync with socket-driven state updates
  useEffect(() => { if (notesState.length)  setNotes(notesState);  }, [notesState]);  // eslint-disable-line
  useEffect(() => { if (shapesState.length) setShapes(shapesState); }, [shapesState]); // eslint-disable-line

  // Escape cancels placing tool
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setPlacingTool(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Menu helpers ──────────────────────────────────────────────────
  function closeMenu() { setMenu((m) => ({ ...m, open: false })); }

  function openNoteMenu({ noteId, x, y }) {
    setMenu({ open: true, x, y, mode: "note", noteId, shapeId: null, worldX: 0, worldY: 0 });
  }

  function openShapeMenu({ shapeId, x, y }) {
    setMenu({ open: true, x, y, mode: "shape", noteId: null, shapeId, worldX: 0, worldY: 0 });
  }

  // ── Mouse handler (built by useCamera, wired here) ─────────────
  const handleMouseDown = buildMouseDownHandler({
    placingTool,
    onPlace: async (worldX, worldY) => {
      if (placingTool === "note") {
        const newId = await addNoteAt(worldX, worldY);
        setEditingNoteId(newId);
      } else if (placingTool?.startsWith("shape:")) {
        const shapeType = placingTool.split(":")[1];
        const newId = await addShapeAt(worldX, worldY, { shape: shapeType });
        setSelectedShapeId(newId);
      }
      setPlacingTool(null);
    },
    onRightClickCanvas: (screenX, screenY) => {
      const world = screenToWorld(screenX, screenY);
      setMenu({
        open: true, x: screenX, y: screenY,
        mode: "canvas", noteId: null, shapeId: null,
        worldX: world.x, worldY: world.y,
      });
    },
    onDeselect: () => setSelectedShapeId(null),
    closeMenu,
  });

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
        camera={camera}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onExport={onExport}
      />

      <div className="board-body">
        <div
          ref={viewportRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
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
                isEditing={editingNoteId === n._id}
                onOpenMenu={openNoteMenu}
                onUpdate={handleNoteUpdate}
                onPositionChange={onPositionChange}
                screenToWorld={screenToWorld}
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

          <div className="board-hint">
            Right-click canvas to add • Right-click note for actions • Pan: right-click drag / middle mouse • Zoom: scroll • Scale: {camera.scale.toFixed(2)}
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
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
      />
    </div>
  );
}