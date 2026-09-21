import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Download, ArrowRight, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import pressImg from '../assets/hotels_hero.jpg';
import './PressCenter.css';

const PRESS_RELEASES = [
  { titleKey: 'press.release1Title', descKey: 'press.release1Desc', date: 'Sep 12, 2026' },
  { titleKey: 'press.release2Title', descKey: 'press.release2Desc', date: 'Aug 30, 2026' },
  { titleKey: 'press.release3Title', descKey: 'press.release3Desc', date: 'Aug 15, 2026' },
  { titleKey: 'press.release4Title', descKey: 'press.release4Desc', date: 'Jul 28, 2026' },
];

const PressCenter: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="pc-page-wrapper">
      <Navbar theme="blue" />
      <div className="pc-header-section">
        <div className="pc-header-container">
          <h1>{t('press.pageTitle')}</h1>
          <p>{t('press.pageSubtitle')}</p>
        </div>
      </div>
      <main className="pc-main">
        <section className="pc-story-section">
          <div className="pc-story-content">
            <h2>{t('press.storyTitle')}</h2>
            <p>{t('press.storyPara1')}</p>
            <p>{t('press.storyPara2')}</p>
          </div>
          <img src={pressImg} alt="Niklo press" className="pc-story-image" />
        </section>

        <section className="pc-releases-section">
          <h2 className="pc-section-title">{t('press.releasesTitle')}</h2>
          <p className="pc-section-subtitle">{t('press.releasesSubtitle')}</p>
          <div className="pc-releases-list">
            {PRESS_RELEASES.map((release, idx) => (
              <div key={idx} className="pc-release-card">
                <div className="pc-release-date">{release.date}</div>
                <div className="pc-release-content">
                  <h3>{t(release.titleKey)}</h3>
                  <p>{t(release.descKey)}</p>
                </div>
                <button className="pc-read-more">
                  {t('press.readMore')} <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="pc-mediakit-section">
          <div className="pc-mediakit-box">
            <div className="pc-mediakit-content">
              <Newspaper size={32} />
              <h3>{t('press.mediakitTitle')}</h3>
              <p>{t('press.mediakitDesc')}</p>
            </div>
            <button className="pc-mediakit-btn">
              <Download size={18} /> {t('press.mediakitButton')} <ExternalLink size={16} />
            </button>
          </div>
        </section>

        <section className="pc-cta-section">
          <h2>{t('press.ctaTitle')}</h2>
          <p>{t('press.ctaDesc')}</p>
          <button className="pc-cta-btn" onClick={() => navigate('/')}>
            {t('press.ctaButton')} <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PressCenter;
