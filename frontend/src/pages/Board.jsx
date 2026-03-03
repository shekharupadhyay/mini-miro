import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchNotes, createNote } from "../api/notesApi";
import Note from "../components/Note";

export default function Board() {
  const { boardId } = useParams();
  const [notes, setNotes] = useState([]);

  async function load() {
    const data = await fetchNotes(boardId);
    setNotes(data);
  }

  useEffect(() => {
    load();
  }, [boardId]);

  async function handleAdd() {
    const newNote = await createNote(boardId, {
      text: "New note",
      x: 120,
      y: 120,
      color: "yellow",
    });
    setNotes((prev) => [...prev, newNote]);
  }

  function updateLocalPosition(id, x, y) {
    setNotes((prev) =>
      prev.map((n) => (n._id === id ? { ...n, x, y } : n))
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link to="/">← Back</Link>
        <h2 style={{ margin: 0 }}>Board: {boardId}</h2>
      </div>

      <button onClick={handleAdd} style={{ marginTop: 12 }}>
        + Add Note
      </button>

      <div
        style={{
          marginTop: 16,
          width: 1000,
          height: 600,
          border: "2px solid #222",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {notes.map((n) => (
          <Note
            key={n._id}
            note={n}
            onPositionChange={updateLocalPosition}
          />
        ))}
      </div>
    </div>
  );
}