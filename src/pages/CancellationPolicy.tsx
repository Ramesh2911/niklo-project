import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Hotel, Car, ChevronDown, Phone, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import cancelImg from '../assets/wallet.png';
import './CancellationPolicy.css';

const POLICY_ITEMS = [
  { icon: Bus, category: 'Bus', titleKey: 'cancellation.policy1Title', descKey: 'cancellation.policy1Desc' },
  { icon: Bus, category: 'Bus', titleKey: 'cancellation.policy2Title', descKey: 'cancellation.policy2Desc' },
  { icon: Hotel, category: 'Hotel', titleKey: 'cancellation.policy3Title', descKey: 'cancellation.policy3Desc' },
  { icon: Car, category: 'Cab', titleKey: 'cancellation.policy4Title', descKey: 'cancellation.policy4Desc' },
  { icon: Bus, category: 'Package', titleKey: 'cancellation.policy5Title', descKey: 'cancellation.policy5Desc' },
  { icon: Phone, category: 'General', titleKey: 'cancellation.policy6Title', descKey: 'cancellation.policy6Desc' },
];

const CancellationPolicy: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggleAccordion = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="cp-page-wrapper">
      <Navbar theme="blue" />
      <div className="cp-header-section">
        <div className="cp-header-container">
          <h1>{t('cancellation.pageTitle')}</h1>
          <p>{t('cancellation.pageSubtitle')}</p>
        </div>
      </div>
      <main className="cp-main">
        <section className="cp-story-section">
          <div className="cp-story-content">
            <h2>{t('cancellation.storyTitle')}</h2>
            <p>{t('cancellation.storyPara1')}</p>
            <p>{t('cancellation.storyPara2')}</p>
          </div>
          <img src={cancelImg} alt="Cancellation policy" className="cp-story-image" />
        </section>

        <section className="cp-policy-section">
          <h2 className="cp-section-title">{t('cancellation.policyTitle')}</h2>
          <p className="cp-section-subtitle">{t('cancellation.policySubtitle')}</p>
          <div className="cp-accordion">
            {POLICY_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              const isOpen = openIdx === idx;
              return (
                <div key={idx} className={`cp-accordion-item ${isOpen ? 'cp-accordion-open' : ''}`}>
                  <button className="cp-accordion-header" onClick={() => toggleAccordion(idx)}>
                    <div className="cp-accordion-left">
                      <Icon size={20} />
                      <span className="cp-accordion-category">{item.category}</span>
                      <span className="cp-accordion-title">{t(item.titleKey)}</span>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`cp-accordion-chevron ${isOpen ? 'cp-accordion-chevron-open' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="cp-accordion-body">
                      <p>{t(item.descKey)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="cp-cta-section">
          <h2>{t('cancellation.ctaTitle')}</h2>
          <p>{t('cancellation.ctaDesc')}</p>
          <button className="cp-cta-btn" onClick={() => navigate('/')}>
            {t('cancellation.ctaButton')} <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CancellationPolicy;
