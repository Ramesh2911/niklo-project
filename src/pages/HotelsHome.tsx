import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hotelService, type Hotel, type PopularDestination, type StayType, type HotelPromotion, type LocationSuggestion } from '../lib/hotelService';
import { useWishlist } from '../hooks/useWishlist';
import {
  MapPin, Calendar, Users, Star, Heart, CheckCircle,
  DollarSign, Car, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import hotelsHeroImg from '../assets/hotel_booking.png';
import hotelOfferBannerImg from '../assets/hotel_offer_banner.png';
import tyHotel from '../assets/ty_hotel.png';
import tyResorts from '../assets/ty_resorts.png';
import tyVillas from '../assets/ty_villas.png';
import tyApartments from '../assets/ty_apartments.png';
import tyHomestays from '../assets/ty_homestays.png';
import { useI18n } from '../contexts/I18nContext';
import './HotelsHome.css';

const HotelsHome: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  // Categories
  const CATEGORIES = [
    { id: 'hotels', label: t('hotelsHome.categoryHotels'), img: tyHotel },
    { id: 'resorts', label: t('hotelsHome.categoryResorts'), img: tyResorts },
    { id: 'villas', label: t('hotelsHome.categoryVillas'), img: tyVillas },
    { id: 'apartments', label: t('hotelsHome.categoryApartments'), img: tyApartments },
    { id: 'homestays', label: t('hotelsHome.categoryHomestays'), img: tyHomestays }
  ];

  const [destination, setDestination] = useState('');
  const [destSuggestions, setDestSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const todayIso = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(todayIso);
  const [checkOut, setCheckOut] = useState(todayIso);
  const [guests, setGuests] = useState({ adults: 2, rooms: 1 });
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [trendingHotels, setTrendingHotels] = useState<Hotel[]>([]);
  const [destinations, setDestinations] = useState<PopularDestination[]>([]);
  const [stayTypes, setStayTypes] = useState<StayType[]>([]);
  const [promotion, setPromotion] = useState<HotelPromotion | null>(null);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [discountClaimed, setDiscountClaimed] = useState(false);
  const [activeCategory, setActiveCategory] = useState('hotels');
  const hotelsWishlist = useWishlist('hotel');

  useEffect(() => {
    hotelService.getTrending().then(setTrendingHotels).catch(() => {});
    hotelService.getPopularDestinations().then(setDestinations).catch(() => {});
    hotelService.getStayTypes().then(setStayTypes).catch(() => {});
    hotelService.getActivePromotion().then(setPromotion).catch(() => {});
  }, []);

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
    navigate(`/hotels/search?destination=${encodeURIComponent(name)}`);
  };

  const handleGuestChange = (type: 'adults' | 'rooms', op: 'add' | 'sub') => {
    setGuests(prev => {
      const newVal = op === 'add' ? prev[type] + 1 : Math.max(1, prev[type] - 1);
      return { ...prev, [type]: newVal };
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/hotels/search');
  };

  return (
    <div className="hotels-home-page" onClick={() => { setShowGuestPicker(false); }}>
      <Navbar theme="blue" />

      {/* Hero Section */}
      <section className="hotels-hero" style={{ backgroundImage: `url('${hotelsHeroImg}')` }}>
        <div className="hotels-hero-overlay"></div>
        <div className="hotels-hero-content">
          <h1>{t('hotelsHome.heroHeading')}</h1>
          <p>{t('hotelsHome.heroSubheading')}</p>
        </div>
      </section>

      {/* Floating Search Bar */}
      <div className="hotels-search-container">
        <form className="hotels-search-bar" onSubmit={handleSearch}>
          <div className="hotels-search-field relative" onClick={e => e.stopPropagation()}>
            <label className="hotels-label">{t('hotelsHome.searchLabelDestination')}</label>
            <div className="hotels-value-row">
              <MapPin size={18} className="hotels-icon" />
              <input
                type="text"
                placeholder={t('hotelsHome.searchPlaceholderDestination')}
                value={destination}
                onChange={e => setDestination(e.target.value)}
                onFocus={() => setShowDestSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDestSuggestions(false), 150)}
                autoComplete="off"
                className="hotels-input"
              />
            </div>
            {showDestSuggestions && destSuggestions.length > 0 && (
              <div className="hotels-suggest-dropdown">
                {destSuggestions.map((s, idx) => (
                  <div
                    key={`${s.name}-${idx}`}
                    className="hotels-suggest-item"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => selectDestination(s.name)}
                  >
                    <MapPin size={14} className="hotels-suggest-icon" />
                    <span>{s.name}</span>
                    {s.region && <span className="hotels-suggest-region">{s.region}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hotels-search-field">
            <label className="hotels-label">{t('hotelsHome.searchLabelCheckIn')}</label>
            <div className="hotels-value-row">
              <Calendar size={18} className="hotels-icon" />
              <input
                type="date"
                value={checkIn}
                min={todayIso}
                onChange={e => setCheckIn(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="hotels-search-field">
            <label className="hotels-label">{t('hotelsHome.searchLabelCheckOut')}</label>
            <div className="hotels-value-row">
              <Calendar size={18} className="hotels-icon" />
              <input
                type="date"
                value={checkOut}
                min={checkIn || todayIso}
                onChange={e => setCheckOut(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="hotels-search-field relative" onClick={e => { e.stopPropagation(); setShowGuestPicker(!showGuestPicker); }}>
            <label className="hotels-label">{t('hotelsHome.searchLabelGuests')}</label>
            <div className="hotels-value-row">
              <Users size={18} className="hotels-icon" />
              <span className="hotels-text-val">{t('hotelsHome.guestsSummary').replace('{adults}', String(guests.adults)).replace('{rooms}', String(guests.rooms))}</span>
            </div>
            {showGuestPicker && (
              <div className="custom-guest-popover" onClick={e => e.stopPropagation()}>
                <div className="guest-row">
                  <div className="guest-info"><span>{t('hotelsHome.guestPickerRooms')}</span></div>
                  <div className="guest-controls">
                    <button type="button" onClick={() => handleGuestChange('rooms', 'sub')}>-</button>
                    <span>{guests.rooms}</span>
                    <button type="button" onClick={() => handleGuestChange('rooms', 'add')}>+</button>
                  </div>
                </div>
                <div className="guest-row">
                  <div className="guest-info"><span>{t('hotelsHome.guestPickerAdults')}</span><small>{t('hotelsHome.guestPickerAgeNote')}</small></div>
                  <div className="guest-controls">
                    <button type="button" onClick={() => handleGuestChange('adults', 'sub')}>-</button>
                    <span>{guests.adults}</span>
                    <button type="button" onClick={() => handleGuestChange('adults', 'add')}>+</button>
                  </div>
                </div>
                <button type="button" className="guest-done-btn" onClick={() => setShowGuestPicker(false)}>{t('hotelsHome.guestPickerDone')}</button>
              </div>
            )}
          </div>

          <button type="submit" className="hotels-search-btn">{t('hotelsHome.searchButton')}</button>
        </form>
      </div>

      {/* Main Content */}
      <main className="hotels-main-content">
        <div className="hotels-container">
          
          {/* Popular Destinations */}
          <section className="hotels-section">
            <div className="hotels-section-header">
              <div>
                <h2>{t('hotelsHome.popularDestinationsHeading')}</h2>
                <p className="hotels-section-sub">{t('hotelsHome.popularDestinationsSub')}</p>
              </div>
              <a href="#explore" className="hotels-view-all" onClick={e => e.preventDefault()}>{t('hotelsHome.popularDestinationsExploreAll')}</a>
            </div>
            
            <div className="hotels-dest-grid">
              {destinations.map(dest => (
                <div
                  key={dest.id}
                  className="hotels-dest-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/hotels/search?destination=${encodeURIComponent(dest.name)}`)}
                >
                  <img src={dest.img} alt={dest.name} className="hotels-dest-img" />
                  <div className="hotels-dest-overlay"></div>
                  <div className="hotels-dest-info">
                    <h3>{dest.name}</h3>
                    <span>{dest.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Browse by Stay Type */}
          {stayTypes.length > 0 && (
            <section className="hotels-section">
              <div className="hotels-section-header">
                <div>
                  <h2>{t('hotelsHome.browseByStayTypeHeading')}</h2>
                  <p className="hotels-section-sub">{t('hotelsHome.browseByStayTypeSub')}</p>
                </div>
              </div>

              <div className="hotels-stay-type-grid">
                {stayTypes.map(st => (
                  <div
                    key={st.id}
                    className="hotels-stay-type-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/hotels/search?type=${encodeURIComponent(st.label.toLowerCase().replace(/\s+/g, '-'))}`)}
                  >
                    <img src={st.img} alt={st.label} className="hotels-stay-type-img" />
                    <div className="hotels-stay-type-overlay"></div>
                    <span className="hotels-stay-type-label">{st.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Categories / Filter Pills */}
          <div className="hotels-categories-wrapper">
            <div className="hotels-categories-grid">
              {CATEGORIES.map(cat => (
                <div
                  key={cat.id}
                  className={`hotels-category-card${activeCategory === cat.id ? ' active' : ''}`}
                  onClick={() => { setActiveCategory(cat.id); navigate('/hotels/search'); }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="hotels-cat-icon-wrap">
                    <img src={cat.img} alt="" className="hotels-cat-emoji" />
                  </div>
                  <span className="hotels-cat-label">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Why Book With Niklo */}
          <section className="hotels-why-section">
            <h2 className="why-title">{t('hotelsHome.whyBookHeading')}</h2>
            <div className="why-grid">
              <div className="why-card">
                <div className="why-icon-wrap blue-bg">
                  <CheckCircle size={24} className="why-icon" />
                </div>
                <h3>{t('hotelsHome.whyVerifiedTitle')}</h3>
                <p>{t('hotelsHome.whyVerifiedDesc')}</p>
              </div>
              <div className="why-card">
                <div className="why-icon-wrap blue-bg">
                  <DollarSign size={24} className="why-icon" />
                </div>
                <h3>{t('hotelsHome.whyPriceTitle')}</h3>
                <p>{t('hotelsHome.whyPriceDesc')}</p>
              </div>
              <div className="why-card">
                <div className="why-icon-wrap blue-bg">
                  <Car size={24} className="why-icon" />
                </div>
                <h3>{t('hotelsHome.whyCabTitle')}</h3>
                <p>{t('hotelsHome.whyCabDesc')}</p>
              </div>
            </div>
          </section>

          {/* Trending Hotels */}
          <section className="hotels-section">
            <div className="hotels-section-header">
              <div>
                <h2>{t('hotelsHome.trendingHeading')}</h2>
                <p className="hotels-section-sub">{t('hotelsHome.trendingSub')}</p>
              </div>
            </div>

            <div className="hotels-trending-grid">
              {trendingHotels.map((hotel, idx) => (
                <div key={hotel.id ?? idx} className="hotels-trend-card">
                  <div className="hotels-trend-img-wrap">
                    <img loading="lazy" src={hotel.img} alt={hotel.name} className="hotels-trend-img" />
                    <button
                      className="hotels-like-btn"
                      aria-label={hotelsWishlist.isSaved(hotel.id) ? `Remove ${hotel.name} from wishlist` : `Save ${hotel.name}`}
                      onClick={() => hotelsWishlist.toggle(hotel.id, { name: hotel.name, image: hotel.img, price: hotel.price, location: hotel.subtext })}
                    >
                      <Heart size={16} fill={hotelsWishlist.isSaved(hotel.id) ? '#ef4444' : 'none'} color={hotelsWishlist.isSaved(hotel.id) ? '#ef4444' : 'currentColor'} />
                    </button>
                  </div>
                  <div className="hotels-trend-body">
                    <h3>{hotel.name}</h3>
                    <div className="hotels-trend-rating">
                      <Star size={14} fill="#fbbf24" color="#fbbf24" />
                      <span>{hotel.rating}</span> • <span className="hotels-loc">{hotel.subtext}</span>
                    </div>
                    <div className="hotels-trend-footer">
                      <div className="hotels-trend-price">
                        <span className="starts-label">{t('hotelsHome.trendingStartsFrom')}</span>
                        <span className="price-val">₹{hotel.price.toLocaleString('en-IN')}<span>{t('hotelsHome.trendingPerNight')}</span></span>
                      </div>
                      <button
                        className="hotels-view-details-btn"
                        onClick={() => navigate(`/hotels/${hotel.id}`)}
                      >
                        {t('hotelsHome.trendingViewDetails')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Promotional Banner */}
          {!promoDismissed && (
            <section
              className="hotels-promo-section"
              style={{ backgroundImage: `url('${promotion?.imagePath || hotelOfferBannerImg}')` }}
            >
              <div className="hotels-promo-overlay"></div>
              <button
                className="hotels-promo-dismiss"
                aria-label={t('hotelsHome.dismissOfferAriaLabel')}
                onClick={() => setPromoDismissed(true)}
              >
                <X size={18} />
              </button>
              <div className="hotels-promo-content">
                <span className="promo-badge">
                  {promotion?.discountPercent ? `${promotion.discountPercent}% OFF` : t('hotelsHome.promoBadge')}
                </span>
                <h2>{promotion?.title || t('hotelsHome.promoHeading')}</h2>
                <p>{promotion?.description || t('hotelsHome.promoDesc')}</p>
                {discountClaimed ? (
                  <p className="hotels-promo-claimed">
                    {(() => {
                      const [before, after] = t('hotelsHome.promoClaimedMessage').split('HOTEL35');
                      return <>{before}<strong>HOTEL35</strong>{after}</>;
                    })()}
                  </p>
                ) : (
                  <div className="hotels-promo-actions">
                    <button
                      className="hotels-promo-btn"
                      onClick={() => promotion?.hotelId ? navigate(`/hotels/${promotion.hotelId}`) : setDiscountClaimed(true)}
                    >
                      {promotion ? promotion.cta : t('hotelsHome.promoClaimButton')}
                    </button>
                    <a href="#offers" className="hotels-promo-link" onClick={e => e.preventDefault()}>{t('hotelsHome.promoViewAllOffers')}</a>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HotelsHome;
