import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Join.css";

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
     <div className="join-page">
      <div className="join-card">
        <div className="join-title">Mini Miro</div>

        <form onSubmit={handleJoin}>
          <input
            className="join-input"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            placeholder="Enter board id"
          />

          <button className="join-btn">
            Join Board
          </button>
        </form>

        <button
          onClick={handleCreateRandom}
          className="create-btn"
        >
          + Create New Board
        </button>
      </div>
    </div>
  );
}