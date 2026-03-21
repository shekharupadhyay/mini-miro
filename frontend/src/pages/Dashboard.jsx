import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, clearToken, authHeaders } from "../utils/auth";
import "./Dashboard.css";

const API = import.meta.env.VITE_API_BASE;

// ── Color maps ─────────────────────────────────────────────────────
const NOTE_FILL = {
  yellow: "#fef08a", orange: "#fed7aa", red: "#fecaca",
  blue: "#bfdbfe",  green:  "#bbf7d0", pink: "#fbcfe8",
  purple: "#e9d5ff", gray: "#e5e7eb",
};

const SHAPE_HEX = {
  black: "#1a1a1a", red: "#ef4444", orange: "#fb923c", yellow: "#eab308",
  green:  "#22c55e", blue: "#3b82f6", purple: "#a855f7", pink: "#ec4899",
};

function getFill(hex, fillMode) {
  if (fillMode === "solid") return hex + "cc";
  if (fillMode === "semi")  return hex + "44";
  return "none";
}

// ── Mini SVG shape ─────────────────────────────────────────────────
function MiniShape({ s }) {
  const w   = s.w ?? 120, h = s.h ?? 120;
  const cx  = s.x + w / 2, cy = s.y + h / 2;
  const hex = SHAPE_HEX[s.color ?? "black"] ?? "#1a1a1a";
  const fill = getFill(hex, s.fillMode ?? "none");
  const t = s.rotation ? `rotate(${s.rotation} ${cx} ${cy})` : undefined;

  if (s.shape === "circle") {
    return <ellipse cx={cx} cy={cy} rx={w/2-1} ry={h/2-1} fill={fill} stroke={hex} strokeWidth="2" transform={t} />;
  }
  if (s.shape === "triangle") {
    return <polygon points={`${cx},${s.y+2} ${s.x+w-2},${s.y+h-2} ${s.x+2},${s.y+h-2}`}
                    fill={fill} stroke={hex} strokeWidth="2" strokeLinejoin="round" transform={t} />;
  }
  if (s.shape === "line") {
    return <line x1={s.x+2} y1={s.y+2} x2={s.x+w-2} y2={s.y+2}
                 stroke={hex} strokeWidth="2.5" strokeLinecap="round" transform={t} />;
  }
  return <rect x={s.x+1} y={s.y+1} width={w-2} height={h-2} rx="6"
               fill={fill} stroke={hex} strokeWidth="2" transform={t} />;
}

// ── Mini canvas renderer ───────────────────────────────────────────
function MiniCanvas({ notes, shapes }) {
  // Collect bounding boxes
  const rects = [
    ...notes.map(n => ({ x: n.x, y: n.y, r: n.x + (n.w ?? 180), b: n.y + (n.h ?? 110) })),
    ...shapes.map(s => ({ x: s.x, y: s.y, r: s.x + (s.w ?? 120), b: s.y + (s.shape === "line" ? 4 : (s.h ?? 120)) })),
  ];

  const pad  = 24;
  const minX = Math.min(...rects.map(r => r.x)) - pad;
  const minY = Math.min(...rects.map(r => r.y)) - pad;
  const maxX = Math.max(...rects.map(r => r.r)) + pad;
  const maxY = Math.max(...rects.map(r => r.b)) + pad;

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      {notes.map(n => {
        const w = n.w ?? 180, h = n.h ?? 110;
        const cx = n.x + w / 2, cy = n.y + h / 2;
        const t = n.rotation ? `rotate(${n.rotation} ${cx} ${cy})` : undefined;
        return (
          <rect key={n._id} x={n.x} y={n.y} width={w} height={h}
                fill={NOTE_FILL[n.color] ?? "#fef08a"} opacity="0.92" transform={t} />
        );
      })}
      {shapes.map(s => <MiniShape key={s._id} s={s} />)}
    </svg>
  );
}

