import { useState, useEffect, useRef, useCallback } from 'react'
import RecurringReminderScheduler from './RecurringReminderScheduler'
import { STORAGE_KEY, SCHEDULES } from './RecurringReminderScheduler'

export default function Nav({ onToggleSidebar, onToggleSettings, onRefresh }) {
  const [showReminders, setShowReminders] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const dropdownRef = useRef(null)
  const bellRef = useRef(null)
  const moreRef = useRef(null)

  // ── Sync pending count from localStorage ──
  useEffect(() => {
    const read = () => {
      try {
        const statuses = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        setPendingCount(
          SCHEDULES.filter(s => (statuses[s.client] || 'yet-to') !== 'completed').length
        )
      } catch {
        setPendingCount(0)
      }
    }
    read()
    // 'storage' fires on cross-tab changes AND on same-tab via dispatchEvent in saveStatuses
    window.addEventListener('storage', read)
    return () => window.removeEventListener('storage', read)
  }, [])

  // ── Close reminder dropdown on outside click ──
  useEffect(() => {
    if (!showReminders) return
    const handler = e => {
      if (
        !dropdownRef.current?.contains(e.target) &&
        !bellRef.current?.contains(e.target)
      ) {
        setShowReminders(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showReminders])

  // ── Close ⋮ menu on outside click ──
  useEffect(() => {
    if (!showMore) return
    const handler = e => {
      if (!moreRef.current?.contains(e.target)) setShowMore(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMore])

  const toggleReminders = useCallback(() => {
    setShowReminders(v => !v)
    setShowMore(false)
  }, [])

  const toggleMore = useCallback(() => {
    setShowMore(v => !v)
    setShowReminders(false)
  }, [])

  return (
    <nav className="nav" role="banner">
      {/* ── Hamburger (desktop sidebar toggle) ── */}
      <button
        className="nav-hamburger"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      {/* ── Brand ── */}
      <div className="nav-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
          <path d="M8 13h8v1H8zm0 3h5v1H8z" />
        </svg>
      </div>
      <div className="nav-name">
        Invoice<span>Manager</span>
      </div>

      {/* ── Right actions ── */}
<div className="nav-right" style={{ marginLeft: 'auto' }}>

        {/* Bell — always visible on all breakpoints */}
        <div className="nav-bell-wrap" ref={dropdownRef}>
<button
  ref={bellRef}
  className={`nav-bell${showReminders ? ' active' : ''}`}
  onClick={toggleReminders}
  aria-label={`Reminders — ${pendingCount} pending`}
  aria-expanded={showReminders}
  aria-haspopup="true"
  style={{ width: 40, height: 40, fontSize: '1.25rem' }}
>
  <span style={{ fontSize: 20, color: 'white', lineHeight: 1 }}>&#x1F514;</span>
{pendingCount > 0 && (
  <span className="nav-bell-count" aria-hidden="true">
    {pendingCount}
  </span>
)}
</button>

          {showReminders && (
            <div
              className="nav-reminder-dropdown"
              role="dialog"
              aria-label="Recurring reminders"
            >
              <RecurringReminderScheduler compact />
            </div>
          )}
        </div>

        {/* Desktop: Settings + Refresh as text buttons */}
        <button
          className="btn btn-ghost btn-sm nav-desktop-only"
          onClick={onToggleSettings}
          aria-label="Settings"
        >
          ⚙ Settings
        </button>
        <button
          className="btn btn-ghost btn-sm nav-desktop-only"
          onClick={onRefresh}
          aria-label="Refresh data"
        >
          ↻ Refresh
        </button>

        {/* Mobile: collapse Settings + Refresh into ⋮ menu */}
        <div className="nav-more-wrap nav-mobile-only" ref={moreRef}>
          <button
            className={`nav-bell${showMore ? ' active' : ''}`}
            onClick={toggleMore}
            aria-label="More actions"
            aria-expanded={showMore}
            aria-haspopup="true"
          >
            ⋮
          </button>
          {showMore && (
            <div className="nav-more-menu" role="menu">
              <button
                role="menuitem"
                onClick={() => { onToggleSettings(); setShowMore(false) }}
              >
                ⚙ Settings
              </button>
              <button
                role="menuitem"
                onClick={() => { onRefresh(); setShowMore(false) }}
              >
                ↻ Refresh
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  )
}
