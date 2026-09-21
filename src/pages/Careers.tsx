import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Rocket, Award, MapPin, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import careersImg from '../assets/hero_bg.jpg';
import './Careers.css';

const OPEN_POSITIONS = [
  { titleKey: 'careers.job1Title', descKey: 'careers.job1Desc', type: 'Engineering', location: 'Gurgaon' },
  { titleKey: 'careers.job2Title', descKey: 'careers.job2Desc', type: 'Product', location: 'Remote' },
  { titleKey: 'careers.job3Title', descKey: 'careers.job3Desc', type: 'Design', location: 'Gurgaon' },
  { titleKey: 'careers.job4Title', descKey: 'careers.job4Desc', type: 'Marketing', location: 'Mumbai' },
];

const CULTURE = [
  { icon: Heart, titleKey: 'careers.culture1Title', descKey: 'careers.culture1Desc' },
  { icon: Rocket, titleKey: 'careers.culture2Title', descKey: 'careers.culture2Desc' },
  { icon: Users, titleKey: 'careers.culture3Title', descKey: 'careers.culture3Desc' },
  { icon: Award, titleKey: 'careers.culture4Title', descKey: 'careers.culture4Desc' },
];

const Careers: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="cr-page-wrapper">
      <Navbar theme="blue" />
      <div className="cr-header-section">
        <div className="cr-header-container">
          <h1>{t('careers.pageTitle')}</h1>
          <p>{t('careers.pageSubtitle')}</p>
        </div>
      </div>
      <main className="cr-main">
        <section className="cr-story-section">
          <div className="cr-story-content">
            <h2>{t('careers.storyTitle')}</h2>
            <p>{t('careers.storyPara1')}</p>
            <p>{t('careers.storyPara2')}</p>
          </div>
          <img src={careersImg} alt="Niklo team" className="cr-story-image" />
        </section>

        <section className="cr-jobs-section">
          <h2 className="cr-section-title">{t('careers.jobsTitle')}</h2>
          <p className="cr-section-subtitle">{t('careers.jobsSubtitle')}</p>
          <div className="cr-jobs-grid">
            {OPEN_POSITIONS.map((job, idx) => (
              <div key={idx} className="cr-job-card">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="cr-job-tag">{job.type}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}><MapPin size={12} /> {job.location}</span>
                </div>
                <h3>{t(job.titleKey)}</h3>
                <p>{t(job.descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cr-culture-section">
          <h2 className="cr-section-title">{t('careers.cultureTitle')}</h2>
          <p className="cr-section-subtitle">{t('careers.cultureSubtitle')}</p>
          <div className="cr-culture-grid">
            {CULTURE.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="cr-culture-card">
                  <div className="cr-culture-icon"><Icon size={24} /></div>
                  <h3>{t(item.titleKey)}</h3>
                  <p>{t(item.descKey)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="cr-cta-section">
          <h2>{t('careers.ctaTitle')}</h2>
          <p>{t('careers.ctaDesc')}</p>
          <button className="cr-cta-btn" onClick={() => navigate('/')}>
            {t('careers.ctaButton')} <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Careers;