// ── Board preview card thumbnail ───────────────────────────────────
// Lazy-loads via IntersectionObserver so we only fetch visible boards.
function BoardPreview({ boardId }) {
  const [data, setData] = useState(null); // null = not fetched yet
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      Promise.all([
        fetch(`${API}/api/boards/${encodeURIComponent(boardId)}/notes`).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/boards/${encodeURIComponent(boardId)}/shapes`).then(r => r.json()).catch(() => []),
      ]).then(([notes, shapes]) => setData({ notes, shapes }));
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [boardId]);

  const empty = data && data.notes.length === 0 && data.shapes.length === 0;

  return (
    <div ref={ref} className="db-card-thumb">
      {data === null && <div className="db-thumb-shimmer" />}
      {empty && (
        <div className="db-thumb-empty">
          <svg width="36" height="36" viewBox="0 0 20 20" fill="none"
               stroke="rgba(1,0,41,0.12)" strokeWidth="1.4" strokeLinecap="round">
            <rect x="2" y="2" width="7" height="7" rx="1"/>
            <rect x="11" y="2" width="7" height="7" rx="1"/>
            <rect x="2" y="11" width="7" height="7" rx="1"/>
            <rect x="11" y="11" width="7" height="7" rx="1"/>
          </svg>
          <span>Empty board</span>
        </div>
      )}
      {data && !empty && <MiniCanvas notes={data.notes} shapes={data.shapes} />}
    </div>
  );
}

// ── Nav items ──────────────────────────────────────────────────────
const NAV = [
  { id: "recent", label: "Recent", icon: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="10" cy="10" r="7"/><path d="M10 6.5V10l2.5 2"/>
    </svg>
  )},
  { id: "starred", label: "Starred", icon: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l2.4 5H18l-4.5 3.3 1.7 5.5L10 13l-5.2 2.8 1.7-5.5L2 7h5.6z"/>
    </svg>
  )},
  { id: "shared", label: "Shared with me", icon: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="8" cy="7" r="3"/><path d="M2 17c0-3.3 2.7-6 6-6"/>
      <circle cx="15" cy="10" r="2.5"/><path d="M11 17c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
    </svg>
  )},
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [user,      setUser]      = useState(null);
  const [boards,    setBoards]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [activeNav, setActiveNav] = useState("recent");
  const [panel,     setPanel]     = useState(null); // 'create' | 'join'
  const [userMenu,  setUserMenu]  = useState(false);
  const userMenuRef = useRef(null);

  // Create state
  const [createName,  setCreateName]  = useState("");
  const [createError, setCreateError] = useState("");
  const [creating,    setCreating]    = useState(false);

  // Join state
  const [joinName,  setJoinName]  = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining,   setJoining]   = useState(false);

  /* ── Load ──────────────────────────────────────────────────────── */
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

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenu) return;
    function onDown(e) {
      if (!userMenuRef.current?.contains(e.target)) setUserMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenu]);

  /* ── Create ─────────────────────────────────────────────────────── */
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
      navigate(`/board/${room.name}`, { state: { username: user.name, isAdmin: true } });
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
      navigate(`/board/${randomId}`, { state: { username: user.name, isAdmin: true } });
    } catch { setCreateError("Something went wrong"); }
    finally   { setCreating(false); }
  }

  /* ── Join ───────────────────────────────────────────────────────── */
  async function handleJoin(e) {
    e.preventDefault();
    setJoinError("");
    if (!joinName.trim()) { setJoinError("Enter a board name"); return; }
    setJoining(true);
    try {
      const res = await fetch(`${API}/api/rooms/${encodeURIComponent(joinName.trim())}/exists`);
      const { exists } = await res.json();
      if (!exists) { setJoinError("Board not found — check the name"); return; }
      const roomRes = await fetch(`${API}/api/rooms/${encodeURIComponent(joinName.trim())}`);
      const room = await roomRes.json();
      const isAdmin = room.adminName === user.name;
      navigate(`/board/${joinName.trim()}`, { state: { username: user.name, isAdmin } });
    } catch { setJoinError("Something went wrong"); }
    finally   { setJoining(false); }
  }

  function handleLogout() { clearToken(); navigate("/login", { replace: true }); }

  function openPanel(id) {
    setPanel(p => p === id ? null : id);
    setCreateError(""); setCreateName("");
    setJoinError("");   setJoinName("");
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const filtered  = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  /* ── Loading ────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="db-loading">
      <div className="db-spinner" />
    </div>
  );

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="db-root">

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-brand">
          <div className="db-sidebar-logo-icon">
            <svg viewBox="0 0 14 14" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="white">
              <rect x="1" y="1" width="5" height="5"/><rect x="8" y="1" width="5" height="5"/>
              <rect x="1" y="8" width="5" height="5"/><rect x="8" y="8" width="5" height="5"/>
            </svg>
          </div>
          <span className="db-sidebar-brand-name">MiniMiro</span>
        </div>

        <nav className="db-sidebar-nav">
          {NAV.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`db-nav-item${activeNav === id ? " active" : ""}`}
              onClick={() => setActiveNav(id)}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────── */}
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

          {/* ── Create New ── */}
          <section className="db-section">
            <h2 className="db-section-title">Create New</h2>
            <div className="db-action-row">

              {/* New Board */}
              <div className={`db-action-card${panel === "create" ? " open" : ""}`}>
                <button className="db-action-card-btn" onClick={() => openPanel("create")}>
                  <div className="db-action-icon">
                    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M10 4v12M4 10h12"/>
                    </svg>
                  </div>
                  <div>
                    <div className="db-action-label">New Board</div>
                    <div className="db-action-sub">Start from scratch</div>
                  </div>
                </button>

                {panel === "create" && (
                  <div className="db-action-form">
                    <form onSubmit={handleCreate}>
                      <input
                        className="db-form-input"
                        value={createName}
                        onChange={e => { setCreateName(e.target.value); setCreateError(""); }}
                        placeholder="Board name"
                        autoFocus
                      />
                      {createError && <div className="db-form-error">{createError}</div>}
                      <div className="db-form-row">
                        <button className="db-form-btn primary" type="submit" disabled={creating}>
                          {creating ? "Creating…" : "Create"}
                        </button>
                        <button className="db-form-btn ghost" type="button" onClick={handleCreateRandom} disabled={creating}>
                          🎲 Random
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Join */}
              <div className={`db-action-card db-action-card-join${panel === "join" ? " open" : ""}`}>
                <button className="db-action-card-btn" onClick={() => openPanel("join")}>
                  <div className="db-action-icon">
                    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 10h12M11 5l5 5-5 5"/>
                    </svg>
                  </div>
                  <div>
                    <div className="db-action-label">Join</div>
                    <div className="db-action-sub">Enter a board name</div>
                  </div>
                </button>

                {panel === "join" && (
                  <div className="db-action-form">
                    <form onSubmit={handleJoin}>
                      <input
                        className="db-form-input"
                        value={joinName}
                        onChange={e => { setJoinName(e.target.value); setJoinError(""); }}
                        placeholder="Board name"
                        autoFocus
                      />
                      {joinError && <div className="db-form-error">{joinError}</div>}
                      <button className="db-form-btn primary" type="submit" disabled={joining}>
                        {joining ? "Checking…" : "Join Board"}
                      </button>
                    </form>
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* ── My Boards ── */}
          <section className="db-section">
            <h2 className="db-section-title">My Boards</h2>

            {filtered.length === 0 ? (
              <div className="db-empty">
                {boards.length === 0
                  ? <><div className="db-empty-icon">🗂️</div><p>No boards yet — create your first one above!</p></>
                  : <><div className="db-empty-icon">🔍</div><p>No boards match "{search}"</p></>
                }
              </div>
            ) : (
              <div className="db-boards-grid">
                {filtered.map((board) => (
                  <button
                    key={board._id}
                    className="db-board-card"
                    onClick={() => navigate(`/board/${board.name}`, { state: { username: user.name, isAdmin: true } })}
                  >
                    <BoardPreview boardId={board.name} />
                    <div className="db-card-info">
                      <div className="db-card-row">
                        <span className="db-card-name">{board.name}</span>
                        <span className="db-card-date">
                          {new Date(board.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="db-card-meta">Created by <strong>{board.adminName}</strong></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
