import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hotelService, type HotelListing, type LocationSuggestion } from '../lib/hotelService';
import {
  MapPin, Calendar, Users, Star, Shield, RefreshCw,
  Tag, Headphones, Wifi, Coffee, Heart, Filter, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWishlist } from '../hooks/useWishlist';
import { useI18n } from '../contexts/I18nContext';
import './HotelsList.css';


const HotelsList: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const hotelsWishlist = useWishlist('hotel');
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get('destination') || 'Kolkata, West Bengal');
  const [destSuggestions, setDestSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const tomorrowIso = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [checkInDate, setCheckInDate] = useState(todayIso);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowIso);
  const [guestsRooms, setGuestsRooms] = useState('2 Guests, 1 Room');
  const [showGuestsPicker, setShowGuestsPicker] = useState(false);
  const [guests, setGuests] = useState({ adults: 2, rooms: 1 });
  // Empty string/array means "no filter applied" — defaulting to an actual
  // range here was hiding every real hotel whose price/rating/amenities
  // didn't happen to match all four criteria at once (see checkbox toggle
  // handlers below for how a filter gets cleared back to this state).
  const [priceFilter, setPriceFilter] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [amenitiesFilter, setAmenitiesFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'hotels');
  const [activePill, setActivePill] = useState('recommended');
  const [sortBy, setSortBy] = useState('recommended');
  const [hotels, setHotels] = useState<HotelListing[]>([]);
  const [loading, setLoading] = useState(true);
  // Mobile only: sidebar is hidden behind this toggle and opens as a full-screen
  // drawer (see .hl-sidebar-open / .hl-sidebar-backdrop in HotelsList.css) - on
  // desktop the sidebar always renders regardless of this flag.
  const [showFilters, setShowFilters] = useState(false);

  // hotel-service's /hotels/search only filters by `location` (destination text match) -
  // it ignores star/price params entirely, so star/price/amenity/type filtering happens
  // client-side below against the fetched list instead of round-tripping the backend.
  const runSearch = React.useCallback(() => {
    setLoading(true);
    hotelService.searchHotels({ destination, checkInDate, checkOutDate, rooms: guests.rooms, adults: guests.adults })
      .then(setHotels)
      .catch(() => setHotels([]))
      .finally(() => setLoading(false));
  }, [destination, checkInDate, checkOutDate, guests.adults, guests.rooms]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  // Debounced destination autocomplete - only fetches while the field is focused.
  useEffect(() => {
    if (!showDestSuggestions) return;
    const timer = setTimeout(() => {
      hotelService.getLocationSuggestions(destination)
        .then(setDestSuggestions)
        .catch(() => setDestSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [destination, showDestSuggestions]);

  const selectDestination = (name: string) => {
    setDestination(name);
    setShowDestSuggestions(false);
  };

  const parsePriceRange = (range: string): [number, number] => {
    if (!range) return [0, Infinity];
    if (range.endsWith('+')) return [Number(range.slice(0, -1)), Infinity];
    const [min, max] = range.split('-').map(Number);
    return [min, max];
  };

  const sidebarFilteredHotels = React.useMemo(() => {
    const [minPrice, maxPrice] = parsePriceRange(priceFilter);
    return hotels.filter(hotel => {
      // ponytail: hotel-service has no property-type column yet, every seeded record is
      // a plain "hotel" - non-hotels selections legitimately match nothing until the
      // backend models apartments/guesthouses/resorts.
      if (typeFilter !== 'hotels') return false;
      if (hotel.price < minPrice || hotel.price > maxPrice) return false;
      if (starFilter && (starFilter === '2-below' ? hotel.stars > 2 : hotel.stars !== Number(starFilter))) return false;
      if (amenitiesFilter.length > 0 && !amenitiesFilter.every(key =>
        hotel.amenities.some(a => a.toLowerCase().includes(key))
      )) return false;
      return true;
    });
  }, [hotels, priceFilter, starFilter, amenitiesFilter, typeFilter]);

  const pillFilteredHotels = React.useMemo(() => {
    switch (activePill) {
      case 'budget': return sidebarFilteredHotels.filter(h => h.price <= 5000);
      case 'luxury': return sidebarFilteredHotels.filter(h => h.price >= 8000);
      case 'topRated': return sidebarFilteredHotels.filter(h => h.rating >= 4.5);
      case 'familyFriendly': return sidebarFilteredHotels.filter(h => h.amenities.some(a => /pool|family/i.test(a)));
      default: return sidebarFilteredHotels;
    }
  }, [sidebarFilteredHotels, activePill]);

  const displayedHotels = React.useMemo(() => {
    const list = [...pillFilteredHotels];
    switch (sortBy) {
      case 'priceLowHigh': return list.sort((a, b) => a.price - b.price);
      case 'priceHighLow': return list.sort((a, b) => b.price - a.price);
      case 'rating': return list.sort((a, b) => b.rating - a.rating);
      default: return list;
    }
  }, [pillFilteredHotels, sortBy]);

  const handleGuestChange = (type: 'adults' | 'rooms', op: 'add' | 'sub') => {
    setGuests(prev => {
      const newVal = op === 'add' ? prev[type] + 1 : Math.max(1, prev[type] - 1);
      return { ...prev, [type]: newVal };
    });
    setGuestsRooms(t('hotelsList.guestsRoomsSummary').replace('{adults}', String(guests.adults)).replace('{rooms}', String(guests.rooms)));
  };

  const toggleAmenity = (amenity: string) => {
    setAmenitiesFilter(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  return (
    <div className="hotels-list-page" onClick={() => { setShowGuestsPicker(false); }}>
      <Navbar theme="blue" />

      {/* Header Info */}
      <div className="hl-header-section">
        <div className="hl-header-container">
          <h1>{t('hotelsList.headerTitle')}</h1>
          <p>{t('hotelsList.headerSubtitle')}</p>
        </div>
      </div>

      {/* Compact Search Bar */}
      <div className="hl-search-wrapper">
        <div className="hl-search-bar">
          <div className="hl-search-field relative" onClick={e => e.stopPropagation()}>
            <label>{t('hotelsList.searchLocationLabel')}</label>
            <div className="hl-input-row">
              <MapPin size={16} className="hl-icon" />
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                onFocus={() => setShowDestSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDestSuggestions(false), 150)}
                autoComplete="off"
                className="hl-field-input"
              />
            </div>
            {showDestSuggestions && destSuggestions.length > 0 && (
              <div className="hl-suggest-dropdown">
                {destSuggestions.map((s, idx) => (
                  <div
                    key={`${s.name}-${idx}`}
                    className="hl-suggest-item"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => selectDestination(s.name)}
                  >
                    <MapPin size={14} className="hl-suggest-icon" />
                    <span>{s.name}</span>
                    {s.region && <span className="hl-suggest-region">{s.region}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hl-search-field" onClick={e => { e.stopPropagation(); setShowGuestsPicker(false); }}>
            <label>{t('hotelsList.searchDatesLabel')}</label>
            <div className="hl-input-row">
              <Calendar size={16} className="hl-icon" />
              <input type="date" value={checkInDate} min={todayIso} onChange={e => setCheckInDate(e.target.value)} className="hl-field-input" aria-label={t('hotelsList.searchDatesLabel')} />
              <span>–</span>
              <input type="date" value={checkOutDate} min={checkInDate} onChange={e => setCheckOutDate(e.target.value)} className="hl-field-input" aria-label={t('hotelsList.searchDatesLabel')} />
            </div>
          </div>

          <div className="hl-search-field relative" onClick={e => { e.stopPropagation(); setShowGuestsPicker(!showGuestsPicker); }}>
            <label>{t('hotelsList.searchGuestsRoomsLabel')}</label>
            <div className="hl-input-row">
              <Users size={16} className="hl-icon" />
              <span className="hl-field-val">{guestsRooms}</span>
            </div>
            {showGuestsPicker && (
              <div className="custom-guest-popover" onClick={e => e.stopPropagation()}>
                <div className="guest-row">
                  <div className="guest-info"><span>{t('hotelsList.guestPickerRooms')}</span></div>
                  <div className="guest-controls">
                    <button type="button" onClick={() => handleGuestChange('rooms', 'sub')}>-</button>
                    <span>{guests.rooms}</span>
                    <button type="button" onClick={() => handleGuestChange('rooms', 'add')}>+</button>
                  </div>
                </div>
                <div className="guest-row">
                  <div className="guest-info"><span>{t('hotelsList.guestPickerAdults')}</span><small>{t('hotelsList.guestPickerAdultsAge')}</small></div>
                  <div className="guest-controls">
                    <button type="button" onClick={() => handleGuestChange('adults', 'sub')}>-</button>
                    <span>{guests.adults}</span>
                    <button type="button" onClick={() => handleGuestChange('adults', 'add')}>+</button>
                  </div>
                </div>
                <button type="button" className="guest-done-btn" onClick={() => setShowGuestsPicker(false)}>{t('hotelsList.guestPickerDoneButton')}</button>
              </div>
            )}
          </div>

          <button className="hl-search-btn" onClick={runSearch}>{t('hotelsList.searchButton')}</button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="hl-pills-container">
        <div className="hl-pills-row">
          <button
            type="button"
            className={`hl-pill-btn hl-filter-toggle-btn${showFilters ? ' active' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter size={14} /> {t('hotelsList.filterPillFilters')}
          </button>
          <button className={`hl-pill-btn${activePill === 'recommended' ? ' active' : ''}`} onClick={() => setActivePill('recommended')}>{t('hotelsList.filterPillRecommended')}</button>
          <button className={`hl-pill-btn${activePill === 'budget' ? ' active' : ''}`} onClick={() => setActivePill('budget')}>{t('hotelsList.filterPillBudget')}</button>
          <button className={`hl-pill-btn${activePill === 'luxury' ? ' active' : ''}`} onClick={() => setActivePill('luxury')}>{t('hotelsList.filterPillLuxury')}</button>
          <button className={`hl-pill-btn${activePill === 'topRated' ? ' active' : ''}`} onClick={() => setActivePill('topRated')}>{t('hotelsList.filterPillTopRated')}</button>
          <button className={`hl-pill-btn${activePill === 'familyFriendly' ? ' active' : ''}`} onClick={() => setActivePill('familyFriendly')}>{t('hotelsList.filterPillFamilyFriendly')}</button>
        </div>
      </div>

      {/* Content Layout */}
      <div className="hl-main-content">
        <div className="hl-layout-container">
          
          {/* Left Sidebar Filter panel - hidden behind the "Filters" toggle on mobile,
              always visible on desktop (see .hl-sidebar rules in HotelsList.css) */}
          {showFilters && <div className="hl-sidebar-backdrop" onClick={() => setShowFilters(false)} />}
          <aside className={`hl-sidebar${showFilters ? ' hl-sidebar-open' : ''}`}>

            <div className="hl-sidebar-header">
              <h2>{t('hotelsList.filterPillFilters')}</h2>
              <button type="button" className="hl-sidebar-close" aria-label="Close filters" onClick={() => setShowFilters(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="hl-filter-section">
              <h3>{t('hotelsList.filterPricePerNight')}</h3>
              <div className="hl-checkbox-list">
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={priceFilter === '0-2000'} onChange={() => setPriceFilter(priceFilter === '0-2000' ? '' : '0-2000')} />
                  <span>₹0 - ₹2,000</span>
                  <span className="hl-count">{hotels.filter(h => h.price >= 0 && h.price <= 2000).length}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={priceFilter === '2000-5000'} onChange={() => setPriceFilter(priceFilter === '2000-5000' ? '' : '2000-5000')} />
                  <span>₹2,000 - ₹5,000</span>
                  <span className="hl-count">{hotels.filter(h => h.price >= 2000 && h.price <= 5000).length}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={priceFilter === '5000-10000'} onChange={() => setPriceFilter(priceFilter === '5000-10000' ? '' : '5000-10000')} />
                  <span>₹5,000 - ₹10,000</span>
                  <span className="hl-count">{hotels.filter(h => h.price >= 5000 && h.price <= 10000).length}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={priceFilter === '10000+'} onChange={() => setPriceFilter(priceFilter === '10000+' ? '' : '10000+')} />
                  <span>₹10,000+</span>
                  <span className="hl-count">{hotels.filter(h => h.price >= 10000).length}</span>
                </label>
              </div>
            </div>

            <div className="hl-filter-section">
              <h3>{t('hotelsList.filterStarRating')}</h3>
              <div className="hl-checkbox-list">
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={starFilter === '5'} onChange={() => setStarFilter(starFilter === '5' ? '' : '5')} />
                  <span>{t('hotelsList.starOption5')}</span>
                  <span className="hl-count">{hotels.filter(h => h.stars === 5).length}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={starFilter === '4'} onChange={() => setStarFilter(starFilter === '4' ? '' : '4')} />
                  <span>{t('hotelsList.starOption4')}</span>
                  <span className="hl-count">{hotels.filter(h => h.stars === 4).length}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={starFilter === '3'} onChange={() => setStarFilter(starFilter === '3' ? '' : '3')} />
                  <span>{t('hotelsList.starOption3')}</span>
                  <span className="hl-count">{hotels.filter(h => h.stars === 3).length}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={starFilter === '2-below'} onChange={() => setStarFilter(starFilter === '2-below' ? '' : '2-below')} />
                  <span>{t('hotelsList.starOption2Below')}</span>
                  <span className="hl-count">{hotels.filter(h => h.stars <= 2).length}</span>
                </label>
              </div>
            </div>

            <div className="hl-filter-section">
              <h3>{t('hotelsList.filterAmenities')}</h3>
              <div className="hl-checkbox-list">
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={amenitiesFilter.includes('wifi')} onChange={() => toggleAmenity('wifi')} />
                  <span>{t('hotelsList.amenityFreeWifi')}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={amenitiesFilter.includes('breakfast')} onChange={() => toggleAmenity('breakfast')} />
                  <span>{t('hotelsList.amenityFreeBreakfast')}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={amenitiesFilter.includes('pool')} onChange={() => toggleAmenity('pool')} />
                  <span>{t('hotelsList.amenitySwimmingPool')}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={amenitiesFilter.includes('fitness')} onChange={() => toggleAmenity('fitness')} />
                  <span>{t('hotelsList.amenityFitnessCenter')}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={amenitiesFilter.includes('spa')} onChange={() => toggleAmenity('spa')} />
                  <span>{t('hotelsList.amenitySpaWellness')}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={amenitiesFilter.includes('shuttle')} onChange={() => toggleAmenity('shuttle')} />
                  <span>{t('hotelsList.amenityAirportShuttle')}</span>
                </label>
              </div>
            </div>

            <div className="hl-filter-section">
              <h3>{t('hotelsList.filterPropertyType')}</h3>
              <div className="hl-checkbox-list">
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={typeFilter === 'hotels'} onChange={() => setTypeFilter('hotels')} />
                  <span>{t('hotelsList.propertyTypeHotels')}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={typeFilter === 'apartments'} onChange={() => setTypeFilter('apartments')} />
                  <span>{t('hotelsList.propertyTypeApartments')}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={typeFilter === 'guesthouses'} onChange={() => setTypeFilter('guesthouses')} />
                  <span>{t('hotelsList.propertyTypeGuestHouses')}</span>
                </label>
                <label className="hl-checkbox-item">
                  <input type="checkbox" checked={typeFilter === 'resorts'} onChange={() => setTypeFilter('resorts')} />
                  <span>{t('hotelsList.propertyTypeResorts')}</span>
                </label>
              </div>
            </div>

          </aside>

          {/* Results Grid List */}
          <main className="hl-results-content">
            <div className="hl-results-meta">
              <span className="hl-results-count">{t('hotelsList.resultsCountLabel').replace('{destination}', destination).replace('{count}', String(displayedHotels.length))}</span>
              <div className="hl-sort-box">
                <span>{t('hotelsList.sortByLabel')}</span>
                <select className="hl-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="recommended">{t('hotelsList.sortOptionRecommended')}</option>
                  <option value="priceLowHigh">{t('hotelsList.sortOptionPriceLowHigh')}</option>
                  <option value="priceHighLow">{t('hotelsList.sortOptionPriceHighLow')}</option>
                  <option value="rating">{t('hotelsList.sortOptionUserRating')}</option>
                </select>
              </div>
            </div>

            <div className="hl-results-grid">
              {loading && <p style={{ padding: '32px', color: '#64748b' }}>{t('hotelsList.loadingHotels')}</p>}
              {!loading && displayedHotels.length === 0 && <p style={{ padding: '32px', color: '#64748b' }}>{t('hotelsList.noHotelsFound')}</p>}
              {displayedHotels.map(hotel => (
                <div key={hotel.id} className="hl-hotel-card">
                  <div className="hl-card-img-box">
                    <img loading="lazy" src={hotel.img} alt={hotel.name} className="hl-card-img" />
                    <span className="hl-dist-badge">{hotel.distance}</span>
                    <button
                      type="button"
                      aria-label={hotelsWishlist.isSaved(hotel.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                      onClick={() => hotelsWishlist.toggle(hotel.id, { name: hotel.name, image: hotel.img, price: hotel.price })}
                      style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(15,23,42,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Heart size={16} fill={hotelsWishlist.isSaved(hotel.id) ? '#ef4444' : 'none'} color={hotelsWishlist.isSaved(hotel.id) ? '#ef4444' : '#ffffff'} />
                    </button>
                  </div>
                  <div className="hl-card-body">
                    <div className="hl-card-rating-block">
                      <div className="hl-stars">
                        {Array.from({length: 5}, (_, i) => (
                          <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />
                        ))}
                      </div>
                      <div className="hl-rating-badge-wrap">
                        <div className="hl-rating-text-col">
                          <span className="hl-rating-text">{hotel.ratingText}</span>
                          <small className="hl-reviews-count">{t('hotelsList.reviewsCountLabel').replace('{count}', String(hotel.reviews))}</small>
                        </div>
                        <span className="hl-score">{hotel.rating}</span>
                      </div>
                    </div>

                    <h2 className="hl-hotel-name">{hotel.name}</h2>
                    
                    <div className="hl-card-amenities">
                      {hotel.amenities.includes('breakfast') && (
                        <span className="hl-amenity-tag"><Coffee size={14} /> {t('hotelsList.cardAmenityFreeBreakfast')}</span>
                      )}
                      {hotel.amenities.includes('wifi') && (
                        <span className="hl-amenity-tag"><Wifi size={14} /> {t('hotelsList.cardAmenityFreeWifi')}</span>
                      )}
                    </div>

                    {hotel.freeCancel && (
                      <div className="hl-cancel-block">
                        <span className="hl-cancel-tag">{t('hotelsList.cardFreeCancellation')}</span>
                        <small>{t('hotelsList.cardBreakfastIncluded')}</small>
                        <small>{t('hotelsList.cardPriceForOneNight')}</small>
                      </div>
                    )}

                    <div className="hl-card-footer">
                      <div className="hl-price-col">
                        <strong className="hl-price-val">₹{hotel.price.toLocaleString('en-IN')}</strong>
                        <span className="hl-taxes-label">{t('hotelsList.cardTaxesLabel').replace('{amount}', String(hotel.taxes))}</span>
                      </div>
                      <button className="hl-details-btn" onClick={() => navigate(`/hotels/${hotel.id}`)}>{t('hotelsList.viewDetailsButton')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hl-show-more-wrap">
              <button className="hl-show-more-btn">{t('hotelsList.showMoreButton')}</button>
            </div>
          </main>

        </div>
      </div>

      {/* Feature Row Banner */}
      <section className="hl-feature-row">
        <div className="hl-feature-container">
          <div className="hl-feature-card">
            <Shield size={24} className="hl-feat-icon" />
            <div className="hl-feat-text">
              <h3>{t('hotelsList.featureBookConfidenceTitle')}</h3>
              <p>{t('hotelsList.featureBookConfidenceDesc')}</p>
            </div>
          </div>
          <div className="hl-feature-card">
            <RefreshCw size={24} className="hl-feat-icon" />
            <div className="hl-feat-text">
              <h3>{t('hotelsList.featureFlexibleCancellationsTitle')}</h3>
              <p>{t('hotelsList.featureFlexibleCancellationsDesc')}</p>
            </div>
          </div>
          <div className="hl-feature-card">
            <Tag size={24} className="hl-feat-icon" />
            <div className="hl-feat-text">
              <h3>{t('hotelsList.featurePriceGuaranteeTitle')}</h3>
              <p>{t('hotelsList.featurePriceGuaranteeDesc')}</p>
            </div>
          </div>
          <div className="hl-feature-card">
            <Headphones size={24} className="hl-feat-icon" />
            <div className="hl-feat-text">
              <h3>{t('hotelsList.featureSupportTitle')}</h3>
              <p>{t('hotelsList.featureSupportDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HotelsList;
