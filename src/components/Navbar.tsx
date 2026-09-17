import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Globe, User, ChevronDown, Menu, X, Bell, Heart } from 'lucide-react';
import nikloLogoBlue from '../assets/niklo-logo-blue.svg';
import nikloLogoWhite from '../assets/NewIcons/white-logo.svg';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { type Lang } from '../i18n';
import './Navbar.css';

interface NavbarProps {
  theme?: 'blue' | 'white';
}

const LANGUAGES: Lang[] = ['English', 'Hindi', 'Bengali', 'Gujarati'];

const MAIN_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Buses', path: '/buses' },
  { label: 'Hotels', path: '/hotels' },
  { label: 'Cabs', path: '/cabs' },
  { label: 'Packages', path: '/packages' },
  { label: 'Adventures', path: '/experiences' },
];

const Navbar: React.FC<NavbarProps> = ({ theme = 'white' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLangSubmenu, setShowLangSubmenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, t } = useI18n();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out?')) return;
    await logout();
    navigate('/');
    setMobileOpen(false);
  };

  const go = (path: string) => { navigate(path); setMobileOpen(false); };
  const displayName = user?.name?.split(' ')[0] || 'Account';

  return (
    <header className={`niklo-navbar theme-${theme}`} role="banner">
      <div className="navbar-left">
        <img
          src={theme === 'blue' ? nikloLogoWhite : nikloLogoBlue}
          alt="Niklo – Go to home"
          className="navbar-logo"
          onClick={() => go('/')}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && go('/')}
          role="link"
        />
      </div>

      {/* Primary section links */}
      <nav className="nav-main-links" aria-label="Primary navigation">
        {MAIN_LINKS.map((link) => (
          <button
            key={link.path}
            className={`nav-main-link${location.pathname === link.path ? ' active' : ''}`}
            onClick={() => go(link.path)}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Desktop nav */}
      <div className="navbar-right">
        {isLoggedIn && (
          <button className="nav-item" aria-label="Notifications" onClick={() => go('/notifications')}>
            <Bell size={18} />
          </button>
        )}

        {isLoggedIn ? (
          <div className="profile-dropdown-container" ref={profileRef}>
            <button
              className="profile-dropdown-btn"
              aria-label="Account menu"
              aria-expanded={showProfileMenu}
              onClick={() => setShowProfileMenu((v) => !v)}
            >
              <User size={16} />
              <span>{displayName}</span>
              <ChevronDown size={12} />
            </button>
            {showProfileMenu && (
              <div className="profile-dropdown-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { go('/profile'); setShowProfileMenu(false); }}>Profile</button>
                <button type="button" role="menuitem" onClick={() => { go('/bookings'); setShowProfileMenu(false); }}>My Bookings</button>
                <button type="button" role="menuitem" onClick={() => { go('/wishlist'); setShowProfileMenu(false); }}>Wishlist</button>
                <button type="button" role="menuitem" onClick={() => { go('/wallet'); setShowProfileMenu(false); }}>Wallet</button>
                <button type="button" role="menuitem" onClick={() => { go('/referral'); setShowProfileMenu(false); }}>Referral</button>
                <hr className="dropdown-hr" />
                <div className="dropdown-submenu-container">
                  <button
                    type="button"
                    role="menuitem"
                    aria-haspopup="true"
                    aria-expanded={showLangSubmenu}
                    className="dropdown-submenu-trigger"
                    onClick={() => setShowLangSubmenu((v) => !v)}
                  >
                    <span><Globe size={14} /> Language</span>
                    <ChevronDown size={12} className={showLangSubmenu ? 'rotated' : ''} />
                  </button>
                  {showLangSubmenu && (
                    <div className="dropdown-submenu" role="menu">
                      {LANGUAGES.map((l) => (
                        <button
                          key={l}
                          type="button"
                          role="menuitem"
                          className={l === lang ? 'active-lang' : ''}
                          onClick={() => { setLang(l); setShowLangSubmenu(false); setShowProfileMenu(false); }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <hr className="dropdown-hr" />
                <button type="button" role="menuitem" className="logout-btn" onClick={handleLogout}>Log Out</button>
              </div>
            )}
          </div>
        ) : (
          <button className="profile-dropdown-btn" onClick={() => go('/welcome')}>
            <User size={16} />
            <span>{t('nav.login')}</span>
          </button>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        className={`navbar-hamburger${mobileOpen ? ' is-open' : ''}`}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((o) => !o)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="mobile-drawer" aria-label="Mobile navigation">
          <button className="mobile-nav-item" onClick={() => go('/')}>Home</button>
          <button className="mobile-nav-item" onClick={() => go('/buses')}>Bus Booking</button>
          <button className="mobile-nav-item" onClick={() => go('/cabs')}>Cab Rides</button>
          <button className="mobile-nav-item" onClick={() => go('/hotels')}>Hotels</button>
          <button className="mobile-nav-item" onClick={() => go('/packages')}>Packages</button>
          <button className="mobile-nav-item" onClick={() => go('/experiences')}>Experiences</button>
          {isLoggedIn && (
            <>
              <button className="mobile-nav-item" onClick={() => go('/wishlist')}>
                <Heart size={16} /> Wishlist
              </button>
              <button className="mobile-nav-item" onClick={() => go('/notifications')}>Notifications</button>
              <button className="mobile-nav-item" onClick={() => go('/profile')}>Profile</button>
              <button className="mobile-nav-item mobile-logout" onClick={handleLogout}>Log Out</button>
            </>
          )}
          {!isLoggedIn && (
            <button className="mobile-nav-item mobile-login" onClick={() => go('/welcome')}>Login / Sign Up</button>
          )}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
