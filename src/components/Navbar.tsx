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

const NAV_KEYS = [
  { key: 'nav.home', path: '/' },
  { key: 'nav.buses', path: '/buses' },
  { key: 'nav.hotels', path: '/hotels' },
  { key: 'nav.cabs', path: '/cabs' },
  { key: 'nav.packages', path: '/packages' },
  { key: 'nav.adventures', path: '/experiences' },
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
    if (!window.confirm(t('nav.confirmLogout'))) return;
    await logout();
    navigate('/');
    setMobileOpen(false);
  };

  const go = (path: string) => { navigate(path); setMobileOpen(false); };
  const displayName = user?.name?.split(' ')[0] || t('nav.account');

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
        {NAV_KEYS.map((link) => (
          <button
            key={link.path}
            className={`nav-main-link${location.pathname === link.path ? ' active' : ''}`}
            onClick={() => go(link.path)}
          >
            {t(link.key)}
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
                <button type="button" role="menuitem" onClick={() => { go('/profile'); setShowProfileMenu(false); }}>{t('nav.profile')}</button>
                <button type="button" role="menuitem" onClick={() => { go('/bookings'); setShowProfileMenu(false); }}>{t('nav.myBookings')}</button>
                <button type="button" role="menuitem" onClick={() => { go('/wishlist'); setShowProfileMenu(false); }}>{t('nav.wishlist')}</button>
                <button type="button" role="menuitem" onClick={() => { go('/wallet'); setShowProfileMenu(false); }}>{t('nav.wallet')}</button>
                <button type="button" role="menuitem" onClick={() => { go('/referral'); setShowProfileMenu(false); }}>{t('nav.referral')}</button>
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
                    <span><Globe size={14} /> {t('nav.language')}</span>
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
                <button type="button" role="menuitem" className="logout-btn" onClick={handleLogout}>{t('nav.logout')}</button>
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
          <button className="mobile-nav-item" onClick={() => go('/')}>{t('nav.home')}</button>
          <button className="mobile-nav-item" onClick={() => go('/buses')}>{t('nav.busBooking')}</button>
          <button className="mobile-nav-item" onClick={() => go('/cabs')}>{t('nav.cabRides')}</button>
          <button className="mobile-nav-item" onClick={() => go('/hotels')}>{t('nav.hotels')}</button>
          <button className="mobile-nav-item" onClick={() => go('/packages')}>{t('nav.packages')}</button>
          <button className="mobile-nav-item" onClick={() => go('/experiences')}>{t('nav.adventures')}</button>
          {isLoggedIn && (
            <>
              <button className="mobile-nav-item" onClick={() => go('/wishlist')}>
                <Heart size={16} /> {t('nav.wishlist')}
              </button>
              <button className="mobile-nav-item" onClick={() => go('/notifications')}>{t('nav.notifications')}</button>
              <button className="mobile-nav-item" onClick={() => go('/profile')}>{t('nav.profile')}</button>
              <button className="mobile-nav-item mobile-logout" onClick={handleLogout}>{t('nav.logout')}</button>
            </>
          )}
          {!isLoggedIn && (
            <button className="mobile-nav-item mobile-login" onClick={() => go('/welcome')}>{t('nav.loginSignUp')}</button>
          )}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
