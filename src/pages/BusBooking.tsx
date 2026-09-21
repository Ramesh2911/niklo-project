import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin, Calendar, Users, ChevronDown, ChevronUp,
  Info, Gift, Bus, Fan, Wind, Moon, Wifi, Droplet, Lightbulb, Zap, Layers, Heart, Filter, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SeatSelectionModal from '../components/SeatSelectionModal';
import LocationAutocompleteInput from '../components/LocationAutocompleteInput';
import { busService, type BusSchedule } from '../lib/busService';
import { useWishlist } from '../hooks/useWishlist';
import { useI18n } from '../contexts/I18nContext';
import './BusBooking.css';

const AMENITY_ICONS: Record<string, React.ElementType> = {
  'AC': Fan,
  'Non-AC': Wind,
  'Sleeper': Moon,
  'WiFi': Wifi,
  'Water Bottle': Droplet,
  'Reading Light': Lightbulb,
  'Charging Point': Zap,
  'Blankets': Layers,
};

const BusBooking: React.FC = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const [from, setFrom] = useState(searchParams.get('from') || 'Kolkata');
  const [to, setTo] = useState(searchParams.get('to') || 'Siliguri');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [depTimeFilters, setDepTimeFilters] = useState<string[]>([]);
  const [busTypeFilters, setBusTypeFilters] = useState<string[]>([]);
  const [amenitiesFilters, setAmenitiesFilters] = useState<string[]>([]);
  const [operatorFilters, setOperatorFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('Popularity');
  const todayIso = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [passengers, setPassengers] = useState(searchParams.get('passengers') || '2 Adults');
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [allResultsLoaded, setAllResultsLoaded] = useState(false);
  const [allBuses, setAllBuses] = useState<BusSchedule[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<BusSchedule[]>([]);
  const [busesLoading, setBusesLoading] = useState(true);
  const [busesError, setBusesError] = useState<string | null>(null);
  const [selectedBusForSeats, setSelectedBusForSeats] = useState<BusSchedule | null>(null);
  const busWishlist = useWishlist('bus');
  // Mobile only: sidebar is hidden behind this toggle and opens as a full-screen
  // drawer (see .filters-sidebar-open / .filters-sidebar-backdrop in BusBooking.css) -
  // on desktop/tablet the sidebar always renders regardless of this flag.
  const [showFilters, setShowFilters] = useState(false);

  const fetchBuses = useCallback(async () => {
    setBusesLoading(true);
    setBusesError(null);
    try {
      const results = await busService.searchSchedules(from, to, date);
      setAllBuses(results);
    } catch {
      setAllBuses([]);
      setBusesError(t('busBooking.loadBusesError'));
    } finally {
      setBusesLoading(false);
    }
  }, [from, to, date]);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  // Apply filters
  useEffect(() => {
    let result = allBuses;

    // Filter by departure time slot
    if (depTimeFilters.length > 0) {
      result = result.filter(bus => {
        const hour = parseInt(bus.depTime.split(':')[0]);
        const isPM = bus.depTime.includes('PM');
        
        return depTimeFilters.some(slot => {
          if (slot === 'Before 10 AM') {
            return (!isPM && hour < 10) || (isPM && hour === 12);
          }
          if (slot === '10 AM - 5 PM') {
            return (!isPM && hour >= 10 && hour < 12) || (isPM && (hour === 12 || hour < 5));
          }
          if (slot === '5 PM - 11 PM') {
            return isPM && hour >= 5 && hour < 11;
          }
          if (slot === 'After 11 PM') {
            return (isPM && hour >= 11) || (!isPM && hour < 5);
          }
          return true;
        });
      });
    }

    // Filter by bus category
    if (busTypeFilters.length > 0) {
      result = result.filter(bus => {
        return busTypeFilters.some(filter => {
          if (filter === 'AC') return bus.category === 'AC';
          if (filter === 'Non-AC') return bus.category === 'Non-AC';
          if (filter === 'Sleeper') return bus.isSleeper;
          if (filter === 'Seater') return !bus.isSleeper;
          return true;
        });
      });
    }

    // Filter by amenities
    if (amenitiesFilters.length > 0) {
      result = result.filter(bus => {
        return amenitiesFilters.every(amenity => bus.amenities.includes(amenity));
      });
    }

    // Filter by operator
    if (operatorFilters.length > 0) {
      result = result.filter(bus => {
        return operatorFilters.includes(bus.operator);
      });
    }

    // Sort result
    if (sortBy === 'Price: Low to High') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'Price: High to Low') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'Ratings') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }

    setFilteredBuses(result);
  }, [allBuses, depTimeFilters, busTypeFilters, amenitiesFilters, operatorFilters, sortBy]);

  const handleCheckboxChange = (filterType: string, val: string) => {
    const toggle = (list: string[]) => 
      list.includes(val) ? list.filter(x => x !== val) : [...list, val];

    if (filterType === 'depTime') setDepTimeFilters(toggle(depTimeFilters));
    if (filterType === 'busType') setBusTypeFilters(toggle(busTypeFilters));
    if (filterType === 'amenity') setAmenitiesFilters(toggle(amenitiesFilters));
    if (filterType === 'operator') setOperatorFilters(toggle(operatorFilters));
  };

  const clearAllFilters = () => {
    setDepTimeFilters([]);
    setBusTypeFilters([]);
    setAmenitiesFilters([]);
    setOperatorFilters([]);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBuses();
  };

  return (
    <div className="bus-booking-container">
      <Navbar theme="blue" />

      {/* 2. Blue Search Panel */}
      <section className="search-criteria-section">
        <div className="search-criteria-wrapper">
          <h1 className="search-title">{t('busBooking.searchTitle')}</h1>
          <p className="search-subtitle">{t('busBooking.searchSubtitle')}</p>
          
          <form className="criteria-form" onSubmit={handleSearch}>
            <div className="criteria-input-group">
              <span className="input-label-tag">{t('bus.from').toUpperCase()}</span>
              <div className="criteria-input-field">
                <MapPin size={18} style={{ color: '#0052ff' }} />
                <LocationAutocompleteInput
                  value={from}
                  onChange={setFrom}
                  onSelect={(s) => setFrom(s.label.split(',')[0])}
                  required
                />
              </div>
            </div>

            <div className="criteria-input-group">
              <span className="input-label-tag">{t('bus.to').toUpperCase()}</span>
              <div className="criteria-input-field">
                <MapPin size={18} style={{ color: '#ef4444' }} />
                <LocationAutocompleteInput
                  value={to}
                  onChange={setTo}
                  onSelect={(s) => setTo(s.label.split(',')[0])}
                  required
                />
              </div>
            </div>

            {/* Travel Date */}
            <div className="criteria-input-group">
              <span className="input-label-tag">{t('busBooking.travelDateLabel')}</span>
              <div className="criteria-input-field">
                <Calendar size={18} style={{ color: '#64748b' }} />
                <input
                  type="date"
                  value={date}
                  min={todayIso}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Interactive Passengers Selection */}
            <div className="criteria-input-group clickable" onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}>
              <span className="input-label-tag">{t('busBooking.passengersLabel')}</span>
              <div className="criteria-input-field">
                <Users size={18} style={{ color: '#64748b' }} />
                <span className="criteria-value-text">{passengers}</span>
              </div>

              {showPassengerDropdown && (
                <div className="passenger-selector-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="passenger-row">
                    <div className="passenger-label-col">
                      <span className="passenger-type">{t('busBooking.adultsLabel')}</span>
                      <span className="passenger-subtext">{t('busBooking.adultsSubtext')}</span>
                    </div>
                    <div className="counter-controls">
                      <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))}>-</button>
                      <span>{adults}</span>
                      <button type="button" onClick={() => setAdults(adults + 1)}>+</button>
                    </div>
                  </div>

                  <div className="passenger-row">
                    <div className="passenger-label-col">
                      <span className="passenger-type">{t('busBooking.childrenLabel')}</span>
                      <span className="passenger-subtext">{t('busBooking.childrenSubtext')}</span>
                    </div>
                    <div className="counter-controls">
                      <button type="button" onClick={() => setChildren(Math.max(0, children - 1))}>-</button>
                      <span>{children}</span>
                      <button type="button" onClick={() => setChildren(children + 1)}>+</button>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="btn-passenger-done" 
                    onClick={() => {
                      setPassengers(`${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}`);
                      setShowPassengerDropdown(false);
                    }}
                  >
                    {t('busBooking.doneButton')}
                  </button>
                </div>
              )}
            </div>

            <button type="submit" className="btn-criteria-search">
              {t('bus.search')}
            </button>
          </form>
        </div>
      </section>

      {/* 3. Main Dashboard Body */}
      <div className="booking-dashboard-body">
        
        {/* Left Column: Filters - hidden behind the "Filters" toggle on mobile,
            always visible on desktop/tablet (see .filters-sidebar rules in BusBooking.css) */}
        {showFilters && <div className="filters-sidebar-backdrop" onClick={() => setShowFilters(false)} />}
        <aside className={`filters-sidebar${showFilters ? ' filters-sidebar-open' : ''}`}>
          <div className="filters-sidebar-mobile-header">
            <h3>{t('busBooking.filtersHeading')}</h3>
            <button type="button" className="filters-sidebar-close" aria-label="Close filters" onClick={() => setShowFilters(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="filters-header">
            <h3>{t('busBooking.filtersHeading')}</h3>
            <button className="btn-clear-all" onClick={clearAllFilters}>{t('busBooking.clearAllButton')}</button>
          </div>

          {/* Departure Time */}
          <div className="filter-group">
            <h4>{t('busBooking.departureTimeHeading')}</h4>
            {[
              { slot: 'Before 10 AM', label: t('busBooking.before10am') },
              { slot: '10 AM - 5 PM', label: t('busBooking.10amTo5pm') },
              { slot: '5 PM - 11 PM', label: t('busBooking.5pmTo11pm') },
              { slot: 'After 11 PM', label: t('busBooking.after11pm') },
            ].map(({ slot, label }) => (
              <label key={slot} className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={depTimeFilters.includes(slot)}
                  onChange={() => handleCheckboxChange('depTime', slot)}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-text">{label}</span>
              </label>
            ))}
          </div>

          {/* Bus Type */}
          <div className="filter-group">
            <h4>{t('busBooking.busTypeHeading')}</h4>
            {['AC', 'Non-AC', 'Sleeper', 'Seater'].map(type => (
              <label key={type} className="filter-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={busTypeFilters.includes(type)}
                  onChange={() => handleCheckboxChange('busType', type)}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-text">{type}</span>
              </label>
            ))}
          </div>

          {/* Amenities */}
          <div className="filter-group">
            <h4>{t('busBooking.amenitiesHeading')}</h4>
            {['WiFi', 'Water Bottle', 'Blankets', 'Charging Point'].map(amenity => (
              <label key={amenity} className="filter-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={amenitiesFilters.includes(amenity)}
                  onChange={() => handleCheckboxChange('amenity', amenity)}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-text">{amenity}</span>
              </label>
            ))}
          </div>

          {/* Operators */}
          <div className="filter-group">
            <h4>{t('busBooking.operatorsHeading')}</h4>
            {['SRTC', 'Private Operators', 'RedBus Choice'].map(op => (
              <label key={op} className="filter-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={operatorFilters.includes(op)}
                  onChange={() => handleCheckboxChange('operator', op)}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-text">{op}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* Right Column: Search Results */}
        <main className="results-main-area">
          <button
            type="button"
            className="btn-toggle-filters-mobile"
            onClick={() => setShowFilters(true)}
          >
            <Filter size={16} /> {t('busBooking.filtersHeading')}
          </button>

          <div className="results-meta-header">
            <span className="meta-text">
              {t('busBooking.busesFoundMeta').replace('{count}', String(filteredBuses.length)).replace('{from}', from).replace('{to}', to)}
            </span>
            <div className="sort-by-dropdown">
              <span className="sort-label">{t('busBooking.sortByLabel')}</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="Popularity">{t('busBooking.sortPopularity')}</option>
                <option value="Price: Low to High">{t('busBooking.sortPriceLowToHigh')}</option>
                <option value="Price: High to Low">{t('busBooking.sortPriceHighToLow')}</option>
                <option value="Ratings">{t('busBooking.sortRatings')}</option>
              </select>
            </div>
          </div>

          {/* Horizontal Day Selector Slider */}
          <div className="days-horizontal-strip">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(date || new Date().toISOString().split('T')[0]);
              d.setDate(d.getDate() - 2 + i);
              const iso = d.toISOString().split('T')[0];
              const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
              const [wd, dd, mo] = label.split(' ');
              return (
                <button
                  key={iso}
                  className={`day-strip-pill ${iso === date ? 'active' : ''}`}
                  onClick={() => setDate(iso)}
                >
                  <span className="day-name">{wd}</span>
                  <span className="day-date">{dd} {mo}</span>
                </button>
              );
            })}
          </div>

          {/* Promo Offer Coupon card */}
          <div className="promo-apply-offer-banner">
            <div className="promo-banner-left">
              <span className="promo-badge-circle"><Gift size={16} /></span>
              <div className="promo-banner-text">
                <h5 className="promo-banner-heading">{t('busBooking.promoBannerHeading')}</h5>
                <p className="promo-banner-desc">{t('busBooking.promoBannerDesc')}</p>
              </div>
            </div>
            <button className="promo-btn-apply" onClick={() => setPromoApplied(true)} disabled={promoApplied}>
              {promoApplied ? t('busBooking.appliedButton') : t('busBooking.applyOfferButton')}
            </button>
          </div>

          {/* Buses List */}
          <div className="buses-results-list">
            {busesLoading ? (
              <div className="loading-buses-indicator">
                <div className="spinner-ring"></div>
                <p>{t('busBooking.searchingBuses')}</p>
              </div>
            ) : filteredBuses.length > 0 ? (
              filteredBuses.map(bus => (
                <div key={bus.id} className="bus-result-card">
                  
                  {/* Top section info */}
                  <div className="bus-card-top">
                    {/* Left: Titles & Rating */}
                    <div className="bus-title-block">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 className="bus-card-title">{bus.name}</h3>
                        <button
                          type="button"
                          aria-label={busWishlist.isSaved(bus.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                          onClick={() => busWishlist.toggle(bus.id, { name: bus.name, price: bus.price, from: bus.depLoc, to: bus.arrLoc })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                        >
                          <Heart size={16} fill={busWishlist.isSaved(bus.id) ? '#ef4444' : 'none'} color={busWishlist.isSaved(bus.id) ? '#ef4444' : '#94a3b8'} />
                        </button>
                      </div>
                      <p className="bus-card-subtitle">{bus.type}</p>
                      {bus.rating > 0 && (
                        <div className="bus-rating-pill-container">
                          <span className={`bus-rating-badge ${bus.rating >= 4.5 ? 'green' : 'yellow'}`}>
                            ★ {bus.rating}
                          </span>
                          {bus.ratingsCount > 0 && <span className="bus-rating-count">{bus.ratingsCount} {t('busBooking.ratingsLabel')}</span>}
                        </div>
                      )}
                    </div>

                    {/* Center: Departure/Duration/Arrival times */}
                    <div className="bus-timing-block">
                      <div className="time-info text-right">
                        <h4 className="time-lbl">{bus.depTime}</h4>
                        <span className="loc-lbl">{bus.depLoc}</span>
                      </div>
                      
                      <div className="timing-duration-graphic">
                        <span className="duration-text">{bus.duration}</span>
                        <div className="duration-line">
                          <span className="line-dot"></span>
                          <span className="line-bar"></span>
                          <Bus size={16} className="duration-bus-icon" fill="currentColor" strokeWidth={1.25} />
                          <span className="line-bar"></span>
                          <span className="line-dot"></span>
                        </div>
                      </div>

                      <div className="time-info text-left">
                        <h4 className="time-lbl">{bus.arrTime}</h4>
                        <span className="loc-lbl">{bus.arrLoc}</span>
                      </div>
                    </div>

                    {/* Right: Pricing & Select Seats */}
                    <div className="bus-action-block">
                      <div className="pricing-info">
                        <span className="starting-from-lbl">{t('busBooking.startingFromLabel')}</span>
                        <h3 className="pricing-val">₹{bus.price}</h3>
                        {bus.discount && <span className="exclusive-discount-lbl">{bus.discount}</span>}
                      </div>
                      <button className="btn-select-seats" onClick={() => setSelectedBusForSeats(bus)}>
                        {t('busBooking.selectSeatButton')}
                      </button>
                    </div>
                  </div>

                  {/* Bottom section amenities */}
                  <div className="bus-card-bottom">
                    <div className="bus-card-amenities-row">
                      {bus.amenities.map(amenity => {
                        const AmenityIcon = AMENITY_ICONS[amenity];
                        return (
                          <span key={amenity} className="amenity-badge-item">
                            {AmenityIcon && <AmenityIcon size={14} />}
                            {amenity}
                          </span>
                        );
                      })}
                    </div>
                    <button className="btn-view-cancellation" onClick={() => setShowCancellationPolicy(true)}>
                      {t('busBooking.viewCancellationPolicy')}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-results-fallback">
                <Info size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                <h3>{busesError ? t('busBooking.somethingWentWrong') : t('busBooking.noBusesFound')}</h3>
                <p>{busesError || t('busBooking.noBusesHint')}</p>
                {busesError ? (
                  <button className="btn-reset-filters-action" onClick={fetchBuses}>{t('busBooking.retryButton')}</button>
                ) : (
                  <button className="btn-reset-filters-action" onClick={clearAllFilters}>{t('busBooking.resetFiltersButton')}</button>
                )}
              </div>
            )}
          </div>

          {/* Load More Button — the search already returns every matching result in one call */}
          {filteredBuses.length > 0 && (
            allResultsLoaded ? (
              <p className="load-more-status">{t('busBooking.allResultsLoaded')}</p>
            ) : (
              <button className="btn-load-more-results" onClick={() => setAllResultsLoaded(true)}>
                {t('busBooking.loadMoreResults')}
              </button>
            )
          )}
        </main>
      </div>

      {/* 4. Collapsible FAQs Accordion */}
      <section className="faq-outer-section">
        <h2 className="faq-main-title">{t('busBooking.faqTitle')}</h2>
        <div className="faq-accordion-list">
          {[
            { q: t('busBooking.faq1Question'), a: t('busBooking.faq1Answer') },
            { q: t('busBooking.faq2Question'), a: t('busBooking.faq2Answer') },
            { q: t('busBooking.faq3Question'), a: t('busBooking.faq3Answer') },
          ].map((item, idx) => (
            <div key={idx} className={`faq-accordion-item ${activeFaq === idx ? 'expanded' : ''}`}>
              <button className="faq-question-toggle-btn" onClick={() => toggleFaq(idx)}>
                <span>{item.q}</span>
                {activeFaq === idx ? <ChevronUp size={18} style={{ color: '#0052ff' }} /> : <ChevronDown size={18} />}
              </button>
              {activeFaq === idx && (
                <div className="faq-answer-block fade-in">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <Footer />

      {/* Seat Selection Modal */}
      {selectedBusForSeats && (
        <SeatSelectionModal
          bus={selectedBusForSeats}
          date={date || todayIso}
          onClose={() => setSelectedBusForSeats(null)}
        />
      )}

      {/* Cancellation Policy Modal */}
      {showCancellationPolicy && (
        <div className="cancellation-policy-overlay" onClick={() => setShowCancellationPolicy(false)}>
          <div className="cancellation-policy-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('busBooking.cancellationPolicyTitle')}</h3>
            <p>{t('busBooking.cancellationPolicyDesc')}</p>
            <button className="btn-close-cancellation-policy" onClick={() => setShowCancellationPolicy(false)}>{t('busBooking.closeCancellationPolicy')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusBooking;
