import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Star, Bus, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import './BusRouteLanding.css';

function parseSlug(slug: string): { from: string; to: string } {
  const parts = slug.split('-to-');
  if (parts.length !== 2) return { from: slug, to: '' };
  const capitalize = (s: string) =>
    s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { from: capitalize(parts[0]), to: capitalize(parts[1]) };
}

const ROUTE_FACTS: Record<string, { distance: string; duration: string; buses: number; price: number }> = {
  'kolkata-to-siliguri': { distance: '570 km', duration: '10h 30m', buses: 42, price: 650 },
  'kolkata-to-digha': { distance: '187 km', duration: '4h 00m', buses: 28, price: 280 },
  'kolkata-to-darjeeling': { distance: '640 km', duration: '12h 00m', buses: 18, price: 750 },
  'kolkata-to-puri': { distance: '500 km', duration: '9h 30m', buses: 22, price: 580 },
  'kolkata-to-bhubaneswar': { distance: '441 km', duration: '8h 00m', buses: 35, price: 480 },
};

const BusRouteLanding: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { from, to } = parseSlug(slug ?? '');
  const facts = ROUTE_FACTS[slug ?? ''] ?? { distance: 'N/A', duration: 'N/A', buses: 12, price: 400 };

  const fromTo = (key: string) => t(`busRouteLanding.${key}`).replace('{{from}}', from).replace('{{to}}', to);

  const handleSearch = () => {
    navigate(`/buses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  };

  return (
    <div className="route-landing">
      <Navbar theme="blue" />

      <header className="route-hero">
        <div className="route-hero-inner">
          <nav aria-label="Breadcrumb" className="route-breadcrumb">
            <a href="/buses">{t('busRouteLanding.breadcrumbLabel')}</a> › <span>{from} to {to}</span>
          </nav>
          <h1 className="route-hero-title">{fromTo('heroBusLabel')}</h1>
          <p className="route-hero-sub">{t('busRouteLanding.heroSubtitle')}</p>
          <div className="route-stats-row">
            <div className="route-stat"><MapPin size={16} /><span>{facts.distance}</span></div>
            <div className="route-stat"><Clock size={16} /><span>{facts.duration}</span></div>
            <div className="route-stat"><Bus size={16} /><span>{facts.buses} {t('busRouteLanding.statDailyBuses')}</span></div>
            <div className="route-stat"><Star size={16} fill="#fbbf24" color="#fbbf24" /><span>{t('busRouteLanding.statFromPrice')}{facts.price}</span></div>
          </div>
          <button className="route-cta-btn" onClick={handleSearch}>
            {t('busRouteLanding.ctaButton')} <ArrowRight size={18} />
          </button>
        </div>
      </header>

      <main className="route-main" id="main-content">
        <div className="route-container">

          <section className="route-info-section">
            <h2>{fromTo('aboutSectionHeading')}</h2>
            <p>
              {fromTo('aboutSectionBody').replace('{{buses}}', String(facts.buses)).replace('{{distance}}', facts.distance).replace('{{duration}}', facts.duration)}
            </p>
          </section>

          <section className="route-faq-section">
            <h2>{t('busRouteLanding.faqSectionHeading')}</h2>
            <div className="route-faq-list">
              <details className="route-faq-item">
                <summary>{fromTo('faqDistanceQuestion')}</summary>
                <p>{fromTo('faqDistanceAnswer').replace('{{distance}}', facts.distance)}</p>
              </details>
              <details className="route-faq-item">
                <summary>{fromTo('faqDurationQuestion')}</summary>
                <p>{fromTo('faqDurationAnswer').replace('{{duration}}', facts.duration)}</p>
              </details>
              <details className="route-faq-item">
                <summary>{fromTo('faqFareQuestion')}</summary>
                <p>{fromTo('faqFareAnswer').replace('{{price}}', String(facts.price))}</p>
              </details>
              <details className="route-faq-item">
                <summary>{fromTo('faqBusCountQuestion')}</summary>
                <p>{fromTo('faqBusCountAnswer').replace('{{buses}}', String(facts.buses))}</p>
              </details>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BusRouteLanding;
