import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Edit3, Star, Clock, Users, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { packageService, type TravelPackage } from '../lib/packageService';
import { useWishlist } from '../hooks/useWishlist';
import { useI18n } from '../contexts/I18nContext';
import './PackagesList.css';

const TABS = [
  'All Packages', 'Beach Escapes', 'Honeymoon Special',
  'Family Fun', 'Adventure', 'Heritage & Culture', 'Short Breaks'
];

const TAB_I18N_KEYS = [
  'tabAllPackages', 'tabBeachEscapes', 'tabHoneymoonSpecial',
  'tabFamilyFun', 'tabAdventure', 'tabHeritageAndCulture', 'tabShortBreaks'
];

// ponytail: fallback when package-service is down
const FALLBACK_PACKAGES: (TravelPackage & { tag: string; rating: string; adults: string; desc: string })[] = [
  {
    id: 'goa-beach-escape',
    tag: 'SOUTH ASIA',
    title: 'Goa Beach Escape',
    desc: 'Unwind at pristine white sand beaches and enjoy luxury sea-facing accommodations with guided water sports.',
    rating: '4.8',
    duration: '3N / 4D',
    adults: '2 Adults',
    price: '₹10,999',
    img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'goa-leisure-getaway',
    tag: 'NORTH GOA',
    title: 'Goa Leisure Getaway',
    desc: 'Explore vibrant shacks, heritage churches, and the bustling nightlife of Baga and Calangute with private transfers.',
    rating: '4.6',
    duration: '4N / 5D',
    adults: '3 Adults',
    price: '₹12,499',
    img: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'goa-romantic-retreat',
    tag: 'LANDSCAPES',
    title: 'Goa Romantic Retreat',
    desc: 'A specially curated experience for couples featuring candle-lit dinners on the beach and sunset cruise sessions.',
    rating: '4.9',
    duration: '3N / 4D',
    adults: '2 Adults',
    price: '₹18,500',
    img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'goa-family-fun',
    tag: 'WILDLIFE',
    title: 'Goa Family Fun',
    desc: 'Fun-filled package for all ages including visits to spice plantations, Dudhsagar falls, and safe beach excursions.',
    rating: '4.7',
    duration: '4N / 5D',
    adults: '4 Adults',
    price: '₹19,500',
    img: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=80&w=600',
  },
];

type DisplayPackage = TravelPackage & { tag?: string; rating?: string; adults?: string; desc?: string };

// ponytail: package entity has no category field (see packageService.ts TravelPackage),
// so tabs match on title/desc keywords instead of a real backend field.
const TAB_KEYWORDS: Record<string, RegExp | null> = {
  'All Packages': null,
  'Beach Escapes': /beach|goa|coast|sea/i,
  'Honeymoon Special': /honeymoon|romantic|couple/i,
  'Family Fun': /family/i,
  'Adventure': /adventure|trek|raft|climb|safari/i,
  'Heritage & Culture': /heritage|culture|fort|palace|temple|church/i,
  'Short Breaks': /short|weekend/i,
};

function matchesTab(pkg: DisplayPackage, tab: string): boolean {
  const keywordRegex = TAB_KEYWORDS[tab];
  if (!keywordRegex) return true;
  const haystack = `${pkg.title} ${pkg.desc ?? ''}`.toLowerCase();
  if (keywordRegex.test(haystack)) return true;
  if (tab === 'Short Breaks') {
    const nights = parseInt(pkg.duration.match(/(\d+)\s*N/i)?.[1] ?? '', 10);
    if (!Number.isNaN(nights) && nights <= 2) return true;
  }
  return false;
}

