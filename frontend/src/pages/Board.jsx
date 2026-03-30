import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

import { useSocket }      from "../hooks/useSocket";
import { useCamera }      from "../hooks/useCamera";
import { useNotes }       from "../hooks/useNotes";
import { useShapes }      from "../hooks/useShapes";
import { useBoardSync }   from "../hooks/useBoardSync";
import { useLineDrawing } from "../hooks/useLineDrawing";
import { useMultiSelect } from "../hooks/useMultiSelect";
import { useHistory }     from "../hooks/useHistory";
import { createNote }     from "../api/notesApi";
import { createShape }    from "../api/shapesApi";
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

  const socketRef        = useRef(null);
  const onReactionRef    = useRef(null);
  const onBoardEventRef  = useRef(null);
  const getAvatarPosRef  = useRef(null);  // set by BoardTopbar

  const { push: hpush, undo: hundo, redo: hredo, futureRef: hfuture } = useHistory();
  const skipH      = useRef(false);
  const posNTimer  = useRef({});
  const preDragN   = useRef({});
  const posSTimer  = useRef({});
  const preDragS   = useRef({});

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

  onReactionRef.current = function handleReaction({ emoji, username: sender }) {
    const x = 5 + Math.random() * 85;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setReactions((prev) => [...prev, { id, emoji, username: sender, x: `${x}vw` }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3400);
  };

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

  const onKeyRef = useRef(null);
  useEffect(() => {
    function onKey(e) { onKeyRef.current?.(e); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeMenu = useCallback(() => setMenu((m) => ({ ...m, open: false })), []);

  const openNoteMenu = useCallback(({ noteId, x, y }) => {
    setMenu({ open: true, x, y, mode: "note", noteId, shapeId: null, worldX: 0, worldY: 0 });
  }, []);

  const openShapeMenu = useCallback(({ shapeId, x, y }) => {
    const shape = shapes.find((s) => s._id === shapeId);
    const mode = shape?.shape === "line" && shape?.points?.length >= 2 ? "flexline" : "shape";
    setMenu({ open: true, x, y, mode, noteId: null, shapeId, worldX: 0, worldY: 0 });
  }, [shapes]);

  const handleMouseDown = buildMouseDownHandler({
    placingTool,
    onPlace: async (worldX, worldY) => {
      if (placingTool === "note") {
        const newId = await addNoteAtH(worldX, worldY);
        editNote(newId);
        setPlacingTool(null);
      } else if (placingTool?.startsWith("shape:")) {
        const shapeType = placingTool.split(":")[1];
        const newId = await addShapeAtH(worldX, worldY, { shape: shapeType });
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

  const { handleNoteUpdateWithSync, handleShapeUpdateWithSync } = useBoardSync({
    shapesRef, notesRef, handleShapeUpdate, handleNoteUpdate,
  });

  const liveShapeUpdateForLinesRef = useRef(handleShapeUpdate);
  const stableShapeUpdateForLines  = useCallback(
    (id, patch) => liveShapeUpdateForLinesRef.current(id, patch),
    [] // deliberately empty — stability is the point
  );

  const {
    drawingLine, setDrawingLine,
    draggingEndpoint,
    beginLineDraw, handleFlexEndpointDrag, startLineFromAnchor,
  } = useLineDrawing({
    viewportRef, screenToWorldRef, cameraRef, addFlexLineRef, shapesRef,
    notes, shapes, setPlacingTool, selectShape,
    handleShapeUpdate: stableShapeUpdateForLines,
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

  function captureFields(obj, keys) {
    if (!obj) return {};
    return Object.fromEntries(keys.map(k => [k, obj[k]]));
  }

  const noteUpdateH = useCallback((id, patch) => {
    if (!skipH.current) {
      const note = notesRef.current.find(n => n._id === id);
      hpush({ type: "NOTE_UPDATE", noteId: id, before: captureFields(note, Object.keys(patch)), after: { ...patch } });
    }
    handleNoteUpdate(id, patch);
  }, [handleNoteUpdate]); // eslint-disable-line

  const shapeUpdateH = useCallback((id, patch) => {
    if (!skipH.current) {
      const shape = shapesRef.current.find(s => s._id === id);
      hpush({ type: "SHAPE_UPDATE", shapeId: id, before: captureFields(shape, Object.keys(patch)), after: { ...patch } });
    }
    handleShapeUpdate(id, patch);
  }, [handleShapeUpdate]); // eslint-disable-line

  const noteUpdateSyncH = useCallback((id, patch) => {
    if (!skipH.current && ("x" in patch || "y" in patch)) {
      const note = notesRef.current.find(n => n._id === id);
      if (!posNTimer.current[id] && note) preDragN.current[id] = { x: note.x, y: note.y };
      clearTimeout(posNTimer.current[id]);
      posNTimer.current[id] = setTimeout(() => {
        const n = notesRef.current.find(x => x._id === id);
        const b = preDragN.current[id];
        if (n && b && (b.x !== n.x || b.y !== n.y))
          hpush({ type: "NOTE_UPDATE", noteId: id, before: b, after: { x: n.x, y: n.y } });
        posNTimer.current[id] = null;
        delete preDragN.current[id];
      }, 400);
    } else if (!skipH.current) {
      const note = notesRef.current.find(n => n._id === id);
      hpush({ type: "NOTE_UPDATE", noteId: id, before: captureFields(note, Object.keys(patch)), after: { ...patch } });
    }
    handleNoteUpdateWithSync(id, patch);
  }, [handleNoteUpdateWithSync]); // eslint-disable-line

  const shapeUpdateSyncH = useCallback((id, patch) => {
    if (!skipH.current && ("x" in patch || "y" in patch)) {
      const shape = shapesRef.current.find(s => s._id === id);
      if (!posSTimer.current[id] && shape) preDragS.current[id] = { x: shape.x, y: shape.y };
      clearTimeout(posSTimer.current[id]);
      posSTimer.current[id] = setTimeout(() => {
        const s = shapesRef.current.find(x => x._id === id);
        const b = preDragS.current[id];
        if (s && b && (b.x !== s.x || b.y !== s.y))
          hpush({ type: "SHAPE_UPDATE", shapeId: id, before: b, after: { x: s.x, y: s.y } });
        posSTimer.current[id] = null;
        delete preDragS.current[id];
      }, 400);
    } else if (!skipH.current) {
      const shape = shapesRef.current.find(s => s._id === id);
      hpush({ type: "SHAPE_UPDATE", shapeId: id, before: captureFields(shape, Object.keys(patch)), after: { ...patch } });
    }
    handleShapeUpdateWithSync(id, patch);
  }, [handleShapeUpdateWithSync]); // eslint-disable-line

  const deleteNoteH = useCallback(async (id) => {
    if (!skipH.current) {
      const note = notesRef.current.find(n => n._id === id);
      if (note) hpush({ type: "NOTE_DELETE", noteId: id, before: { ...note }, after: null });
    }
    await handleDeleteNote(id);
  }, [handleDeleteNote]); // eslint-disable-line

  const deleteShapeH = useCallback(async (id) => {
    if (!skipH.current) {
      const shape = shapesRef.current.find(s => s._id === id);
      if (shape) hpush({ type: "SHAPE_DELETE", shapeId: id, before: { ...shape }, after: null });
    }
    await handleDeleteShape(id);
  }, [handleDeleteShape]); // eslint-disable-line

  const addNoteAtH = useCallback(async (worldX, worldY, color) => {
    const id = await addNoteAt(worldX, worldY, color);
    if (!skipH.current) hpush({ type: "NOTE_ADD", noteId: id, before: null, after: null });
    return id;
  }, [addNoteAt]); // eslint-disable-line

  const addShapeAtH = useCallback(async (worldX, worldY, opts) => {
    const id = await addShapeAt(worldX, worldY, opts);
    if (!skipH.current) hpush({ type: "SHAPE_ADD", shapeId: id, before: null, after: null });
    return id;
  }, [addShapeAt]); // eslint-disable-line

  const addFlexLineH = useCallback(async (p1, p2) => {
    const id = await addFlexLine(p1, p2);
    if (!skipH.current) hpush({ type: "SHAPE_ADD", shapeId: id, before: null, after: null });
    return id;
  }, [addFlexLine]); // eslint-disable-line

  function shapeEndpointUpdateH(id, patch) {
    if (!skipH.current && "points" in patch) {
      const shape = shapesRef.current.find(s => s._id === id);
      if (!posSTimer.current[id] && shape) {
        preDragS.current[id] = {
          bPts: shape.points ? shape.points.map(p => ({ ...p })) : [],
          aPts: null,
        };
      }
      if (preDragS.current[id]) {
        preDragS.current[id].aPts = patch.points.map(p => ({ ...p }));
      }
      clearTimeout(posSTimer.current[id]);
      posSTimer.current[id] = setTimeout(() => {
        const d = preDragS.current[id];
        if (d && d.aPts && JSON.stringify(d.bPts) !== JSON.stringify(d.aPts)) {
          hpush({ type: "SHAPE_UPDATE", shapeId: id, before: { points: d.bPts }, after: { points: d.aPts } });
        }
        posSTimer.current[id] = null;
        delete preDragS.current[id];
      }, 400);
    }
    handleShapeUpdate(id, patch);
  }

  addFlexLineRef.current              = addFlexLineH;
  liveShapeUpdateForLinesRef.current  = shapeEndpointUpdateH;

  const handleRefineAccept = useCallback((newText) => {
    if (refineModal.type === "note") {
      if (!skipH.current) {
        const note = notesRef.current.find(n => n._id === refineModal.id);
        if (note && note.text !== newText)
          hpush({ type: "NOTE_UPDATE", noteId: refineModal.id, before: { text: note.text }, after: { text: newText } });
      }
      handleSaveNoteText(refineModal.id, newText);
    } else {
      shapeUpdateH(refineModal.id, { text: newText });
    }
    setRefineModal({ open: false, type: null, id: null, text: "" });
  }, [refineModal, handleSaveNoteText, shapeUpdateH]); // eslint-disable-line

  function flushPendingPositions() {
    Object.keys(posNTimer.current).forEach(id => {
      if (!posNTimer.current[id]) return;
      clearTimeout(posNTimer.current[id]);
      posNTimer.current[id] = null;
      const n = notesRef.current.find(x => x._id === id);
      const b = preDragN.current[id];
      if (n && b && (b.x !== n.x || b.y !== n.y))
        hpush({ type: "NOTE_UPDATE", noteId: id, before: b, after: { x: n.x, y: n.y } });
      delete preDragN.current[id];
    });
    Object.keys(posSTimer.current).forEach(id => {
      if (!posSTimer.current[id]) return;
      clearTimeout(posSTimer.current[id]);
      posSTimer.current[id] = null;
      const b = preDragS.current[id];
      if (b) {
        if ("x" in b) {
          const s = shapesRef.current.find(x => x._id === id);
          if (s && (b.x !== s.x || b.y !== s.y))
            hpush({ type: "SHAPE_UPDATE", shapeId: id, before: b, after: { x: s.x, y: s.y } });
        } else if ("bPts" in b && b.aPts) {
          if (JSON.stringify(b.bPts) !== JSON.stringify(b.aPts))
            hpush({ type: "SHAPE_UPDATE", shapeId: id, before: { points: b.bPts }, after: { points: b.aPts } });
        }
      }
      delete preDragS.current[id];
    });
  }

  async function applyUndo() {
    flushPendingPositions();
    const entry = hundo(selectedNoteId, selectedShapeId);
    if (!entry) return;
    skipH.current = true;
    try {
      if (entry.type === "NOTE_UPDATE") {
        "x" in entry.before || "y" in entry.before
          ? handleNoteUpdateWithSync(entry.noteId, entry.before)
          : handleNoteUpdate(entry.noteId, entry.before);
      } else if (entry.type === "SHAPE_UPDATE") {
        "x" in entry.before || "y" in entry.before
          ? handleShapeUpdateWithSync(entry.shapeId, entry.before)
          : handleShapeUpdate(entry.shapeId, entry.before);
      } else if (entry.type === "NOTE_ADD") {
        await handleDeleteNote(entry.noteId);
        hfuture.current = hfuture.current.filter(e => e !== entry);
      } else if (entry.type === "NOTE_DELETE") {
        const { _id, __v, createdAt, updatedAt, ...data } = entry.before;
        const restored = await createNote(boardId, data);
        setNotes(prev => [...prev, restored]);
        socketRef.current?.emit("note:created", restored);
        entry.noteId = restored._id;
      } else if (entry.type === "SHAPE_ADD") {
        await handleDeleteShape(entry.shapeId);
        hfuture.current = hfuture.current.filter(e => e !== entry);
      } else if (entry.type === "SHAPE_DELETE") {
        const { _id, __v, createdAt, updatedAt, ...data } = entry.before;
        const restored = await createShape(boardId, data);
        setShapes(prev => [...prev, restored]);
        socketRef.current?.emit("shape:created", restored);
        entry.shapeId = restored._id;
      }
    } finally { skipH.current = false; }
  }

  async function applyRedo() {
    flushPendingPositions();
    const entry = hredo(selectedNoteId, selectedShapeId);
    if (!entry) return;
    skipH.current = true;
    try {
      if (entry.type === "NOTE_UPDATE") {
        "x" in entry.after || "y" in entry.after
          ? handleNoteUpdateWithSync(entry.noteId, entry.after)
          : handleNoteUpdate(entry.noteId, entry.after);
      } else if (entry.type === "SHAPE_UPDATE") {
        "x" in entry.after || "y" in entry.after
          ? handleShapeUpdateWithSync(entry.shapeId, entry.after)
          : handleShapeUpdate(entry.shapeId, entry.after);
      } else if (entry.type === "NOTE_DELETE") {
        await handleDeleteNote(entry.noteId);
      } else if (entry.type === "SHAPE_DELETE") {
        await handleDeleteShape(entry.shapeId);
      }
    } finally { skipH.current = false; }
  }

  const saveNoteTextRef = useRef(handleSaveNoteText);
  saveNoteTextRef.current = handleSaveNoteText;

  const handleNoteSelect  = useCallback((id) => { setMultiSelected(null); selectNote(id);  }, []);
  const handleShapeSelect = useCallback((id) => { setMultiSelected(null); selectShape(id); }, []);
  const handleNoteSaveEdit = useCallback(async (noteId, text) => {
    if (!skipH.current) {
      const note = notesRef.current.find(n => n._id === noteId);
      const before = { text: note?.text ?? "" };
      if (before.text !== text) hpush({ type: "NOTE_UPDATE", noteId, before, after: { text } });
    }
    await saveNoteTextRef.current(noteId, text);
    stopEditNote();
  }, [stopEditNote]);

  onKeyRef.current = (e) => {
    if (e.key === "Escape") { setPlacingTool(null); setDrawingLine(null); setMultiSelected(null); setSelBox(null); }

    const notEditing =
      !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) &&
      document.activeElement?.getAttribute("contenteditable") !== "true";

    if ((e.key === "Delete" || e.key === "Backspace") && notEditing) {
      if (multiSelected && (multiSelected.noteIds.length + multiSelected.shapeIds.length > 0)) {
        multiSelected.noteIds.forEach((id) => deleteNoteH(id));
        multiSelected.shapeIds.forEach((id) => deleteShapeH(id));
        setMultiSelected(null);
      } else if (selectedShapeId) {
        deleteShapeH(selectedShapeId); deselectAll();
      } else if (selectedNoteId) {
        deleteNoteH(selectedNoteId); deselectAll();
      }
    }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z" && notEditing) {
      e.preventDefault(); applyUndo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z")) && notEditing) {
      e.preventDefault(); applyRedo();
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
                  onUpdate={noteUpdateSyncH}
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
                  onUpdate={shapeUpdateSyncH}
                  onGroupDragStart={inGroup ? handleGroupDragStart : undefined}
                  onOpenMenu={openShapeMenu}
                  onStopEdit={stopEditShape}
                  onEndpointDrag={(e, idx) => handleFlexEndpointDrag(s._id, idx, e)}
                />
              );
            })}

            {(() => {
              const selNote  = selectedNoteId  ? notes.find((n) => n._id === selectedNoteId)  : null;
              const selShape = selectedShapeId ? shapes.find((s) => s._id === selectedShapeId) : null;
              const selectedLineActive = selShape && selShape.shape === "line" && selShape.points?.length >= 2;

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

              if (selectedLineActive) return null;

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
              multiSelected.noteIds.forEach((id) => deleteNoteH(id));
              multiSelected.shapeIds.forEach((id) => deleteShapeH(id));
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
          onAddNote={({ color } = {}) => addNoteAtH(menu.worldX - 90, menu.worldY - 20, color)}
          onAddShape={({ shape }) => addShapeAtH(menu.worldX - 60, menu.worldY - 60, { shape })}
          onEdit={() => { editNote(menu.noteId); closeMenu(); }}
          onDelete={async () => { await deleteNoteH(menu.noteId); deselectAll(); closeMenu(); }}
          onChangeColor={({ color }) => noteUpdateH(menu.noteId, { color })}
          onEditShape={() => { editShape(menu.shapeId); closeMenu(); }}
          onDeleteShape={async () => { await deleteShapeH(menu.shapeId); deselectAll(); closeMenu(); }}
          onShapeColor={(colorId) => shapeUpdateH(menu.shapeId, { color: colorId })}
          onShapeFill={(fillId)   => shapeUpdateH(menu.shapeId, { fillMode: fillId })}
          currentShapeColor={menuShape?.color    ?? "black"}
          currentShapeFill={menuShape?.fillMode  ?? "none"}
          onRefineNote={() => setRefineModal({ open: true, type: "note",  id: menu.noteId,  text: menuNote?.text  ?? "" })}
          onRefineShape={() => setRefineModal({ open: true, type: "shape", id: menu.shapeId, text: menuShape?.text ?? "" })}
          onTextColor={(colorId) =>
            menu.mode === "note"
              ? noteUpdateH(menu.noteId,   { textColor: colorId })
              : shapeUpdateH(menu.shapeId, { textColor: colorId })
          }
          onFontFamily={(fontId) =>
            menu.mode === "note"
              ? noteUpdateH(menu.noteId,   { fontFamily: fontId })
              : shapeUpdateH(menu.shapeId, { fontFamily: fontId })
          }
          currentTextColor={currentTextColor}
          currentFontFamily={currentFontFamily}
          onFontSize={(sz) =>
            menu.mode === "note"
              ? noteUpdateH(menu.noteId,   { fontSize: sz })
              : shapeUpdateH(menu.shapeId, { fontSize: sz })
          }
          currentFontSize={menu.mode === "note" ? (menuNote?.fontSize ?? "md") : (menuShape?.fontSize ?? "md")}
          onTextAlign={(a) =>
            menu.mode === "note"
              ? noteUpdateH(menu.noteId,   { textAlign: a })
              : shapeUpdateH(menu.shapeId, { textAlign: a })
          }
          currentTextAlign={menu.mode === "note" ? (menuNote?.textAlign ?? "left") : (menuShape?.textAlign ?? "center")}
          onVerticalAlign={(a) =>
            menu.mode === "note"
              ? noteUpdateH(menu.noteId,   { verticalAlign: a })
              : shapeUpdateH(menu.shapeId, { verticalAlign: a })
          }
          currentVerticalAlign={menu.mode === "note" ? (menuNote?.verticalAlign ?? "top") : (menuShape?.verticalAlign ?? "center")}
          onStrokeWidth={(sw) => shapeUpdateH(menu.shapeId, { strokeWidth: sw })}
          currentStrokeWidth={menuShape?.strokeWidth ?? 2}
          onLineType={(lt) => shapeUpdateH(menu.shapeId, { lineType: lt })}
          currentLineType={menuShape?.lineType  ?? "straight"}
          onLineStyle={(ls) => shapeUpdateH(menu.shapeId, { lineStyle: ls })}
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
        onUndo={applyUndo}
        onRedo={applyRedo}
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
