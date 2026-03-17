import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, checkRoomExists, getRoom } from "../api/roomsApi";
import "./Join.css";

export default function Join() {
  const navigate = useNavigate();

  // Shared
  const [username, setUsername] = useState("");

  // Join section
  const [joinBoardName, setJoinBoardName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Create section
  const [createBoardName, setCreateBoardName] = useState("");
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);

  /* ── helpers ────────────────────────────────────────── */
  function validateName() {
    if (!username.trim()) {
      return "Please enter your name first";
    }
    else  
      if (!joinBoardName.trim()) { setJoinError("Enter a board name"); return; }
    return null;
  }

  /* ── Join existing room ────────────────────────────── */
  async function handleJoin(e) {
    e.preventDefault();
    setJoinError("");

    const nameErr = validateName();
    if (nameErr) { setJoinError(nameErr); return; }
   

    setJoinLoading(true);
    try {
      const exists = await checkRoomExists(joinBoardName.trim());
      if (!exists) {
        setJoinError("Room not found — check the name and try again");
        return;
      }
      const room = await getRoom(joinBoardName.trim());
      const isAdmin = room.adminName === username.trim();
      navigate(`/board/${joinBoardName.trim()}`, {
        state: { username: username.trim(), isAdmin },
      });
    } catch {
      setJoinError("Something went wrong — please try again");
    } finally {
      setJoinLoading(false);
    }
  }

  /* ── Create named room ─────────────────────────────── */
  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");

    const nameErr = validateName();
    if (nameErr) { setCreateError(nameErr); return; }
    if (!createBoardName.trim()) { setCreateError("Enter a board name"); return; }

    setCreateLoading(true);
    try {
      await createRoom(createBoardName.trim(), username.trim());
      navigate(`/board/${createBoardName.trim()}`, {
        state: { username: username.trim(), isAdmin: true },
      });
    } catch (err) {
      if (err.response?.status === 409) {
        setCreateError("That name is already taken — choose another");
      } else {
        setCreateError("Something went wrong — please try again");
      }
    } finally {
      setCreateLoading(false);
    }
  }

  /* ── Create random room ────────────────────────────── */
  async function handleCreateRandom() {
    setCreateError("");

    const nameErr = validateName();
    if (nameErr) { setCreateError(nameErr); return; }

    setRandomLoading(true);
    try {
      const randomId = crypto.randomUUID().slice(0, 8);
      await createRoom(randomId, username.trim());
      navigate(`/board/${randomId}`, {
        state: { username: username.trim(), isAdmin: true },
      });
    } catch {
      setCreateError("Something went wrong — please try again");
    } finally {
      setRandomLoading(false);
    }
  }

  /* ── Render ────────────────────────────────────────── */
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
        <div className="join-subtitle">Collaborate on a shared whiteboard</div>

        {/* ── Your Name ───────────────────────────────── */}
        <div className="join-section">
          <label className="join-label" htmlFor="username">Your Name</label>
          <input
            id="username"
            className="join-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your display name"
            autoFocus
          />
        </div>

        {/* ── Join Existing Board ─────────────────────── */}
        <div className="join-section-header">
          <span className="join-section-icon">🔗</span>
          Join Existing Board
        </div>

        <form onSubmit={handleJoin}>
          <input
            className="join-input"
            value={joinBoardName}
            onChange={(e) => { setJoinBoardName(e.target.value); setJoinError(""); }}
            placeholder="Enter board name"
          />
          {joinError && <div className="join-error">{joinError}</div>}
          <button className="join-btn" type="submit" disabled={joinLoading}>
            {joinLoading ? "Checking…" : "Join Board"}
          </button>
        </form>

        <div className="join-divider"><span>or</span></div>

        {/* ── Create New Board ────────────────────────── */}
        <div className="join-section-header">
          <span className="join-section-icon">✨</span>
          Create New Board
        </div>

        <form onSubmit={handleCreate}>
          <input
            className="join-input"
            value={createBoardName}
            onChange={(e) => { setCreateBoardName(e.target.value); setCreateError(""); }}
            placeholder="Choose a board name"
          />
          {createError && <div className="join-error">{createError}</div>}
          <button className="join-btn create-named-btn" type="submit" disabled={createLoading}>
            {createLoading ? "Creating…" : "Create Board"}
          </button>
        </form>

        <button
          onClick={handleCreateRandom}
          className="create-btn"
          disabled={randomLoading}
        >
          {randomLoading ? "Creating…" : "🎲  Create Random Board"}
        </button>

      </div>
    </div>
  );
}