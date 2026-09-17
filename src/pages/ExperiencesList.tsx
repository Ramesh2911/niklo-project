import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, Clock, Heart, Filter, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import experienceListCtaBg from '../assets/exp_adv.png';
import { experienceService, type Experience } from '../lib/experienceService';
import { useWishlist } from '../hooks/useWishlist';
import { useI18n } from '../contexts/I18nContext';
import './ExperiencesList.css';

// adventures.service.ts#getCategories only seeds 4 real categories — a pill
// with no match here (Camping) sends that literal string as `category` and
// the backend legitimately returns zero results, since that category doesn't
// exist in the catalog. That's real data, not a bug.
const FILTER_PILL_KEYS = ['All', 'Water Sports', 'Trekking', 'Camping', 'Air Sports'] as const;

type SortKey = 'popularity' | 'priceLowHigh' | 'priceHighLow' | 'duration';

function sortAdventures(list: Experience[], sortKey: SortKey): Experience[] {
  if (sortKey === 'popularity') return list;
  const sorted = [...list];
  if (sortKey === 'priceLowHigh') sorted.sort((a, b) => a.price - b.price);
  else if (sortKey === 'priceHighLow') sorted.sort((a, b) => b.price - a.price);
  else if (sortKey === 'duration') sorted.sort((a, b) => a.durationHours - b.durationHours);
  return sorted;
}

