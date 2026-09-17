import React, { useState } from 'react';
import { ShieldCheck, Lock, LogOut, Globe2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
// Dark Mode toggle hidden for now — re-enable by uncommenting this import and the JSX block below.
// import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useNavigate } from 'react-router-dom';
import './PrivacySecurity.css';

const PrivacySecurity: React.FC = () => {
  const { logout } = useAuth();
  // const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [shareLocation, setShareLocation] = useState(
    () => localStorage.getItem('niklo_share_location') !== 'false',
  );

  const handleShareLocationToggle = () => {
    const next = !shareLocation;
    setShareLocation(next);
    localStorage.setItem('niklo_share_location', String(next));
  };

  const handleLogoutEverywhere = async () => {
    if (!window.confirm(t('privacySecurity.logoutConfirm'))) return;
    await logout();
    navigate('/');
  };

  return (
    <div className="ps-page-wrapper">
      <Navbar theme="blue" />

      <div className="ps-header-section">
        <div className="ps-header-container">
          <ShieldCheck size={32} />
          <h1>{t('privacySecurity.pageTitle')}</h1>
        </div>
      </div>

      <main className="ps-main">
        <div className="ps-container">

          <section className="ps-section">
            <h2><Lock size={18} /> {t('privacySecurity.securitySettingsHeading')}</h2>

            {/* Dark Mode toggle hidden for now — re-enable by uncommenting.
            <div className="ps-option-row">
              <div>
                <strong><Moon size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{t('privacySecurity.darkModeTitle')}</strong>
                <p>{t('privacySecurity.darkModeDesc')}</p>
              </div>
              <div className={`toggle-switch ${theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme}>
                <div className="toggle-knob"></div>
              </div>
            </div>
            */}

            <div className="ps-option-row">
              <div>
                <strong>{t('privacySecurity.shareLocationTitle')}</strong>
                <p>{t('privacySecurity.shareLocationDesc')}</p>
              </div>
              <div className={`toggle-switch ${shareLocation ? 'active' : ''}`} onClick={handleShareLocationToggle}>
                <div className="toggle-knob"></div>
              </div>
            </div>

            <div className="ps-option-row">
              <div>
                <strong>{t('privacySecurity.accountVerificationTitle')}</strong>
                <p>{t('privacySecurity.accountVerificationDesc')}</p>
              </div>
              <span className="ps-verified-badge"><ShieldCheck size={14} /> {t('privacySecurity.verifiedBadge')}</span>
            </div>

            <button className="ps-logout-btn" onClick={handleLogoutEverywhere}>
              <LogOut size={16} /> {t('privacySecurity.logoutDeviceButton')}
            </button>
          </section>

          <section className="ps-section" id="privacy-policy">
            <h2><Globe2 size={18} /> {t('privacySecurity.privacyPolicyHeading')}</h2>
            <div className="ps-legal-text">
              <p><strong>What we collect.</strong> To book a bus, cab, hotel, package, or adventure, Niklo collects your name, phone number, email, date of birth, gender, and the booking details you enter (routes, dates, traveler names, payment status). Location is only collected during an active cab ride, and only if you enable it.</p>
              <p><strong>How we use it.</strong> Your data is used to create bookings, process payments and refunds, send booking confirmations and journey alerts, and provide customer support. We do not sell your personal data to third parties.</p>
              <p><strong>Who we share it with.</strong> Bus operators, hotels, and drivers you book through receive the minimum information needed to fulfil your booking (e.g. your name and the seat/room booked). Payment details are processed by our payment gateway partner and are never stored on Niklo's own servers.</p>
              <p><strong>Your choices.</strong> You can view, edit, or request deletion of your personal information from Account → Personal Information, and you can disable location sharing at any time from this page.</p>
              <p><strong>Data retention.</strong> Booking records are retained for as long as your account is active, and for the period required by tax and consumer-protection law after that.</p>
            </div>
          </section>

          <section className="ps-section" id="terms-of-service">
            <h2><Globe2 size={18} /> {t('privacySecurity.termsOfServiceHeading')}</h2>
            <div className="ps-legal-text">
              <p><strong>Using Niklo.</strong> You must be at least 18 years old, or booking under the supervision of an adult, to make a booking. You agree to provide accurate traveler details — incorrect names or ages can result in denied boarding or check-in by the operator.</p>
              <p><strong>Bookings & payments.</strong> A booking is confirmed once payment is successful and you receive a confirmation. Prices, availability, and cancellation/refund rules are set by the individual bus operator, hotel, or partner and are shown before you pay.</p>
              <p><strong>Cancellations & refunds.</strong> Cancellation windows and refund percentages vary by operator and are displayed at checkout and in My Bookings. Refunds are issued to your original payment method or Niklo Wallet within 3–5 business days of a confirmed cancellation.</p>
              <p><strong>Conduct.</strong> Abusive behaviour toward drivers, hotel staff, or Niklo support staff, or fraudulent payment activity, may result in account suspension.</p>
              <p><strong>Liability.</strong> Niklo connects you with independent transport and accommodation operators; we are not the operator of the bus, cab, hotel, or activity itself, and each operator's own safety and service standards apply alongside ours.</p>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacySecurity;
