export default function Nav({ onToggleSidebar, onToggleSettings, onRefresh }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <button className="nav-hamburger" onClick={onToggleSidebar}>☰</button>
        <div className="nav-logo">
          <svg viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            <path d="M8 13h8v1H8zm0 3h5v1H8z"/>
          </svg>
        </div>
        <div className="nav-name">Invoice<span>Manager</span></div>
      </div>
      <div className="nav-right">
        <button className="btn btn-ghost btn-sm" onClick={onToggleSettings}>⚙ Settings</button>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh}>↻ Refresh</button>
      </div>
    </nav>
  )
}
