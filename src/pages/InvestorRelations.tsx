import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, MapPin, Calendar, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import investorImg from '../assets/new_landing.png';
import './InvestorRelations.css';

const METRICS = [
  { icon: TrendingUp, value: '150%', titleKey: 'investors.metric1Title', descKey: 'investors.metric1Desc' },
  { icon: Users, value: '5M+', titleKey: 'investors.metric2Title', descKey: 'investors.metric2Desc' },
  { icon: MapPin, value: '200+', titleKey: 'investors.metric3Title', descKey: 'investors.metric3Desc' },
  { icon: Calendar, value: '4.8', titleKey: 'investors.metric4Title', descKey: 'investors.metric4Desc' },
];

const TIMELINE = [
  { year: '2021', titleKey: 'investors.milestone1Title', descKey: 'investors.milestone1Desc' },
  { year: '2023', titleKey: 'investors.milestone2Title', descKey: 'investors.milestone2Desc' },
  { year: '2025', titleKey: 'investors.milestone3Title', descKey: 'investors.milestone3Desc' },
  { year: '2026', titleKey: 'investors.milestone4Title', descKey: 'investors.milestone4Desc' },
];

const InvestorRelations: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="ir-page-wrapper">
      <Navbar theme="blue" />
      <div className="ir-header-section">
        <div className="ir-header-container">
          <h1>{t('investors.pageTitle')}</h1>
          <p>{t('investors.pageSubtitle')}</p>
        </div>
      </div>
      <main className="ir-main">
        <section className="ir-story-section">
          <div className="ir-story-content">
            <h2>{t('investors.storyTitle')}</h2>
            <p>{t('investors.storyPara1')}</p>
            <p>{t('investors.storyPara2')}</p>
          </div>
          <img src={investorImg} alt="Niklo investors" className="ir-story-image" />
        </section>

        <section className="ir-metrics-section">
          <h2 className="ir-section-title">{t('investors.metricsTitle')}</h2>
          <p className="ir-section-subtitle">{t('investors.metricsSubtitle')}</p>
          <div className="ir-metrics-grid">
            {METRICS.map((metric, idx) => {
              const Icon = metric.icon;
              return (
                <div key={idx} className="ir-metric-card">
                  <div className="ir-metric-icon"><Icon size={24} /></div>
                  <h3 className="ir-metric-value">{metric.value}</h3>
                  <p className="ir-metric-title">{t(metric.titleKey)}</p>
                  <p className="ir-metric-desc">{t(metric.descKey)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="ir-timeline-section">
          <h2 className="ir-section-title">{t('investors.timelineTitle')}</h2>
          <p className="ir-section-subtitle">{t('investors.timelineSubtitle')}</p>
          <div className="ir-timeline">
            {TIMELINE.map((item, idx) => (
              <div key={idx} className="ir-timeline-item">
                <div className="ir-timeline-dot"></div>
                <div className="ir-timeline-content">
                  <span className="ir-timeline-year">{item.year}</span>
                  <h3>{t(item.titleKey)}</h3>
                  <p>{t(item.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ir-cta-section">
          <h2>{t('investors.ctaTitle')}</h2>
          <p>{t('investors.ctaDesc')}</p>
          <button className="ir-cta-btn" onClick={() => navigate('/')}>
            {t('investors.ctaButton')} <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default InvestorRelations;
