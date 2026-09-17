import React from 'react';
import { Link } from 'react-router-dom';
import nikloLogo from '../assets/niklo-logo-white.svg';
import getStartedAssets from '../assets/wlc.png';
import { useI18n } from '../contexts/I18nContext';
import './GetStarted.css';

const GetStarted: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="get-started-container fade-in">
      {/* Top Left Logo */}
      <div className="logo-container">
        <img
          src={nikloLogo}
          alt={t('getStarted.logoAlt')}
          className="logo-img"
        />
      </div>

      {/* Main Content Area */}
      <div className="get-started-content">
        {/* Left Section */}
        <div className="get-started-left">
          <h1 className="get-started-title">
            {t('getStarted.title')}
          </h1>
          <p className="get-started-subtitle">
            {t('getStarted.subtitle')}
          </p>
        </div>

        {/* Right Section */}
        <div className="get-started-right">
          <div className="assets-illustration-container">
            <img
              src={getStartedAssets}
              alt={t('getStarted.busIllustrationAlt')}
              className="assets-illustration"
            />
          </div>

          <div className="get-started-buttons">
            <Link to="/signup" className="btn-create-account">
              {t('getStarted.createAccount')}
            </Link>
            <Link to="/login" className="btn-login">
              {t('getStarted.logIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
