import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Droplets, Recycle, Sun, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import sustainImg from '../assets/escape_the_weekend.png';
import './Sustainability.css';

const INITIATIVES = [
  { icon: Leaf, titleKey: 'sustainability.init1Title', descKey: 'sustainability.init1Desc' },
  { icon: Droplets, titleKey: 'sustainability.init2Title', descKey: 'sustainability.init2Desc' },
  { icon: Recycle, titleKey: 'sustainability.init3Title', descKey: 'sustainability.init3Desc' },
  { icon: Sun, titleKey: 'sustainability.init4Title', descKey: 'sustainability.init4Desc' },
];

const IMPACT_STATS = [
  { value: '50,000+', labelKey: 'sustainability.stat1Label' },
  { value: '120 tons', labelKey: 'sustainability.stat2Label' },
  { value: '2M liters', labelKey: 'sustainability.stat3Label' },
];

const Sustainability: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="su-page-wrapper">
      <Navbar theme="blue" />
      <div className="su-header-section">
        <div className="su-header-container">
          <h1>{t('sustainability.pageTitle')}</h1>
          <p>{t('sustainability.pageSubtitle')}</p>
        </div>
      </div>
      <main className="su-main">
        <section className="su-story-section">
          <div className="su-story-content">
            <h2>{t('sustainability.storyTitle')}</h2>
            <p>{t('sustainability.storyPara1')}</p>
            <p>{t('sustainability.storyPara2')}</p>
          </div>
          <img src={sustainImg} alt="Sustainability" className="su-story-image" />
        </section>

        <section className="su-initiatives-section">
          <h2 className="su-section-title">{t('sustainability.initiativesTitle')}</h2>
          <p className="su-section-subtitle">{t('sustainability.initiativesSubtitle')}</p>
          <div className="su-initiatives-grid">
            {INITIATIVES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="su-initiative-card">
                  <div className="su-initiative-icon"><Icon size={24} /></div>
                  <h3>{t(item.titleKey)}</h3>
                  <p>{t(item.descKey)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="su-impact-section">
          <div className="su-impact-container">
            <h2>{t('sustainability.impactTitle')}</h2>
            <p>{t('sustainability.impactSubtitle')}</p>
            <div className="su-impact-grid">
              {IMPACT_STATS.map((stat, idx) => (
                <div key={idx} className="su-impact-card">
                  <h3>{stat.value}</h3>
                  <p>{t(stat.labelKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="su-cta-section">
          <h2>{t('sustainability.ctaTitle')}</h2>
          <p>{t('sustainability.ctaDesc')}</p>
          <button className="su-cta-btn" onClick={() => navigate('/')}>
            {t('sustainability.ctaButton')} <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Sustainability;
