import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

import { useSocket }      from "../hooks/useSocket";
import { useCamera }      from "../hooks/useCamera";
import { useNotes }       from "../hooks/useNotes";
import { useShapes }      from "../hooks/useShapes";
import { useBoardSync }   from "../hooks/useBoardSync";
import { useLineDrawing } from "../hooks/useLineDrawing";
import { useMultiSelect } from "../hooks/useMultiSelect";
import { exportAsPng }    from "../utils/exportAsPng";
import { authHeaders, getMe } from "../utils/auth";
import { getAnchorPos }   from "../utils/anchors";
import { SHAPE_COLORS }   from "../components/contextMenuData";

import BoardTopbar          from "../components/BoardTopbar";
import BoardLeftToolbar     from "../components/BoardLeftToolbar";
import ContextMenu          from "../components/ContextMenu";
import ChatPanel            from "../components/ChatPanel";
import Note                 from "../components/Note";
import Shape                from "../components/Shape";
import ZoomBar              from "../components/ZoomBar";
import MultiSelectToolbar   from "../components/MultiSelectToolbar";
import LineDrawPreview      from "../components/LineDrawPreview";
import ReactionOverlay      from "../components/ReactionOverlay";
import AIAssistantPanel    from "../components/AIAssistantPanel";
import AIRefineModal       from "../components/AIRefineModal";

import "./board-page.css";

const API = import.meta.env.VITE_API_BASE;

// ── Selection state reducer ────────────────────────────────────────────
const SEL_INIT = { selectedNoteId: null, selectedShapeId: null, editingNoteId: null, editingShapeId: null };

function selectionReducer(state, action) {
  switch (action.type) {
    case "SELECT_NOTE":     return { ...SEL_INIT, selectedNoteId: action.id };
    case "SELECT_SHAPE":    return { ...SEL_INIT, selectedShapeId: action.id };
    case "EDIT_NOTE":       return { ...SEL_INIT, selectedNoteId: action.id, editingNoteId: action.id };
    case "EDIT_SHAPE":      return { ...SEL_INIT, selectedShapeId: action.id, editingShapeId: action.id };
    case "STOP_EDIT_NOTE":  return { ...state, editingNoteId: null };
    case "STOP_EDIT_SHAPE": return { ...state, editingShapeId: null };
    case "DESELECT_ALL":    return SEL_INIT;
    default:                return state;
  }
}

