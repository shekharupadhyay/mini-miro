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

        {/* Logo mark */}
        <div className="join-logo">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
               strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="7" height="7" />
            <rect x="11" y="2" width="7" height="7" />
            <rect x="2" y="11" width="7" height="7" />
            <rect x="11" y="11" width="7" height="7" />
          </svg>
        </div>

        <div className="join-title">MiniMiro</div>
        <div className="join-subtitle">Join an existing board or create a new one</div>

        {/* Join form */}
        <form onSubmit={handleJoin}>
          <input
            className="join-input"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            placeholder="Enter board ID"
            autoFocus
          />
          <button className="join-btn" type="submit">
            Join Board
          </button>
        </form>

        <div className="join-divider"><span>or</span></div>

        <button onClick={handleCreateRandom} className="create-btn">
          + Create New Board
        </button>

      </div>
    </div>
  );
}