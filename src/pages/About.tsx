import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Hotel, Car, Package, CheckCircle2, IndianRupee, ShieldCheck, Clock, Headphones, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import storyImg from '../assets/plan_your_trip_asset.jpg';
import missionImg from '../assets/escape_the_weekend.png';
import './About.css';

const SERVICES = [
  { icon: Bus, titleKey: 'about.serviceBusTitle', descKey: 'about.serviceBusDesc' },
  { icon: Hotel, titleKey: 'about.serviceHotelTitle', descKey: 'about.serviceHotelDesc' },
  { icon: Car, titleKey: 'about.serviceCabTitle', descKey: 'about.serviceCabDesc' },
  { icon: Package, titleKey: 'about.servicePackageTitle', descKey: 'about.servicePackageDesc' },
];

const FEATURES = [
  { icon: IndianRupee, color: 'blue', titleKey: 'about.featurePriceTitle', descKey: 'about.featurePriceDesc' },
  { icon: ShieldCheck, color: 'green', titleKey: 'about.featureSafeTitle', descKey: 'about.featureSafeDesc' },
  { icon: Headphones, color: 'purple', titleKey: 'about.featureSupportTitle', descKey: 'about.featureSupportDesc' },
  { icon: Clock, color: 'orange', titleKey: 'about.featureEasyTitle', descKey: 'about.featureEasyDesc' },
];

const MISSION_POINTS = [
  'about.missionPoint1',
  'about.missionPoint2',
  'about.missionPoint3',
  'about.missionPoint4',
];

const STATS_CONFIG = [
  { target: 10, suffix: 'M+', labelKey: 'about.statTrips', decimals: 0 },
  { target: 500, suffix: '+', labelKey: 'about.statCities', decimals: 0 },
  { target: 4.8, suffix: '', labelKey: 'about.statRating', decimals: 1 },
  { target: 50, suffix: 'K+', labelKey: 'about.statUsers', decimals: 0 },
];

function useCountUp(end: number, duration = 2000, decimals = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Number((eased * end).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, decimals]);

  return { count, ref };
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

const StatItem: React.FC<{ config: typeof STATS_CONFIG[number] }> = ({ config }) => {
  const { count, ref } = useCountUp(config.target, 2000, config.decimals);
  const { t } = useI18n();
  return (
    <div ref={ref} className="ab-stat-item">
      <h3>{count}{config.suffix}</h3>
      <p>{t(config.labelKey)}</p>
    </div>
  );
};

const About: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const featuresHook = useInView(0.15);

  return (
    <div className="ab-page-wrapper">
      <Navbar theme="blue" />

      <div className="ab-header-section">
        <div className="ab-header-container">
          <h1>{t('about.pageTitle')}</h1>
          <p>{t('about.pageSubtitle')}</p>
        </div>
      </div>

      <main className="ab-main">

        {/* Our Story */}
        <section className="ab-story-section">
          <div className="ab-story-content">
            <h2>{t('about.storyTitle')}</h2>
            <p>{t('about.storyPara1')}</p>
            <p>{t('about.storyPara2')}</p>
          </div>
          <img
            src={storyImg}
            alt="Niklo travel planning"
            className="ab-story-image"
          />
        </section>

        {/* What We Do */}
        <section className="ab-services-section">
          <h2 className="ab-section-title">{t('about.servicesTitle')}</h2>
          <p className="ab-section-subtitle">{t('about.servicesSubtitle')}</p>
          <div className="ab-services-grid">
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <div key={svc.titleKey} className="ab-service-card">
                  <div className="ab-service-icon">
                    <Icon size={28} />
                  </div>
                  <h3>{t(svc.titleKey)}</h3>
                  <p>{t(svc.descKey)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Our Mission */}
        <section className="ab-mission-section">
          <img
            src={missionImg}
            alt="Niklo mission"
            className="ab-mission-image"
          />
          <div className="ab-mission-content">
            <h2>{t('about.missionTitle')}</h2>
            <p>{t('about.missionDesc')}</p>
            <ul className="ab-mission-list">
              {MISSION_POINTS.map((key) => (
                <li key={key}>
                  <CheckCircle2 size={18} />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="ab-features-section" ref={featuresHook.ref}>
          <h2 className="ab-section-title">{t('about.featuresTitle')}</h2>
          <p className="ab-section-subtitle">{t('about.featuresSubtitle')}</p>
          <div className="ab-features-grid">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.titleKey}
                  className={`ab-feature-card${featuresHook.visible ? ' visible' : ''}`}
                  style={{ transitionDelay: `${idx * 0.12}s` }}
                >
                  <div className={`ab-feature-icon ${feat.color}`}>
                    <Icon size={24} />
                  </div>
                  <h3>{t(feat.titleKey)}</h3>
                  <p>{t(feat.descKey)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stats */}
        <section className="ab-stats-section">
          <div className="ab-stats-grid">
            {STATS_CONFIG.map((stat) => (
              <StatItem key={stat.labelKey} config={stat} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="ab-cta-section">
          <h2>{t('about.ctaTitle')}</h2>
          <p>{t('about.ctaDesc')}</p>
          <button className="ab-cta-btn" onClick={() => navigate('/')}>
            {t('about.ctaButton')} <ArrowRight size={18} />
          </button>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default About;
