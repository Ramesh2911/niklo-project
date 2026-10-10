import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Settings, Mountain, CalendarRange, BookOpen,
  Wallet, Bell, Building2, LogOut, Menu, X,
} from 'lucide-react';
import { adventurePartnerService } from '../../lib/adventurePartnerService';
import './Partner.css';

const NAV_ITEMS = [
  { to: '/partner', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/partner/setup', label: 'Setup & Verification', icon: Settings },
  { to: '/partner/activities', label: 'Activities', icon: Mountain },
  { to: '/partner/availability', label: 'Availability', icon: CalendarRange },
  { to: '/partner/bookings', label: 'Bookings', icon: BookOpen },
  { to: '/partner/earnings', label: 'Earnings', icon: Wallet },
  { to: '/partner/notifications', label: 'Notifications', icon: Bell },
  { to: '/partner/profile', label: 'Profile', icon: Building2 },
];

const PartnerLayout: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await adventurePartnerService.logout(); } catch { /* backend logout is best-effort */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="pt-shell">
      <button className="pt-menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
        <Menu size={20} />
      </button>
      {open && <div className="pt-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`pt-sidebar${open ? ' pt-sidebar-open' : ''}`}>
        <div className="pt-brand">
          <span className="pt-brand-mark">N</span>
          <div>
            <strong>Niklo Partner</strong>
            <small>Adventures</small>
          </div>
          <button className="pt-close-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="pt-nav">
          {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `pt-nav-item${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="pt-logout" onClick={handleLogout}>
          <LogOut size={17} />
          Log out
        </button>
      </aside>
      <main className="pt-main">
        <Outlet />
      </main>
    </div>
  );
};

export default PartnerLayout;