export default function Board() {
  const { boardId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { username = "Guest", isAdmin = false, boardName: initialBoardName, inviteCode: initialInviteCode } = location.state || {};
  const [boardName, setBoardName] = useState(initialBoardName ?? "");
  const inviteCode = initialInviteCode ?? "";
  const viewportRef = useRef(null);

  // Direct URL navigation: fetch user + room, auto-join, then re-navigate with full state
  useEffect(() => {
    if (location.state?.username) return; // came from dashboard, already have everything
    (async () => {
      const me = await getMe();
      if (!me) { navigate("/login", { replace: true }); return; }
      const r = await fetch(`${API}/api/rooms/${boardId}`).catch(() => null);
      const room = r?.ok ? await r.json() : null;
      if (!room) { navigate("/", { replace: true }); return; }
      await fetch(`${API}/api/rooms/${room._id}/join`, {
        method: "POST", headers: authHeaders(),
      }).catch(() => {});
      navigate(`/board/${boardId}`, {
        replace: true,
        state: {
          username:   me.name,
          isAdmin:    room.adminName === me.name,
          boardName:  room.name,
          inviteCode: room.inviteCode ?? "",
        },
      });
    })();
  }, [boardId]); // eslint-disable-line

  // ── UI-only state ─────────────────────────────────────────────────
  const [placingTool,    setPlacingTool]    = useState(null);
  const [sel, dispatchSel] = useReducer(selectionReducer, SEL_INIT);
  const { selectedNoteId, selectedShapeId, editingNoteId, editingShapeId } = sel;
  const selectNote    = useCallback((id) => dispatchSel({ type: "SELECT_NOTE",  id }), []);
  const selectShape   = useCallback((id) => dispatchSel({ type: "SELECT_SHAPE", id }), []);
  const editNote      = useCallback((id) => dispatchSel({ type: "EDIT_NOTE",    id }), []);
  const editShape     = useCallback((id) => dispatchSel({ type: "EDIT_SHAPE",   id }), []);
  const stopEditNote  = useCallback(()   => dispatchSel({ type: "STOP_EDIT_NOTE"  }), []);
  const stopEditShape = useCallback(()   => dispatchSel({ type: "STOP_EDIT_SHAPE" }), []);
  const deselectAll   = useCallback(()   => dispatchSel({ type: "DESELECT_ALL"    }), []);
  const [refineModal, setRefineModal] = useState({ open: false, type: null, id: null, text: "" });
  const [chatOpen,       setChatOpen]       = useState(false);
  const [hasUnread,      setHasUnread]      = useState(false);
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
      setBoardName(newName);
    }
    if (type === "deleted") {
      navigate("/", { replace: true });
    }
  };

  const sendReaction = useCallback((emoji) => {
    socket?.emit("reaction", { emoji, username });
  }, [socket, username]);

  const onExport = useCallback(() => exportAsPng(boardId, notes, shapes), [boardId, notes, shapes]);

  const handleRefineAccept = useCallback((newText) => {
    if (refineModal.type === "note") {
      handleSaveNoteText(refineModal.id, newText);
    } else {
      handleShapeUpdate(refineModal.id, { text: newText });
    }
    setRefineModal({ open: false, type: null, id: null, text: "" });
  }, [refineModal, handleSaveNoteText, handleShapeUpdate]);

  // ── Board rename (admin) ───────────────────────────────────────────
  const handleBoardRename = useCallback(async (newName) => {
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
  }, [boardId, socket]);

  // ── Board delete (admin) ───────────────────────────────────────────
  const handleBoardDelete = useCallback(async () => {
    const res = await fetch(`${API}/api/rooms/${encodeURIComponent(boardId)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Delete failed");
    socket?.emit("board:delete");
  }, [boardId, socket]);

  const {
    camera, screenToWorld,
    buildMouseDownHandler, zoomIn, zoomOut, resetView, panRef,
  } = useCamera(viewportRef);

  // Stable key handler — assigned after hooks so it can close over their values
  const onKeyRef = useRef(null);
  useEffect(() => {
    function onKey(e) { onKeyRef.current?.(e); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Menu helpers ──────────────────────────────────────────────────
  const closeMenu = useCallback(() => setMenu((m) => ({ ...m, open: false })), []);

  const openNoteMenu = useCallback(({ noteId, x, y }) => {
    setMenu({ open: true, x, y, mode: "note", noteId, shapeId: null, worldX: 0, worldY: 0 });
  }, []);

  const openShapeMenu = useCallback(({ shapeId, x, y }) => {
    const shape = shapes.find((s) => s._id === shapeId);
    const mode = shape?.shape === "line" && shape?.points?.length >= 2 ? "flexline" : "shape";
    setMenu({ open: true, x, y, mode, noteId: null, shapeId, worldX: 0, worldY: 0 });
  }, [shapes]);

  // ── Mouse handler (built by useCamera, wired here) ─────────────
  const handleMouseDown = buildMouseDownHandler({
    placingTool,
    onPlace: async (worldX, worldY) => {
      if (placingTool === "note") {
        const newId = await addNoteAt(worldX, worldY);
        editNote(newId);
        setPlacingTool(null);
      } else if (placingTool?.startsWith("shape:")) {
        const shapeType = placingTool.split(":")[1];
        const newId = await addShapeAt(worldX, worldY, { shape: shapeType });
        selectShape(newId);
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
    onDeselect: () => { deselectAll(); },
    closeMenu,
  });

  // ── Stable refs for use inside long-lived drag callbacks ──────────
  const screenToWorldRef = useRef(screenToWorld);
  screenToWorldRef.current = screenToWorld;
  const addFlexLineRef = useRef(addFlexLine);
  addFlexLineRef.current = addFlexLine;
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // ── Board sync + line drawing + multi-select hooks ─────────────────
  const { handleNoteUpdateWithSync, handleShapeUpdateWithSync } = useBoardSync({
    shapesRef, notesRef, handleShapeUpdate, handleNoteUpdate,
  });

  const {
    drawingLine, setDrawingLine,
    draggingEndpoint,
    beginLineDraw, handleFlexEndpointDrag, startLineFromAnchor,
  } = useLineDrawing({
    viewportRef, screenToWorldRef, cameraRef, addFlexLineRef, shapesRef,
    notes, shapes, setPlacingTool, selectShape, handleShapeUpdate,
  });

  const {
    selBox, setSelBox, multiSelected, setMultiSelected,
    handleGroupDragStart, handleSelectionMouseDown,
  } = useMultiSelect({
    viewportRef, cameraRef, notesRef, shapesRef,
    handleNoteUpdateWithSync, handleShapeUpdateWithSync, handleShapeUpdate,
    onDeselect: deselectAll,
    closeMenu,
  });

  // ── Stable per-item handlers (depend on stable callbacks above) ───
  const saveNoteTextRef = useRef(handleSaveNoteText);
  saveNoteTextRef.current = handleSaveNoteText;

  const handleNoteSelect  = useCallback((id) => { setMultiSelected(null); selectNote(id);  }, []);
  const handleShapeSelect = useCallback((id) => { setMultiSelected(null); selectShape(id); }, []);
  const handleNoteSaveEdit = useCallback(async (noteId, text) => {
    await saveNoteTextRef.current(noteId, text);
    stopEditNote();
  }, []);

  // Assigned here so it closes over values from the hooks above
  onKeyRef.current = (e) => {
    if (e.key === "Escape") { setPlacingTool(null); setDrawingLine(null); setMultiSelected(null); setSelBox(null); }
    if ((e.key === "Delete" || e.key === "Backspace") &&
        !["INPUT","TEXTAREA"].includes(document.activeElement?.tagName) &&
        document.activeElement?.getAttribute("contenteditable") !== "true") {
      if (multiSelected && (multiSelected.noteIds.length + multiSelected.shapeIds.length > 0)) {
        multiSelected.noteIds.forEach((id) => handleDeleteNote(id));
        multiSelected.shapeIds.forEach((id) => handleDeleteShape(id));
        setMultiSelected(null);
      } else if (selectedShapeId) {
        handleDeleteShape(selectedShapeId); deselectAll();
      } else if (selectedNoteId) {
        handleDeleteNote(selectedNoteId); deselectAll();
      }
    }
  };

  const handleViewportMouseDown = (e) => {
    if (placingTool === "shape:line" && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      const rect = viewportRef.current.getBoundingClientRect();
      const p1World = screenToWorldRef.current(e.clientX, e.clientY);
      const p1 = { x: Math.round(p1World.x), y: Math.round(p1World.y) };
      const p1Screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      beginLineDraw(p1, p1Screen);
      return;
    }

    if (e.button === 0 && !placingTool) {
      handleSelectionMouseDown(e);
      return;
    }

    handleMouseDown(e);
  };

  // ── Derived context menu values ───────────────────────────────────
  const menuNote  = useMemo(() => notes.find((n) => n._id === menu.noteId),  [notes, menu.noteId]);
  const menuShape = useMemo(() => shapes.find((s) => s._id === menu.shapeId), [shapes, menu.shapeId]);

  const currentTextColor = useMemo(() => {
    if (menu.mode === "note") return menuNote?.textColor ?? "#111318";
    if (!menuShape) return "#111318";
    if (menuShape.textColor) return menuShape.textColor;
    return SHAPE_COLORS.find((c) => c.id === (menuShape.color ?? "black"))?.hex ?? "#1a1a1a";
  }, [menu.mode, menuNote, menuShape]);

  const currentFontFamily = useMemo(
    () => menu.mode === "note" ? (menuNote?.fontFamily ?? "sans") : (menuShape?.fontFamily ?? "sans"),
    [menu.mode, menuNote, menuShape]
  );

  // ── Render ────────────────────────────────────────────────────────
  // Show spinner while auto-joining via direct URL (no location.state yet)
  if (!username) return <div className="db-loading"><div className="db-spinner" /></div>;

  return (
    <div className="board-page">
      <BoardTopbar
        boardName={boardName}
        inviteCode={inviteCode}
        username={username}
        isAdmin={isAdmin}
        members={members}
        onExport={onExport}
        chatOpen={chatOpen}
        onChatToggle={() => { setChatOpen((o) => !o); setHasUnread(false); }}
        hasUnread={hasUnread}
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
            {notes.map((n) => {
              const inGroup = !!multiSelected?.noteIds.includes(n._id);
              return (
                <Note
                  key={n._id}
                  note={n}
                  isSelected={selectedNoteId === n._id || inGroup}
                  isGroupSelected={inGroup}
                  isEditing={editingNoteId === n._id}
                  onSelect={handleNoteSelect}
                  onOpenMenu={openNoteMenu}
                  onUpdate={handleNoteUpdateWithSync}
                  onGroupDragStart={inGroup ? handleGroupDragStart : undefined}
                  onStartEdit={editNote}
                  onStopEdit={stopEditNote}
                  onSaveEdit={handleNoteSaveEdit}
                />
              );
            })}

            {shapes.map((s) => {
              const inGroup = !!multiSelected?.shapeIds.includes(s._id);
              return (
                <Shape
                  key={s._id}
                  shape={s}
                  isSelected={selectedShapeId === s._id || inGroup}
                  isGroupSelected={inGroup}
                  isEditing={editingShapeId === s._id}
                  onSelect={handleShapeSelect}
                  onDeselect={deselectAll}
                  onUpdate={handleShapeUpdateWithSync}
                  onGroupDragStart={inGroup ? handleGroupDragStart : undefined}
                  onOpenMenu={openShapeMenu}
                  onStopEdit={stopEditShape}
                  onEndpointDrag={(e, idx) => handleFlexEndpointDrag(s._id, idx, e)}
                />
              );
            })}

            {/* ── Anchors on selected element (or all elements when a line is selected) ── */}
            {(() => {
              const selNote  = selectedNoteId  ? notes.find((n) => n._id === selectedNoteId)  : null;
              const selShape = selectedShapeId ? shapes.find((s) => s._id === selectedShapeId) : null;
              const selectedLineActive = selShape && selShape.shape === "line" && selShape.points?.length >= 2;

              // Show clickable anchors on every shape/note only while dragging a line endpoint
              if (selectedLineActive && draggingEndpoint) {
                const allEls = [
                  ...notes.map((n) => ({ el: n, connType: "note" })),
                  ...shapes.filter((s) => !(s.shape === "line" && s.points?.length >= 2)).map((s) => ({ el: s, connType: "shape" })),
                ];
                return allEls.flatMap(({ el, connType }) =>
                  ["top", "bottom", "left", "right"].map((side) => {
                    const pos = getAnchorPos(el, side);
                    return (
                      <div key={`anchor-${el._id}-${side}`} className="connect-anchor"
                        style={{ left: pos.x, top: pos.y }}
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startLineFromAnchor(pos.x, pos.y, el._id, connType, side); }}
                      />
                    );
                  })
                );
              }

              // Don't show bounding-box anchors on a selected flex line — it uses endpoint circles
              if (selectedLineActive) return null;

              // Otherwise show anchors only on the selected element
              const rawEl = selNote ?? (selShape ?? null);
              if (!rawEl) return null;
              const connType = selNote ? "note" : "shape";
              return ["top", "bottom", "left", "right"].map((side) => {
                const pos = getAnchorPos(rawEl, side);
                return (
                  <div key={`anchor-${rawEl._id}-${side}`} className="connect-anchor"
                    style={{ left: pos.x, top: pos.y }}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startLineFromAnchor(pos.x, pos.y, rawEl._id, connType, side); }}
                  />
                );
              });
            })()}

            {/* ── Snap-target anchors on all other elements while drawing ── */}
            {drawingLine && <>
              {notes.filter((n) => n._id !== selectedNoteId).flatMap((n) =>
                ["top", "bottom", "left", "right"].map((side) => {
                  const pos = getAnchorPos(n, side);
                  return <div key={`tn-${n._id}-${side}`} className="connect-anchor connect-anchor--target" style={{ left: pos.x, top: pos.y }} />;
                })
              )}
              {shapes.filter((s) => !(s.shape === "line" && s.points?.length >= 2) && s._id !== selectedShapeId).flatMap((s) =>
                ["top", "bottom", "left", "right"].map((side) => {
                  const pos = getAnchorPos(s, side);
                  return <div key={`ts-${s._id}-${side}`} className="connect-anchor connect-anchor--target" style={{ left: pos.x, top: pos.y }} />;
                })
              )}
            </>}

          </div>

          {/* ── Selection box (viewport-level, screen coords) ── */}
          {selBox && (
            <div style={{
              position: "absolute", pointerEvents: "none", zIndex: 40,
              left: Math.min(selBox.x1, selBox.x2), top: Math.min(selBox.y1, selBox.y2),
              width: Math.abs(selBox.x2 - selBox.x1), height: Math.abs(selBox.y2 - selBox.y1),
              border: "1.5px dashed #3b82f6", background: "rgba(59,130,246,0.06)",
            }} />
          )}

          <MultiSelectToolbar
            multiSelected={multiSelected}
            onDelete={() => {
              multiSelected.noteIds.forEach((id) => handleDeleteNote(id));
              multiSelected.shapeIds.forEach((id) => handleDeleteShape(id));
              setMultiSelected(null);
            }}
          />

          <LineDrawPreview drawingLine={drawingLine} />

          <ZoomBar
            scale={camera.scale}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={resetView}
          />
        </div>

        <ContextMenu
          open={menu.open}
          x={menu.x}
          y={menu.y}
          mode={menu.mode}
          onClose={closeMenu}
          onAddNote={({ color } = {}) => addNoteAt(menu.worldX - 90, menu.worldY - 20, color)}
          onAddShape={({ shape }) => addShapeAt(menu.worldX - 60, menu.worldY - 60, { shape })}
          onEdit={() => { editNote(menu.noteId); closeMenu(); }}
          onDelete={async () => { await handleDeleteNote(menu.noteId); deselectAll(); closeMenu(); }}
          onChangeColor={({ color }) => handleNoteUpdate(menu.noteId, { color })}
          onEditShape={() => { editShape(menu.shapeId); closeMenu(); }}
          onDeleteShape={async () => {
            await handleDeleteShape(menu.shapeId);
            deselectAll();
            closeMenu();
          }}
          onShapeColor={(colorId) => handleShapeUpdate(menu.shapeId, { color: colorId })}
          onShapeFill={(fillId)   => handleShapeUpdate(menu.shapeId, { fillMode: fillId })}
          currentShapeColor={menuShape?.color    ?? "black"}
          currentShapeFill={menuShape?.fillMode  ?? "none"}
          onRefineNote={() => setRefineModal({ open: true, type: "note",  id: menu.noteId,  text: menuNote?.text  ?? "" })}
          onRefineShape={() => setRefineModal({ open: true, type: "shape", id: menu.shapeId, text: menuShape?.text ?? "" })}
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
          onFontSize={(sz) =>
            menu.mode === "note"
              ? handleNoteUpdate(menu.noteId,   { fontSize: sz })
              : handleShapeUpdate(menu.shapeId, { fontSize: sz })
          }
          currentFontSize={menu.mode === "note" ? (menuNote?.fontSize ?? "md") : (menuShape?.fontSize ?? "md")}
          onTextAlign={(a) =>
            menu.mode === "note"
              ? handleNoteUpdate(menu.noteId,   { textAlign: a })
              : handleShapeUpdate(menu.shapeId, { textAlign: a })
          }
          currentTextAlign={menu.mode === "note" ? (menuNote?.textAlign ?? "left") : (menuShape?.textAlign ?? "center")}
          onVerticalAlign={(a) =>
            menu.mode === "note"
              ? handleNoteUpdate(menu.noteId,   { verticalAlign: a })
              : handleShapeUpdate(menu.shapeId, { verticalAlign: a })
          }
          currentVerticalAlign={menu.mode === "note" ? (menuNote?.verticalAlign ?? "top") : (menuShape?.verticalAlign ?? "center")}
          onStrokeWidth={(sw) => handleShapeUpdate(menu.shapeId, { strokeWidth: sw })}
          currentStrokeWidth={menuShape?.strokeWidth ?? 2}
          onLineType={(lt) => handleShapeUpdate(menu.shapeId, { lineType: lt })}
          currentLineType={menuShape?.lineType  ?? "straight"}
          onLineStyle={(ls) => handleShapeUpdate(menu.shapeId, { lineStyle: ls })}
          currentLineStyle={menuShape?.lineStyle ?? "solid"}
        />

<ChatPanel
          socket={socket}
          username={username}
          isOpen={chatOpen}
          onToggle={() => { setChatOpen((o) => !o); setHasUnread(false); }}
          onUnread={() => setHasUnread(true)}
        />
      </div>

      <BoardLeftToolbar
        placingTool={placingTool}
        setPlacingTool={setPlacingTool}
      />

      <ReactionOverlay reactions={reactions} />

      <AIAssistantPanel notes={notes} shapes={shapes} />

      {refineModal.open && (
        <AIRefineModal
          text={refineModal.text}
          type={refineModal.type}
          onAccept={handleRefineAccept}
          onClose={() => setRefineModal({ open: false, type: null, id: null, text: "" })}
        />
      )}

    </div>
  );
}
