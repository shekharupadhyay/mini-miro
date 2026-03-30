import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, clearToken, authHeaders } from "../utils/auth";
import BoardPreview    from "../components/BoardPreview";
import DashboardSidebar from "../components/DashboardSidebar";
import CreateBoardCard from "../components/CreateBoardCard";
import JoinBoardCard   from "../components/JoinBoardCard";
import "./Dashboard.css";

const API = import.meta.env.VITE_API_BASE;

export default function Dashboard() {
  const navigate = useNavigate();

  const [user,      setUser]      = useState(null);
  const [boards,    setBoards]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [activeNav, setActiveNav] = useState("recent");
  const [userMenu,  setUserMenu]  = useState(false);
  const [starred,   setStarred]   = useState(
    () => new Set(JSON.parse(localStorage.getItem("mm_starred") || "[]"))
  );
  const userMenuRef = useRef(null);

  // Create state
  const [createName,  setCreateName]  = useState("");
  const [createError, setCreateError] = useState("");
  const [creating,    setCreating]    = useState(false);

  // Join state
  const [joinName,  setJoinName]  = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining,   setJoining]   = useState(false);

  useEffect(() => {
    async function load() {
      const me = await getMe();
      if (!me) { navigate("/login", { replace: true }); return; }
      setUser(me);
      try {
        const res = await fetch(`${API}/api/rooms/my`, { headers: authHeaders() });
        if (res.ok) setBoards(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [navigate]);

  useEffect(() => {
    if (!userMenu) return;
    function onDown(e) {
      if (!userMenuRef.current?.contains(e.target)) setUserMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenu]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");
    if (!createName.trim()) { setCreateError("Enter a board name"); return; }
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: createName.trim(), adminName: user.name }),
      });
      if (res.status === 409) { setCreateError("Name already taken — choose another"); return; }
      if (!res.ok) { setCreateError("Something went wrong"); return; }
      const room = await res.json();
      navigate(`/board/${room._id}`, { state: { username: user.name, isAdmin: true, boardName: room.name, inviteCode: room.inviteCode } });
    } catch { setCreateError("Something went wrong"); }
    finally    { setCreating(false); }
  }

  async function handleCreateRandom() {
    setCreateError("");
    const randomId = crypto.randomUUID().slice(0, 8);
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: randomId, adminName: user.name }),
      });
      if (!res.ok) { setCreateError("Something went wrong"); return; }
      const room = await res.json();
      navigate(`/board/${room._id}`, { state: { username: user.name, isAdmin: true, boardName: room.name, inviteCode: room.inviteCode } });
    } catch { setCreateError("Something went wrong"); }
    finally   { setCreating(false); }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setJoinError("");
    if (!joinName.trim()) { setJoinError("Enter an invite code or paste a link"); return; }
    setJoining(true);
    try {
      // If the input contains a board URL, extract the ID and join directly
      const linkMatch = joinName.trim().match(/\/board\/([a-f0-9]{24})/i);
      if (linkMatch) {
        const boardId = linkMatch[1];
        const roomRes = await fetch(`${API}/api/rooms/${boardId}`);
        if (roomRes.status === 404) { setJoinError("Board not found — check the link"); return; }
        if (!roomRes.ok) { setJoinError("Something went wrong"); return; }
        const room = await roomRes.json();
        const isAdmin = room.adminName === user.name;
        await fetch(`${API}/api/rooms/${room._id}/join`, { method: "POST", headers: authHeaders() });
        navigate(`/board/${room._id}`, { state: { username: user.name, isAdmin, boardName: room.name, inviteCode: room.inviteCode } });
        return;
      }
      const codeRes = await fetch(`${API}/api/rooms/code/${encodeURIComponent(joinName.trim().toUpperCase())}`);
      if (codeRes.status === 404) { setJoinError("Invalid invite code — check and try again"); return; }
      if (!codeRes.ok) { setJoinError("Something went wrong"); return; }
      const room = await codeRes.json();
      const isAdmin = room.adminName === user.name;
      await fetch(`${API}/api/rooms/${room._id}/join`, { method: "POST", headers: authHeaders() });
      navigate(`/board/${room._id}`, { state: { username: user.name, isAdmin, boardName: room.name, inviteCode: room.inviteCode } });
    } catch { setJoinError("Something went wrong"); }
    finally   { setJoining(false); }
  }

  function handleLogout() { clearToken(); navigate("/login", { replace: true }); }

  function toggleStar(e, boardName) {
    e.stopPropagation();
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(boardName)) next.delete(boardName);
      else next.add(boardName);
      localStorage.setItem("mm_starred", JSON.stringify([...next]));
      return next;
    });
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const filtered  = boards
    .filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    .filter(b => activeNav !== "starred" || starred.has(b.name))
    .filter(b => activeNav !== "shared"  || b.adminName !== user.name);

  if (loading) return (
    <div className="db-loading">
      <div className="db-spinner" />
    </div>
  );

  return (
    <div className="db-root">

      <DashboardSidebar activeNav={activeNav} onNavChange={setActiveNav} />

      <div className="db-content">

        {/* Header */}
        <header className="db-header">
          <div className="db-search-wrap">
            <svg className="db-search-icon" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l3 3"/>
            </svg>
            <input
              className="db-search"
              placeholder="Search boards…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="db-user-area" ref={userMenuRef}>
            <button className="db-user-btn" onClick={() => setUserMenu(o => !o)}>
              {user?.avatar
                ? <img className="db-user-avatar" src={user.avatar} alt={user.name} referrerPolicy="no-referrer" />
                : <div className="db-user-avatar db-user-avatar-fallback">{firstName[0].toUpperCase()}</div>
              }
              <span className="db-user-name">{user?.name}</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 6l4 4 4-4"/>
              </svg>
            </button>

            {userMenu && (
              <div className="db-user-dropdown">
                <div className="db-user-dropdown-info">
                  <div className="db-user-dropdown-name">{user?.name}</div>
                  <div className="db-user-dropdown-email">{user?.email}</div>
                </div>
                <div className="db-user-dropdown-sep" />
                <button className="db-user-dropdown-item danger" onClick={handleLogout}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <path d="M13 3h4v14h-4M9 14l4-4-4-4M13 10H5"/>
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Body */}
        <main className="db-main">
          <h1 className="db-welcome">Welcome back, {firstName}!</h1>

          <section className="db-section">
            <h2 className="db-section-title">Create New</h2>
            <div className="db-action-row">
              <CreateBoardCard
                createName={createName}
                setCreateName={setCreateName}
                createError={createError}
                setCreateError={setCreateError}
                creating={creating}
                onCreate={handleCreate}
                onCreateRandom={handleCreateRandom}
              />
              <JoinBoardCard
                joinName={joinName}
                setJoinName={setJoinName}
                joinError={joinError}
                setJoinError={setJoinError}
                joining={joining}
                onJoin={handleJoin}
              />
            </div>
          </section>

          <section className="db-section">
            <h2 className="db-section-title">
              {activeNav === "starred" ? "Starred Boards" : activeNav === "shared" ? "Shared with Me" : "My Boards"}
            </h2>

            {filtered.length === 0 ? (
              <div className="db-empty">
                {boards.length === 0
                  ? <><div className="db-empty-icon">🗂️</div><p>No boards yet — create your first one above!</p></>
                  : activeNav === "starred"
                    ? <><div className="db-empty-icon">⭐</div><p>No starred boards yet — click the star on any board to save it here.</p></>
                    : activeNav === "shared"
                      ? <><div className="db-empty-icon">👥</div><p>No shared boards yet — join a board created by someone else to see it here.</p></>
                      : <><div className="db-empty-icon">🔍</div><p>No boards match "{search}"</p></>
                }
              </div>
            ) : (
              <div className="db-boards-grid">
                {filtered.map((board) => (
                  <div
                    key={board._id}
                    className="db-board-card"
                    onClick={() => navigate(`/board/${board._id}`, { state: { username: user.name, isAdmin: board.adminName === user.name, boardName: board.name, inviteCode: board.inviteCode } })}
                  >
                    <BoardPreview boardId={board._id} />
                    <div className="db-card-info">
                      <div className="db-card-row">
                        <span className="db-card-name">{board.name}</span>
                        <button
                          className={`db-star-btn${starred.has(board.name) ? " active" : ""}`}
                          onClick={e => toggleStar(e, board.name)}
                          title={starred.has(board.name) ? "Unstar board" : "Star board"}
                        >
                          <svg width="14" height="14" viewBox="0 0 20 20" fill={starred.has(board.name) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 2l2.4 5H18l-4.5 3.3 1.7 5.5L10 13l-5.2 2.8 1.7-5.5L2 7h5.6z"/>
                          </svg>
                        </button>
                      </div>
                      <span className="db-card-date">
                        {new Date(board.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <div className="db-card-meta">Created by <strong>{board.adminName}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
