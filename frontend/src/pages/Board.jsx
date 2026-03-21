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
  const [draggingEndpoint, setDraggingEndpoint] = useState(false);
  const [selBox,        setSelBox]        = useState(null); // { x1,y1,x2,y2 } screen coords
  const [multiSelected, setMultiSelected] = useState(null); // { noteIds, shapeIds }
  const [editingNoteId,  setEditingNoteId]  = useState(null);
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [selectedShapeId,setSelectedShapeId]= useState(null);
  const [chatOpen,       setChatOpen]       = useState(false);
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

  // Stable key handler — always reads latest state via closure updated each render
  const onKeyRef = useRef(null);
  onKeyRef.current = (e) => {
    if (e.key === "Escape") { setPlacingTool(null); setDrawingLine(null); setMultiSelected(null); setSelBox(null); }
    if ((e.key === "Delete" || e.key === "Backspace") &&
        !["INPUT","TEXTAREA"].includes(document.activeElement?.tagName) &&
        document.activeElement?.getAttribute("contenteditable") !== "true") {
      const group = multiSelectedRef.current;
      if (group && (group.noteIds.length + group.shapeIds.length > 0)) {
        group.noteIds.forEach((id) => handleDeleteNote(id));
        group.shapeIds.forEach((id) => handleDeleteShape(id));
        setMultiSelected(null);
      } else if (selectedShapeId) {
        handleDeleteShape(selectedShapeId); setSelectedShapeId(null);
      } else if (selectedNoteId) {
        handleDeleteNote(selectedNoteId); setSelectedNoteId(null);
      }
    }
  };
  useEffect(() => {
    function onKey(e) { onKeyRef.current?.(e); }
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
  const multiSelectedRef = useRef(null);
  multiSelectedRef.current = multiSelected;

  // ── Rotation-aware anchor position ────────────────────────────────
  function getAnchorPos(el, side) {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    let ax, ay;
    if (side === "top")    { ax = cx;       ay = el.y; }
    if (side === "bottom") { ax = cx;       ay = el.y + el.h; }
    if (side === "left")   { ax = el.x;     ay = cy; }
    if (side === "right")  { ax = el.x + el.w; ay = cy; }
    const rotation = el.rotation ?? 0;
    if (!rotation) return { x: ax, y: ay };
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const dx = ax - cx, dy = ay - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  // ── Sync lines that are connected to a moved/resized/rotated element ──
  function syncConnectedLines(elementId, updatedEl) {
    shapesRef.current
      .filter((s) => s.shape === "line" && s.points?.length >= 2 &&
                     s.points.some((p) => p.connId === elementId))
      .forEach((line) => {
        const newPoints = line.points.map((p) => {
          if (p.connId !== elementId) return p;
          const pos = getAnchorPos(updatedEl, p.connSide);
          return { ...p, x: Math.round(pos.x), y: Math.round(pos.y) };
        });
        handleShapeUpdate(line._id, { points: newPoints });
      });
  }

  function handleNoteUpdateWithSync(id, patch) {
    handleNoteUpdate(id, patch);
    const note = notesRef.current.find((n) => n._id === id);
    if (note) syncConnectedLines(id, { ...note, ...patch });
  }

  function handleShapeUpdateWithSync(id, patch) {
    handleShapeUpdate(id, patch);
    const shape = shapesRef.current.find((s) => s._id === id);
    if (shape && !(shape.shape === "line" && shape.points?.length >= 2)) {
      syncConnectedLines(id, { ...shape, ...patch });
    }
  }

  // ── Group drag — moves all multi-selected items together ──────────
  function handleGroupDragStart(e) {
    e.stopPropagation();
    const group = multiSelectedRef.current;
    if (!group) return;
    const scale = cameraRef.current.scale;
    const startX = e.clientX, startY = e.clientY;
    const origNotes  = group.noteIds.map((id) => { const n = notesRef.current.find((n) => n._id === id);  return { id, x: n?.x ?? 0, y: n?.y ?? 0 }; });
    const origShapes = group.shapeIds.map((id) => {
      const s = shapesRef.current.find((s) => s._id === id);
      const isLine = s?.shape === "line" && s?.points?.length >= 2;
      return { id, x: s?.x ?? 0, y: s?.y ?? 0, isLine, origPts: isLine ? s.points : null };
    });

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      origNotes.forEach(({ id, x, y }) => handleNoteUpdateWithSync(id, { x: x + dx, y: y + dy }));
      origShapes.forEach(({ id, x, y, isLine, origPts }) => {
        if (isLine) handleShapeUpdate(id, { points: origPts.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) });
        else handleShapeUpdateWithSync(id, { x: x + dx, y: y + dy });
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Always points to the latest snap-anchor finder (captures current notes/shapes)
  const findNearestAnchorRef = useRef(null);
  findNearestAnchorRef.current = (worldX, worldY, threshold) => {
    const SIDES = ["top", "bottom", "left", "right"];
    const candidates = [
      ...notes.flatMap((n) =>
        SIDES.map((side) => ({ ...getAnchorPos(n, side), connId: n._id, connType: "note", connSide: side }))
      ),
      ...shapes.filter((s) => !(s.shape === "line" && s.points?.length >= 2)).flatMap((s) =>
        SIDES.map((side) => ({ ...getAnchorPos(s, side), connId: s._id, connType: "shape", connSide: side }))
      ),
    ];
    let best = null, bestDist = threshold;
    for (const a of candidates) {
      const d = Math.hypot(a.x - worldX, a.y - worldY);
      if (d < bestDist) { best = a; bestDist = d; }
    }
    return best;
  };

  // ── Shared line-draw drag setup ────────────────────────────────────
  function beginLineDraw(p1, p1Screen) {
    const rect = viewportRef.current.getBoundingClientRect();
    setDrawingLine({ p1: p1Screen, p2: p1Screen });

    const onMove = (ev) => {
      const w = screenToWorldRef.current(ev.clientX, ev.clientY);
      const { scale, x: cx, y: cy } = cameraRef.current;
      const snapped = findNearestAnchorRef.current(w.x, w.y, 25 / scale);
      const p2Screen = snapped
        ? { x: snapped.x * scale + cx, y: snapped.y * scale + cy }
        : { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      setDrawingLine({ p1: p1Screen, p2: p2Screen });
    };
    const onUp = async (ev) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const w = screenToWorldRef.current(ev.clientX, ev.clientY);
      const { scale } = cameraRef.current;
      const snapped = findNearestAnchorRef.current(w.x, w.y, 25 / scale);
      const p2 = snapped
        ? { x: Math.round(snapped.x), y: Math.round(snapped.y), connId: snapped.connId, connType: snapped.connType, connSide: snapped.connSide }
        : { x: Math.round(w.x), y: Math.round(w.y) };
      setDrawingLine(null);
      setPlacingTool(null);
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
  }

  // Stable ref so endpoint drag callbacks always call the latest handleShapeUpdate
  const handleShapeUpdateRef = useRef(handleShapeUpdate);
  handleShapeUpdateRef.current = handleShapeUpdate;

  // Drag a flex-line endpoint with snap-to-anchor support
  function handleFlexEndpointDrag(shapeId, idx, e) {
    e.stopPropagation();
    e.preventDefault();
    setDraggingEndpoint(true);

    let lastSnapped = null; // track last anchor we snapped to during drag

    function makePoint(ev) {
      const pts = shapesRef.current.find((s) => s._id === shapeId)?.points ?? [];
      const w = screenToWorldRef.current(ev.clientX, ev.clientY);
      const { scale } = cameraRef.current;
      const snapped = findNearestAnchorRef.current(w.x, w.y, 30 / scale)
        ?? (lastSnapped && Math.hypot(w.x - lastSnapped.x, w.y - lastSnapped.y) < 50 / scale ? lastSnapped : null);
      const newPt = snapped
        ? { x: Math.round(snapped.x), y: Math.round(snapped.y), connId: snapped.connId, connType: snapped.connType, connSide: snapped.connSide }
        : { x: Math.round(w.x), y: Math.round(w.y) };
      return { pts, newPt, snapped };
    }

    function onMove(ev) {
      const { pts, newPt, snapped } = makePoint(ev);
      lastSnapped = snapped ?? null;
      handleShapeUpdateRef.current(shapeId, { points: pts.map((p, i) => (i === idx ? newPt : p)) });
    }
    function onUp(ev) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDraggingEndpoint(false);
      const { pts, newPt } = makePoint(ev);
      handleShapeUpdateRef.current(shapeId, { points: pts.map((p, i) => (i === idx ? newPt : p)) });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Called when user drags from an anchor dot on a shape/note
  function startLineFromAnchor(worldX, worldY, connId, connType, connSide) {
    const { scale, x: cx, y: cy } = camera;
    const p1 = { x: Math.round(worldX), y: Math.round(worldY), connId, connType, connSide };
    const p1Screen = { x: worldX * scale + cx, y: worldY * scale + cy };
    beginLineDraw(p1, p1Screen);
  }

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

    // Left click on empty canvas — selection box or deselect
    if (e.button === 0 && !placingTool) {
      closeMenu();
      const rect = viewportRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      let dragging = false;

      function onMove(ev) {
        const ex = ev.clientX - rect.left, ey = ev.clientY - rect.top;
        if (!dragging && (Math.abs(ex - sx) > 5 || Math.abs(ey - sy) > 5)) dragging = true;
        if (dragging) setSelBox({ x1: sx, y1: sy, x2: ex, y2: ey });
      }
      function onUp(ev) {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (dragging) {
          const ex = ev.clientX - rect.left, ey = ev.clientY - rect.top;
          const { scale, x: cx, y: cy } = cameraRef.current;
          const wx1 = (Math.min(sx, ex) - cx) / scale, wy1 = (Math.min(sy, ey) - cy) / scale;
          const wx2 = (Math.max(sx, ex) - cx) / scale, wy2 = (Math.max(sy, ey) - cy) / scale;
          const selNoteIds  = notesRef.current.filter((n) => n.x < wx2 && n.x + n.w > wx1 && n.y < wy2 && n.y + n.h > wy1).map((n) => n._id);
          const selShapeIds = shapesRef.current.filter((s) => {
            if (s.shape === "line" && s.points?.length >= 2) {
              const lx1 = Math.min(...s.points.map((p) => p.x)), lx2 = Math.max(...s.points.map((p) => p.x));
              const ly1 = Math.min(...s.points.map((p) => p.y)), ly2 = Math.max(...s.points.map((p) => p.y));
              return lx1 < wx2 && lx2 > wx1 && ly1 < wy2 && ly2 > wy1;
            }
            return s.x < wx2 && s.x + s.w > wx1 && s.y < wy2 && s.y + s.h > wy1;
          }).map((s) => s._id);
          setSelBox(null);
          if (selNoteIds.length + selShapeIds.length > 0) {
            setMultiSelected({ noteIds: selNoteIds, shapeIds: selShapeIds });
            setSelectedNoteId(null); setSelectedShapeId(null);
          } else {
            setMultiSelected(null); setSelectedNoteId(null); setSelectedShapeId(null);
          }
        } else {
          setMultiSelected(null); setSelectedNoteId(null); setSelectedShapeId(null);
        }
      }
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
            {notes.map((n) => {
              const inGroup = !!multiSelected?.noteIds.includes(n._id);
              return (
                <Note
                  key={n._id}
                  note={n}
                  isSelected={selectedNoteId === n._id || inGroup}
                  isGroupSelected={inGroup}
                  isEditing={editingNoteId === n._id}
                  onSelect={(id) => { if (inGroup) return; setMultiSelected(null); setSelectedNoteId(id); }}
                  onOpenMenu={openNoteMenu}
                  onUpdate={handleNoteUpdateWithSync}
                  onGroupDragStart={inGroup ? handleGroupDragStart : undefined}
                  onStartEdit={() => setEditingNoteId(n._id)}
                  onStopEdit={() => setEditingNoteId(null)}
                  onSaveEdit={async (noteId, text) => {
                    await handleSaveNoteText(noteId, text);
                    setEditingNoteId(null);
                  }}
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
                  onSelect={(id) => { if (inGroup) return; setMultiSelected(null); setSelectedShapeId(id); }}
                  onDeselect={() => setSelectedShapeId(null)}
                  onUpdate={handleShapeUpdateWithSync}
                  onGroupDragStart={inGroup ? handleGroupDragStart : undefined}
                  onOpenMenu={openShapeMenu}
                  onStopEdit={() => setEditingShapeId(null)}
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

          {/* ── Multi-select toolbar ── */}
          {multiSelected && (multiSelected.noteIds.length + multiSelected.shapeIds.length > 0) && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 60,
                        display: "flex", alignItems: "center", gap: 8,
                        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
                        padding: "5px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", pointerEvents: "all" }}>
              <span style={{ fontSize: 13, color: "#555" }}>
                {multiSelected.noteIds.length + multiSelected.shapeIds.length} selected
              </span>
              <button
                style={{ fontSize: 13, padding: "3px 10px", borderRadius: 6, border: "1px solid #fca5a5",
                         background: "#fee2e2", color: "#dc2626", cursor: "pointer" }}
                onClick={() => {
                  const group = multiSelectedRef.current;
                  if (!group) return;
                  group.noteIds.forEach((id) => handleDeleteNote(id));
                  group.shapeIds.forEach((id) => handleDeleteShape(id));
                  setMultiSelected(null);
                }}
              >
                🗑 Delete
              </button>
            </div>
          )}

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
          onDelete={async () => { await handleDeleteNote(menu.noteId); setSelectedNoteId(null); closeMenu(); }}
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