const ExperiencesList: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type') ?? '';
  const locationParam = searchParams.get('location') ?? '';
  const dateParam = searchParams.get('date') ?? '';
  const travelersParam = searchParams.get('travelers') ?? '';
  const [activeFilter, setActiveFilter] = useState((FILTER_PILL_KEYS as readonly string[]).includes(typeParam) ? typeParam : 'All');
  const [sortKey, setSortKey] = useState<SortKey>('popularity');
  const [adventures, setAdventures] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const experiencesWishlist = useWishlist('experience');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Preserve the traveler's search context (date/travelers) into the booking flow —
  // adventure entities carry no per-listing schedule, so these apply at checkout,
  // not as an inventory filter.
  const bookingQuery = (() => {
    const params = new URLSearchParams();
    if (dateParam) params.set('date', dateParam);
    if (travelersParam) params.set('travelers', travelersParam);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  })();

  // Real server-side filters (adventures.service.ts#findAll) — category,
  // location, and price range all round-trip the backend now instead of
  // filtering a full fetched list client-side.
  useEffect(() => {
    setLoading(true);
    experienceService.searchExperiences({
      category: activeFilter === 'All' ? undefined : activeFilter,
      location: locationParam || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
    })
      .then(setAdventures)
      .finally(() => setLoading(false));
  }, [activeFilter, locationParam, minPrice, maxPrice]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
  };

  const handleViewDetails = (id: string) => {
    navigate(`/experiences/${id}${bookingQuery}`);
  };

  const visibleAdventures = sortAdventures(adventures, sortKey);

  const resetFilters = () => { setMinPrice(''); setMaxPrice(''); };

  const FILTER_PILLS = [
    { key: 'All', label: t('experiencesList.filterAll') },
    { key: 'Water Sports', label: t('experiencesList.filterWaterSports') },
    { key: 'Trekking', label: t('experiencesList.filterTrekking') },
    { key: 'Camping', label: t('experiencesList.filterCamping') },
    { key: 'Air Sports', label: t('experiencesList.filterAirSports') },
  ];

  return (
    <div className="el-page-wrapper">
      <Navbar theme="blue" />

      {showFilters && <div className="el-filter-backdrop" onClick={() => setShowFilters(false)} />}
      <aside className={`el-filter-drawer${showFilters ? ' el-filter-drawer-open' : ''}`}>
        <div className="el-filter-drawer-header">
          <h2>{t('experiencesList.filters')}</h2>
          <button type="button" className="el-filter-drawer-close" aria-label="Close filters" onClick={() => setShowFilters(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="el-filter-section">
          <h3>{t('experiencesList.filterPriceRange')}</h3>
          <div className="el-filter-price-row">
            <label className="el-filter-price-field">
              <span>{t('experiencesList.filterPriceMin')}</span>
              <input type="number" min="0" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            </label>
            <label className="el-filter-price-field">
              <span>{t('experiencesList.filterPriceMax')}</span>
              <input type="number" min="0" placeholder="Any" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="el-filter-drawer-actions">
          <button type="button" className="el-filter-reset-btn" onClick={resetFilters}>{t('experiencesList.filterReset')}</button>
          <button type="button" className="el-filter-apply-btn" onClick={() => setShowFilters(false)}>{t('experiencesList.filterApply')}</button>
        </div>
      </aside>

      {/* Header Info */}
      <div className="el-header-section">
        <div className="el-header-container">
          <span className="el-badge-lbl">{t('experiencesList.discoverNewThrills')}</span>
          <h1>{t('experiencesList.allAdventures')}</h1>
          {locationParam && <p style={{ color: '#64748b', margin: '4px 0 0' }}>Showing results near "{locationParam}"</p>}
        </div>
      </div>

      {/* Filters & Grid */}
      <main className="el-main">
        <div className="el-container">
          
          {/* Filter Pills row */}
          <div className="el-filters-meta-row">
            <div className="el-pills-wrap">
              <button
                type="button"
                className={`el-filter-btn${(minPrice || maxPrice) ? ' active' : ''}`}
                onClick={() => setShowFilters(true)}
              >
                <Filter size={14} />
                <span>{t('experiencesList.filters')}</span>
              </button>
              {FILTER_PILLS.map(pill => (
                <button
                  key={pill.key}
                  className={`el-pill-btn ${activeFilter === pill.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(pill.key)}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="el-sort-box">
              <span>{t('experiencesList.sortBy')}</span>
              <select
                className="el-sort-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="popularity">{t('experiencesList.sortPopularity')}</option>
                <option value="priceLowHigh">{t('experiencesList.sortPriceLowHigh')}</option>
                <option value="priceHighLow">{t('experiencesList.sortPriceHighLow')}</option>
                <option value="duration">{t('experiencesList.sortDuration')}</option>
              </select>
            </div>
          </div>

          {/* Adventures grid */}
          {loading ? (
            <p style={{ padding: '24px', color: '#64748b' }}>{t('experiencesList.loadingAdventures')}</p>
          ) : visibleAdventures.length === 0 ? (
            <p style={{ padding: '24px', color: '#64748b' }}>{t('experiencesList.noAdventures')}</p>
          ) : (
            <div className="el-grid">
              {visibleAdventures.map(adv => (
                <div key={adv.id} className="el-card">
                  <div className="el-card-img-box">
                    <img src={adv.img} alt={adv.name} className="el-card-img" />
                  </div>

                  <div className="el-card-body">
                    <div className="el-card-header-row">
                      <h2 className="el-card-title">{adv.name}</h2>
                      <button
                        className="el-like-btn"
                        aria-label={experiencesWishlist.isSaved(adv.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                        onClick={() => experiencesWishlist.toggle(adv.id, { name: adv.name, image: adv.img, price: adv.price, location: adv.location })}
                      >
                        <Heart size={16} fill={experiencesWishlist.isSaved(adv.id) ? '#ef4444' : 'none'} color={experiencesWishlist.isSaved(adv.id) ? '#ef4444' : 'currentColor'} />
                      </button>
                    </div>

                    <div className="el-card-loc">
                      <MapPin size={14} />
                      <span>{adv.location}</span>
                    </div>

                    <p className="el-card-desc">{adv.description}</p>

                    <div className="el-card-tags">
                      <span className="el-tag-item">
                        <Clock size={12} />
                        <span>{adv.durationHours} hr{adv.durationHours !== 1 ? 's' : ''}</span>
                      </span>
                    </div>

                    <div className="el-card-footer">
                      <div className="el-price-col">
                        <strong className="el-price-val">₹{adv.price.toLocaleString('en-IN')}</strong>
                        <span className="el-price-lbl">{t('experiencesList.perPerson')}</span>
                      </div>
                      <button className="el-details-btn" onClick={() => handleViewDetails(adv.id)}>{t('experiencesList.viewDetails')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Promotion Banner */}
          <section className="el-promo-section" style={{ backgroundImage: `url('${experienceListCtaBg}')` }}>
            <div className="el-promo-overlay"></div>
            <div className="el-promo-content">
              <h2>{t('experiencesList.promoHeading')}</h2>
              <p>{t('experiencesList.promoSubtext')}</p>
              {subscribed ? (
                <p className="el-promo-success">{t('experiencesList.promoSuccess')}</p>
              ) : (
                <form className="el-promo-form" onSubmit={handleSubscribe}>
                  <input type="email" placeholder={t('experiencesList.emailPlaceholder')} required className="el-promo-input" />
                  <button type="submit" className="el-promo-btn">{t('experiencesList.subscribe')}</button>
                </form>
              )}
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ExperiencesList;
