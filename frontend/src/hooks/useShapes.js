import { useCallback, useEffect, useRef, useState } from "react";
import { fetchShapes, createShape, updateShape, deleteShape } from "../api/shapesApi";

/**
 * Owns all shapes state and CRUD operations.
 */
export function useShapes(boardId, socketRef) {
  const [shapes, setShapes] = useState([]);
  const updateTimerRef   = useRef({});
  const pendingPatchRef  = useRef({});

  useEffect(() => {
    fetchShapes(boardId).then(setShapes);
  }, [boardId]);

  const handleShapeUpdate = useCallback(
    (id, patch) => {
      setShapes((prev) =>
        prev.map((sh) => (sh._id === id ? { ...sh, ...patch } : sh))
      );
      socketRef.current?.emit("shape:updated", { _id: id, ...patch });

      pendingPatchRef.current[id] = { ...pendingPatchRef.current[id], ...patch };
      clearTimeout(updateTimerRef.current[id]);
      updateTimerRef.current[id] = setTimeout(() => {
        const accumulated = pendingPatchRef.current[id];
        delete pendingPatchRef.current[id];
        updateShape(id, accumulated).catch(console.error);
      }, 300);
    },
    [socketRef]
  );

  async function addShapeAt(worldX, worldY, { shape }) {
    const isLine = shape === "line";
    const saved = await createShape(boardId, {
      shape,
      x: Math.round(worldX),
      y: Math.round(worldY),
      w: isLine ? 160 : 120,
      h: isLine ? 4 : 120,
      text: "",
      color: "black",
      fillMode: "none",
    });
    setShapes((prev) => prev.some((s) => s._id === saved._id) ? prev : [...prev, saved]);
    socketRef.current?.emit("shape:created", saved);
    return saved._id;
  }

  async function addFlexLine(p1, p2) {
    const saved = await createShape(boardId, {
      shape: "line",
      x: 0, y: 0, w: 100, h: 4,
      points: [p1, p2],
      text: "", color: "black", fillMode: "none",
    });
    setShapes((prev) => prev.some((s) => s._id === saved._id) ? prev : [...prev, saved]);
    socketRef.current?.emit("shape:created", saved);
    return saved._id;
  }

  async function handleDeleteShape(id) {
    await deleteShape(id);
    setShapes((prev) => prev.filter((s) => s._id !== id));
    socketRef.current?.emit("shape:deleted", { _id: id });
  }

  return {
    shapes,
    setShapes,
    addShapeAt,
    addFlexLine,
    handleShapeUpdate,
    handleDeleteShape,
  };
}