const PackagesList: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const packagesWishlist = useWishlist('package');
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('All Packages');
  const [packages, setPackages] = useState<DisplayPackage[]>(FALLBACK_PACKAGES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(true);

  const destination = searchParams.get('destination') ?? 'Goa';
  const date = searchParams.get('date') ?? '';
  const travelers = searchParams.get('travelers') ?? t('packagesList.defaultTravelersSummary');

  const fetchPackages = () => {
    setLoading(true);
    setLoadError(null);
    packageService.listAll()
      .then((list) => {
        if (list.length > 0) {
          setPackages(list);
          setUsingFallback(false);
        } else {
          setPackages(FALLBACK_PACKAGES);
          setUsingFallback(true);
        }
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : t('packagesList.errorFailedToLoad'));
        setPackages(FALLBACK_PACKAGES);
        setUsingFallback(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiblePackages = packages.filter(pkg => matchesTab(pkg, activeTab));

  return (
    <div className="pkg-list-container">
      <Navbar theme="blue" />

      <div className="pkg-list-hero" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1600')` }}>
        <div className="pkg-list-hero-content">
          <span className="pkg-hero-sub">{t('packagesList.heroSubtitle')}</span>
          <h1>{t('packagesList.heroHeading')}</h1>

          <div className="pkg-summary-bar">
            <div className="pkg-summary-item">
              <span className="label">{t('packagesList.summaryLabelDestination')}</span>
              <span className="value">{destination}</span>
            </div>
            {date && (
              <div className="pkg-summary-item">
                <span className="label">{t('packagesList.summaryLabelDate')}</span>
                <span className="value">{date}</span>
              </div>
            )}
            <div className="pkg-summary-item">
              <span className="label">{t('packagesList.summaryLabelTravelers')}</span>
              <span className="value">{travelers}</span>
            </div>
            <button className="pkg-edit-btn" onClick={() => navigate('/packages')}>
              <Edit3 size={16} /> {t('packagesList.editSearchButton')}
            </button>
          </div>
        </div>
      </div>

      <div className="pkg-list-main">
        <div className="pkg-list-tabs">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`pkg-list-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`packagesList.${TAB_I18N_KEYS[i]}`)}
            </button>
          ))}
        </div>

        {!loading && usingFallback && (
          <div className="pkg-fallback-banner" role="alert">
            <span>
              {loadError
                ? t('packagesList.fallbackBannerMessageWithError').replace('{error}', loadError)
                : t('packagesList.fallbackBannerMessage')}
            </span>
            <button className="pkg-edit-btn" onClick={fetchPackages}>{t('packagesList.retryButton')}</button>
          </div>
        )}

        {loading ? (
          <div className="pkg-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="pkg-card pkg-card-skeleton" />
            ))}
          </div>
        ) : (
          <div className="pkg-grid">
            {visiblePackages.map(pkg => (
              <div key={pkg.id} className="pkg-card">
                <div style={{ position: 'relative' }}>
                  <img src={pkg.img} alt={pkg.title} className="pkg-card-img" />
                  <button
                    type="button"
                    aria-label={packagesWishlist.isSaved(pkg.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                    onClick={() => packagesWishlist.toggle(pkg.id, { name: pkg.title, image: pkg.img, price: pkg.price })}
                    style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(15,23,42,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Heart size={16} fill={packagesWishlist.isSaved(pkg.id) ? '#ef4444' : 'none'} color={packagesWishlist.isSaved(pkg.id) ? '#ef4444' : '#ffffff'} />
                  </button>
                </div>
                <div className="pkg-card-content">
                  {pkg.tag && <div className="pkg-card-tag"><MapPin size={12} /> {pkg.tag}</div>}
                  <h3 className="pkg-card-title">{pkg.title}</h3>
                  {pkg.desc && <p className="pkg-card-desc">{pkg.desc}</p>}
                  <div className="pkg-card-stats">
                    {pkg.rating && <div className="pkg-stat rating"><Star size={14} fill="currentColor" /> {pkg.rating}</div>}
                    {pkg.duration && <div className="pkg-stat"><Clock size={14} /> {pkg.duration}</div>}
                    {pkg.adults && <div className="pkg-stat"><Users size={14} /> {pkg.adults}</div>}
                  </div>
                  <div className="pkg-card-footer">
                    <div className="pkg-price-block">
                      <span className="pkg-price-label">{t('packagesList.priceStartsFrom')}</span>
                      <div className="pkg-price-val">{pkg.price}</div>
                      <span className="pkg-price-unit">{t('packagesList.pricePerPerson')}</span>
                    </div>
                    <button className="pkg-details-btn" onClick={() => navigate(`/packages/${pkg.id}`)}>
                      {t('packagesList.viewDetailsButton')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="pkg-load-more">{t('packagesList.loadMoreButton')}</button>
      </div>

      <Footer />
    </div>
  );
};

export default PackagesList;
