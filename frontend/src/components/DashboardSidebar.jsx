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

export default function DashboardSidebar({ activeNav, onNavChange }) {
  return (
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
            onClick={() => onNavChange(id)}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
