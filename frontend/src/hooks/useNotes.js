import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNotes, createNote, updateNote, deleteNote } from "../api/notesApi";

/**
 * Owns all notes state and CRUD operations.
 * socketRef is passed in so this hook can emit events without owning the socket.
 */
export function useNotes(boardId, socketRef) {
  const [notes, setNotes] = useState([]);
  const updateTimerRef = useRef({});

  useEffect(() => {
    fetchNotes(boardId).then(setNotes);
  }, [boardId]);

  const handleNoteUpdate = useCallback(
    (id, patch) => {
      setNotes((prev) =>
        prev.map((n) => (n._id === id ? { ...n, ...patch } : n))
      );
      socketRef.current?.emit("note:updated", { _id: id, ...patch });

      clearTimeout(updateTimerRef.current[id]);
      updateTimerRef.current[id] = setTimeout(() => {
        updateNote(id, patch).catch(console.error);
      }, 300);
    },
    [socketRef]
  );

  function onPositionChange(id, x, y) {
    setNotes((prev) =>
      prev.map((n) => (n._id === id ? { ...n, x, y } : n))
    );
    socketRef.current?.emit("note:updated", { _id: id, x, y });
  }

  async function addNoteAt(worldX, worldY, color = "#fff9c4") {
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
    socketRef.current?.emit("note:created", newNote);
    return newNote._id; // caller can use this to start editing
  }

  async function handleDeleteNote(id) {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n._id !== id));
    socketRef.current?.emit("note:deleted", { _id: id });
  }

  async function handleSaveNoteText(noteId, text) {
    const updated = await updateNote(noteId, { text });
    setNotes((prev) =>
      prev.map((n) => (n._id === updated._id ? updated : n))
    );
    socketRef.current?.emit("note:updated", { _id: noteId, text });
  }

  return {
    notes,
    setNotes,
    addNoteAt,
    handleNoteUpdate,
    onPositionChange,
    handleDeleteNote,
    handleSaveNoteText,
  };
}