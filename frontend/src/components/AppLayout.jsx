import { Outlet, useNavigate } from 'react-router-dom'
import { Bell, BookOpen, CalendarDays, GraduationCap, LayoutDashboard, LogOut, Menu, Settings2, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const roleLinks = {
  ADMIN: [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Students', icon: GraduationCap }, { label: 'Professors', icon: Users }, { label: 'Courses', icon: BookOpen }, { label: 'Departments', icon: Settings2 }, { label: 'Enrollments', icon: CalendarDays }, { label: 'Notices', icon: Bell }],
  PROFESSOR: [{ label: 'Overview', icon: LayoutDashboard }, { label: 'My courses', icon: BookOpen }, { label: 'Attendance & grades', icon: Users }],
  STUDENT: [{ label: 'Overview', icon: LayoutDashboard }, { label: 'My courses', icon: BookOpen }, { label: 'Academic record', icon: GraduationCap }, { label: 'Schedule & notices', icon: CalendarDays }],
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('Overview')
  const navigate = useNavigate()
  const role = user?.role || 'STUDENT'
  const base = `/${role.toLowerCase()}`
  const initials = `${user?.first_name?.[0] || user?.username?.[0] || 'U'}${user?.last_name?.[0] || ''}`.toUpperCase()

  function signOut() { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><GraduationCap size={20} /></div><div><b>northstar</b><span>COLLEGE ERP</span></div><button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {roleLinks[role].map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => { setActiveSection(label); setMenuOpen(false) }} className={`nav-link ${activeSection === label ? 'active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{activeSection === label && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-orb">✦</span><div><b>Campus support</b><small>Here when you need us</small></div></div><div className="side-foot">NORTHSTAR UNIVERSITY <span>v1.0</span></div></div>
      </aside>
      {menuOpen && <button className="mobile-overlay" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{role.charAt(0) + role.slice(1).toLowerCase()} portal</b></div>
          <div className="top-actions"><span className="term-pill"><span className="live-dot" /> FALL SEMESTER · 2026</span><button className="icon-button notice-button" onClick={() => setActiveSection(role === 'ADMIN' ? 'Notices' : role === 'STUDENT' ? 'Schedule & notices' : 'Overview')} aria-label="View campus notices" title="View campus notices"><Bell size={18} /><i /></button><div className="top-divider" /><div className="user-chip"><div className="avatar">{initials}</div><div className="user-chip-copy"><b>{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</b><small>{role.toLowerCase()}</small></div></div><button className="icon-button logout-button" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button></div>
        </header>
        <div className="page-content"><Outlet context={{ activeSection, setActiveSection }} /></div>
        <footer className="footer"><span>© 2026 Northstar University</span><span>Built for a brighter campus <span className="footer-spark">✦</span></span></footer>
      </main>
    </div>
  )
}
