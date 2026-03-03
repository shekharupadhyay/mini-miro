import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Join() {
  const [boardId, setBoardId] = useState("");
  const navigate = useNavigate();

  function handleJoin(e) {
    e.preventDefault();
    if (!boardId.trim()) return;
    navigate(`/board/${boardId.trim()}`);
  }

  function handleCreateRandom() {
    const id = crypto.randomUUID().slice(0, 8);
    navigate(`/board/${id}`);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Mini Miro</h2>
      <form onSubmit={handleJoin} style={{ marginTop: 16 }}>
        <input
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          placeholder="Enter board id (room)"
          style={{ padding: 10, width: 260 }}
        />
        <button style={{ marginLeft: 10, padding: "10px 14px" }}>
          Join
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        <button onClick={handleCreateRandom} style={{ padding: "10px 14px" }}>
          + Create New Board
        </button>
      </div>
    </div>
  );
}