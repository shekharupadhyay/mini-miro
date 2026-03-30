import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, checkRoomExists, getRoom } from "../api/roomsApi";
import "./Join.css";

const API = import.meta.env.VITE_API_BASE;

export default function Join() {
  const navigate = useNavigate();

  // Shared
  const [username, setUsername] = useState("");

  // On mount: check if Google redirected back with a token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const name  = params.get("name");
    if (token && name) {
      localStorage.setItem("auth_token", token);
      setUsername(name);
      // Clean the URL so refreshing doesn't re-process the params
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Join section
  const [joinBoardName, setJoinBoardName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Create section
  const [createBoardName, setCreateBoardName] = useState("");
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);

  function validateName(name,check) {
    if (!name.trim()) return `Please enter your ${check} first`;
    
    return null;
  }

  async function handleJoin(e) {
    e.preventDefault();
    setJoinError("");

    const nameErr = validateName(username, "first name") || validateName(joinBoardName, "board name");
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

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");

    const nameErr =  validateName(username, "first name") || validateName(createBoardName, "board name");
    if (nameErr) { setCreateError(nameErr); return; }

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

  async function handleCreateRandom() {
    setCreateError("");

    const nameErr = validateName(username, " first name");
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

        <button
          className="google-btn"
          onClick={() => { window.location.href = `${API}/auth/google`; }}
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="join-divider"><span>or</span></div>

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