import React, { useEffect, useState } from 'react';
import { BadgePercent, Copy, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { hotelService } from '../lib/hotelService';
import { useI18n } from '../contexts/I18nContext';
import './Offers.css';

const Offers: React.FC = () => {
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState('All');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [offers, setOffers] = useState<Array<{ id: string; type: string; badge: string; title: string; desc: string; code: string; cleanCode: string; bgClass: string; img: string }>>([]);

  useEffect(() => {
    hotelService.getActivePromotion().then((promotion) => {
      if (!promotion) {
        setOffers([]);
        return;
      }
      setOffers([{ id: promotion.id, type: 'Hotels', badge: `${promotion.discountPercent}% OFF`, title: promotion.title, desc: promotion.description || '', code: `HOTEL${promotion.discountPercent}`, cleanCode: `HOTEL${promotion.discountPercent}`, bgClass: 'bg-light-blue', img: promotion.imagePath }]);
    }).catch(() => setOffers([]));
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filterLabels: Record<string, string> = {
    All: t('offers.filterAll'),
    Bus: t('offers.filterBus'),
    'Car Rides': t('offers.filterCarRides'),
    Packages: t('offers.filterPackages'),
    Adventures: t('offers.filterAdventures'),
  };

  const filteredOffers = offers.filter((offer) => {
    if (activeFilter === 'All') return true;
    return offer.type.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="of-page-wrapper">
      <Navbar theme="blue" />

      {/* Header section */}
      <div className="of-header-section">
        <div className="of-header-container">
          <h1>{t('offers.pageTitle')}</h1>
        </div>
      </div>

      {/* Filters row & cards list */}
      <main className="of-main">
        <div className="of-container">
          
          {/* Filters Bar */}
          <div className="of-filters-row">
            {['All', 'Bus', 'Car Rides', 'Packages', 'Adventures'].map(pill => (
              <button 
                key={pill} 
                className={`of-pill-btn ${activeFilter === pill ? 'active' : ''}`}
                onClick={() => setActiveFilter(pill)}
              >
                {filterLabels[pill]}
              </button>
            ))}
          </div>

          {/* Grid list of offers */}
          <div className="of-grid">
            {filteredOffers.length > 0 ? filteredOffers.map(offer => (
              <div key={offer.id} className={`of-card ${offer.bgClass}`}>
                <div className="of-card-left">
                  <div className="of-badge">
                    <BadgePercent size={16} />
                    <span>{offer.badge}</span>
                  </div>
                  <h2>{offer.title}</h2>
                  <p>{offer.desc}</p>
                  
                  <div className="of-code-box-wrap" onClick={() => handleCopy(offer.cleanCode)}>
                    <div className="of-code-box">
                      <span>{offer.code}</span>
                    </div>
                    <button className="of-copy-btn">
                      {copiedCode === offer.cleanCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="of-card-right">
                  <img src={offer.img} alt={offer.title} className="of-card-graphic" />
                </div>
              </div>
            )) : (
              <div className="of-card bg-light-blue" style={{ width: '100%' }}>
                <div className="of-card-left">
                  <h2>{t('offers.pageTitle')}</h2>
                  <p>No active offers are available right now. Please check back soon.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Offers;
