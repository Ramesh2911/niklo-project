import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { hotelService, type Hotel } from '../lib/hotelService';
import { packageService, type TravelPackage } from '../lib/packageService';
import { useWishlist } from '../hooks/useWishlist';
import {
  ArrowRightLeft, ChevronRight,
  ChevronDown, ArrowRight, Heart, MapPin, BadgePercent,
  Calendar
} from 'lucide-react';

import heroBg from '../assets/Group 127.png';
import heroBg2 from '../assets/hero-viewport.png';
import icon1 from '../assets/icon_1.png';
import icon2 from '../assets/icon_2.png';
import icon3 from '../assets/icon_3.png';
import busIcon from '../assets/NewIcons/bus.svg';
import cabIcon from '../assets/NewIcons/car.svg';
import hotelIcon from '../assets/NewIcons/hotel.svg';
import adventureIcon from '../assets/NewIcons/adventure.svg';
import packagesIcon from '../assets/NewIcons/package.svg';
import planYourTripAsset from '../assets/plan_your_trip_asset.jpg';
import appDownloadCtaImage from '../assets/app_download_cta_image.jpg';
import nikloLogoWhite from '../assets/niklo-logo-white.svg';
import image174 from '../assets/image_174.svg';
import image177 from '../assets/image_177.svg';
import image180 from '../assets/image_180.svg';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import LottiePlayer from '../components/LottiePlayer';
import LocationAutocompleteInput from '../components/LocationAutocompleteInput';
import chatbotAnimation from '../assets/lottie/chatbot-robot.json';

import './Home.css';

// Mock Destinations — use t() at render time
const DESTINATIONS = [
  { id: 1, nameKey: 'home.dest1Name', subtextKey: 'home.dest1Subtext', price: 3500, img: 'https://images.unsplash.com/photo-1706186839147-0d708602587b?auto=format&fit=crop&q=80&w=400', rating: 4.8 },
  { id: 2, nameKey: 'home.dest2Name', subtextKey: 'home.dest2Subtext', price: 4500, img: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=400', rating: 4.9 },
  { id: 3, nameKey: 'home.dest3Name', subtextKey: 'home.dest3Subtext', price: 4800, img: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=400', rating: 4.7 },
  { id: 4, nameKey: 'home.dest4Name', subtextKey: 'home.dest4Subtext', price: 4200, img: 'https://images.unsplash.com/photo-1524230507669-5ff97982bb5e?auto=format&fit=crop&q=80&w=400', rating: 4.8 },
];

// Mock Offers — use t() at render time
const OFFERS = [
  { id: 1, titleKey: 'home.offer1Title', dateKey: 'home.offer1Date', codeKey: 'home.offer1Code', bgColor: '#e0f2fe', textColor: '#0052ff', badgeColor: '#0052ff', img: image174 },
  { id: 2, titleKey: 'home.offer2Title', descKey: 'home.offer2Desc', dateKey: 'home.offer2Date', codeKey: 'home.offer2Code', bgColor: '#e8ecf4', textColor: '#0f172a', badgeColor: '#0f172a', img: image180 },
  { id: 3, titleKey: 'home.offer3Title', dateKey: 'home.offer3Date', codeKey: 'home.offer3Code', bgColor: '#fffbeb', textColor: '#c2410c', badgeColor: '#7c2d12', img: image177 },
];


// Deterministic QR-code-styled placeholder (not scannable, purely decorative
// to match the design's app-download QR graphic instead of a plain dot texture).
// ponytail: fixed-seed pseudo pattern instead of a real QR encoder lib for one decorative image.
const QR_PLACEHOLDER = (() => {
  const size = 21;
  const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFinder = (r: number, c: number) => (
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
  );
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const onCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r0 + r][c0 + c] = onBorder || onCore;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);
  let seed = 42;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFinder(r, c)) cells[r][c] = rand() > 0.55;
    }
  }
  const cellPx = 6;
  const rects = cells.flatMap((row, r) => row.map((on, c) => (on ? `<rect x="${c * cellPx}" y="${r * cellPx}" width="${cellPx}" height="${cellPx}"/>` : ''))).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size * cellPx} ${size * cellPx}" fill="#0f172a">${rects}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();

// ponytail: one shared placeholder + onError handler for Home.tsx's remote/unsplash
// <img> tags, instead of a bespoke fallback per tag — client reported "images
// unavailable" and this degrades a broken remote image to a neutral tile instead
// of the browser's broken-image icon.
const IMG_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e2e8f0"/></svg>'
)}`;
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = IMG_FALLBACK;
};

// package-service's travel_packages entity has no image column, so the card art
// is picked by keyword from the real title instead of a fabricated per-package URL.
const suggestionImageFor = (title: string): string => {
  const lower = title.toLowerCase();
  if (/goa|beach|coast/.test(lower)) return 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=400';
  if (/kashmir|manali|himachal|snow|hill/.test(lower)) return 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&q=80&w=400';
  if (/kerala|backwater/.test(lower)) return 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=400';
  if (/rajasthan|jaipur|palace/.test(lower)) return 'https://images.unsplash.com/photo-1524230507669-5ff97982bb5e?auto=format&fit=crop&q=80&w=400';
  return 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=400';
};

// FAQ — use t() at render time
const FAQ_AND_TIPS = [
  { qKey: 'home.faq1Question', aKey: 'home.faq1Answer' },
  { qKey: 'home.faq2Question', aKey: 'home.faq2Answer' },
  { qKey: 'home.faq3Question', aKey: 'home.faq3Answer' },
  { qKey: 'home.faq4Question', aKey: 'home.faq4Answer' },
  { qKey: 'home.faq5Question', aKey: 'home.faq5Answer' },
  { qKey: 'home.faq6Question', aKey: 'home.faq6Answer' },
  { qKey: 'home.faq7Question', aKey: 'home.faq7Answer' },
];
const FAQ_AND_TIPS_PREVIEW_COUNT = 4;

const SEARCH_TABS = [
  { id: 'Bus', labelKey: 'nav.buses', icon: busIcon },
  { id: 'Hotels', labelKey: 'nav.hotels', icon: hotelIcon },
  { id: 'Cabs', labelKey: 'nav.cabs', icon: cabIcon },
  { id: 'Packages', labelKey: 'nav.packages', icon: packagesIcon },
  { id: 'Outdoor', labelKey: 'nav.adventures', icon: adventureIcon },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [leavingFrom, setLeavingFrom] = useState('Kolkata');
  const [goingTo, setGoingTo] = useState('Siliguri');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [activePill, setActivePill] = useState('Bus');
  const [journeyDate, setJourneyDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [destination, setDestination] = useState('Kolkata');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<TravelPackage[]>([]);
  const packagesWishlist = useWishlist('package');
  const hotelsWishlist = useWishlist('hotel');
  const [heroSlide, setHeroSlide] = useState(0);
  const heroSlides = [heroBg2, heroBg];

  useEffect(() => {
    hotelService.getTrending().then(setHotels).catch(() => {});
    packageService.getTrending(4).then(setSmartSuggestions).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHeroSlide((i) => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(id);
  }, [heroSlides.length]);

  const swapLocations = () => {
    const temp = leavingFrom;
    setLeavingFrom(goingTo);
    setGoingTo(temp);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activePill === 'Cabs') {
      navigate(`/cabs?from=${encodeURIComponent(leavingFrom)}&to=${encodeURIComponent(goingTo)}`);
    } else if (activePill === 'Hotels') {
      navigate(`/hotels/search?destination=${encodeURIComponent(destination)}&checkIn=${journeyDate}&checkOut=${checkOutDate}`);
    } else if (activePill === 'Outdoor') {
      navigate(`/experiences/search?location=${encodeURIComponent(destination)}&date=${journeyDate}`);
    } else if (activePill === 'Packages') {
      navigate(`/packages/search?destination=${encodeURIComponent(destination)}&date=${journeyDate}`);
    } else {
      navigate(`/buses?from=${encodeURIComponent(leavingFrom)}&to=${encodeURIComponent(goingTo)}&date=${journeyDate}`);
    }
  };

  const isPointToPoint = activePill === 'Bus' || activePill === 'Cabs';
  const isHotels = activePill === 'Hotels';

  const toggleFaq = (index: number) => {
    if (activeFaq === index) {
      setActiveFaq(null);
    } else {
      setActiveFaq(index);
    }
  };

  const handleAiPlannerClick = () => {
    navigate('/ai-planner');
  };

  return (
    <div className="home-container">
      {/* 1. Header - Unified navbar */}
      <Navbar theme="blue" />

      {/* 2. Hero Section */}
      <section className="hero-section">
        {heroSlides.map((src, i) => (
          <div
            key={src}
            className={`hero-bg-slide ${i === heroSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url("${src}")` }}
          />
        ))}
      </section>

      {/* 3. Floating Search Panel — tabs on top, From/To/Date fields below */}
      <div className="floating-search-card" id="main-content">
        <div className="search-tabs-row">
          {SEARCH_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`search-tab ${activePill === tab.id ? 'active' : ''}`}
              onClick={() => setActivePill(tab.id)}
            >
              <img src={tab.icon} alt="" className="search-tab-icon" />
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          {isPointToPoint ? (
            /* Leaving From / Going To — wrapped together so the swap button can be
               centered between them with one absolute-position rule that works
               whether they sit side-by-side (desktop) or stacked (mobile). */
            <div className="search-locations-wrapper">
              <div className="search-input-field-group">
                <div className="field-text">
                  <span className="field-label">{t('home.fieldFrom')}</span>
                  <LocationAutocompleteInput
                    value={leavingFrom}
                    onChange={setLeavingFrom}
                    onSelect={(s) => setLeavingFrom(s.label.split(',')[0])}
                    placeholder={t('home.searchFrom')}
                    required
                  />
                </div>
              </div>

              <div className="search-input-field-group">
                <div className="field-text">
                  <span className="field-label">{t('home.fieldTo')}</span>
                  <LocationAutocompleteInput
                    value={goingTo}
                    onChange={setGoingTo}
                    onSelect={(s) => setGoingTo(s.label.split(',')[0])}
                    placeholder={t('home.searchTo')}
                    required
                  />
                </div>
              </div>

              <button type="button" className="swap-locations-btn" onClick={swapLocations} aria-label="Swap from and to locations">
                <ArrowRightLeft size={16} style={{ color: '#64748b' }} />
              </button>
            </div>
          ) : (
            /* Hotels / Packages / Adventures search by a single destination, not a route. */
            <div className="search-input-field-group">
              <div className="field-text">
                <span className="field-label">{t('home.fieldDestination')}</span>
                <LocationAutocompleteInput
                  value={destination}
                  onChange={setDestination}
                  onSelect={(s) => setDestination(s.label.split(',')[0])}
                  placeholder={t('home.searchTo')}
                  required
                />
              </div>
            </div>
          )}

          {isHotels ? (
            <div className="hotel-dates-wrapper">
              <div className="search-input-field-group date-field-group">
                <Calendar size={18} style={{ color: '#64748b' }} />
                <div className="field-text">
                  <span className="field-label">{t('home.checkIn')}</span>
                  <input
                    type="date"
                    className="date-field-input"
                    value={journeyDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setJourneyDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="search-input-field-group date-field-group">
                <Calendar size={18} style={{ color: '#64748b' }} />
                <div className="field-text">
                  <span className="field-label">{t('home.checkOut')}</span>
                  <input
                    type="date"
                    className="date-field-input"
                    value={checkOutDate}
                    min={journeyDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="search-input-field-group date-field-group">
              <Calendar size={18} style={{ color: '#64748b' }} />
              <div className="field-text">
                <span className="field-label">{t('home.journeyDate')}</span>
                <input
                  type="date"
                  className="date-field-input"
                  value={journeyDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setJourneyDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Search Button */}
          <button type="submit" className="btn-hero-search">
     
            {t('home.searchBtn')}
          </button>

        </form>
      </div>

      {/* Trust badges */}
      <div className="trust-badges-row">
        <div className="trust-badges-inner">
          <div className="trust-badge">
            <img src={icon1} alt="" className="trust-badge-icon" />
            <div className="trust-badge-text">
              <h3>{t('home.badgeBestPrice')}</h3>
              <p>{t('home.badgeBestPriceDesc')}</p>
            </div>
          </div>
          <div className="trust-badge">
            <img src={icon2} alt="" className="trust-badge-icon" />
            <div className="trust-badge-text">
              <h3>{t('home.badgeSecure')}</h3>
              <p>{t('home.badgeSecureDesc')}</p>
            </div>
          </div>
          <div className="trust-badge">
            <img src={icon3} alt="" className="trust-badge-icon" />
            <div className="trust-badge-text">
              <h3>{t('home.badgeSupport')}</h3>
              <p>{t('home.badgeSupportDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Explore Options */}
      <div className="section-wrapper">
        <div className="section-header-row">
          <h2 className="section-main-title">{t('home.exploreTitle')}</h2>
        </div>

        <div className="travel-options-grid">
          <div className="option-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/buses')}>
            <div className="option-icon-box">
              <img src={busIcon} className="option-icon-img option-bus-icon" alt="Bus Booking" />
            </div>
            <h3 className="option-title">{t('home.exploreBusTitle')}</h3>
            <p className="option-desc">{t('home.exploreBusDesc')}</p>
            <span className="option-link">{t('home.findRoutes')}</span>
          </div>

          <div className="option-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/cabs')}>
            <div className="option-icon-box">
              <img src={cabIcon} className="option-icon-img option-car-icon" alt="Car Rides" />
            </div>
            <h3 className="option-title">{t('home.exploreCarTitle')}</h3>
            <p className="option-desc">{t('home.exploreCarDesc')}</p>
            <span className="option-link">{t('home.findRoutes')}</span>
          </div>

          <div className="option-card">
            <div className="option-icon-box">
              <img src={hotelIcon} className="option-icon-img" alt="Hotels" />
            </div>
            <h3 className="option-title">{t('home.exploreHotelTitle')}</h3>
            <p className="option-desc">{t('home.exploreHotelDesc')}</p>
            <a href="/hotels" className="option-link" onClick={(e) => { e.preventDefault(); navigate('/hotels'); }}>
              {t('home.findRoutes')}
            </a>
          </div>

          <div className="option-card">
            <div className="option-icon-box">
              <img src={adventureIcon} className="option-icon-img" alt="Adventure" />
            </div>
            <h3 className="option-title">{t('home.exploreAdventureTitle')}</h3>
            <p className="option-desc">{t('home.exploreAdventureDesc')}</p>
            <a href="/experiences" className="option-link" onClick={(e) => { e.preventDefault(); navigate('/experiences'); }}>
              {t('home.findRoutes')}
            </a>
          </div>
        </div>
      </div>

      {/* 5. AI Banner */}
      <div className="section-wrapper">
        <div className="ai-planner-banner">
          <div className="ai-banner-left">
            <h2 className="ai-banner-title">
              {t('home.aiBannerTitle')} <span className="badge-new-tag">{t('home.aiBannerNew')}</span>
            </h2>
            <p className="ai-banner-desc">
              {t('home.aiBannerDesc')}
            </p>
            <button className="btn-plan-journey" onClick={handleAiPlannerClick}>
              {t('home.planMyJourney')}
              <ArrowRight size={18} />
            </button>
          </div>
          
          <div className="ai-banner-right">
            <img src={planYourTripAsset} alt="Plan your trip banner" className="ai-banner-right-img" />
          </div>
        </div>
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div className="section-wrapper">
          <div className="section-header-row">
            <h2 className="section-main-title">{t('home.smartSuggestions')}</h2>
            <a href="#" className="section-view-all" onClick={(e) => { e.preventDefault(); navigate('/packages'); }}>
              {t('home.viewAll')}
              <ChevronRight size={16} />
            </a>
          </div>

          <div className="travel-cards-grid">
            {smartSuggestions.map((pkg) => (
              <div key={pkg.id} className="escape-card">
                <div className="card-img-box">
                  <img loading="lazy" src={suggestionImageFor(pkg.title)} alt={pkg.title} className="card-img" onError={handleImgError} />
                </div>
                <div className="card-body">
                  <div className="card-top-row">
                    <div className="card-title-group">
                      <h3 className="card-name">{pkg.title}</h3>
                      <p className="card-subtext">{pkg.duration}</p>
                    </div>
                    <button
                      className="btn-card-like"
                      aria-label={packagesWishlist.isSaved(pkg.id) ? t('home.wishlistRemove') : t('home.wishlistAdd')}
                      onClick={() => packagesWishlist.toggle(pkg.id, { name: pkg.title, image: suggestionImageFor(pkg.title), price: pkg.price })}
                    >
                      <Heart size={16} fill={packagesWishlist.isSaved(pkg.id) ? '#ef4444' : 'none'} color={packagesWishlist.isSaved(pkg.id) ? '#ef4444' : 'currentColor'} />
                    </button>
                  </div>
                  <div className="card-bottom-row">
                    <div className="card-price-block">
                      <span className="card-price-amount">{pkg.price}</span>
                      <span className="card-price-per">{t('home.perPerson')}</span>
                    </div>
                      <button className="btn-card-action" onClick={() => navigate(`/packages/${pkg.id}`)}>{t('home.bookNow')}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Discover Escape */}
      <div className="section-wrapper">
        <div className="section-header-row">
          <h2 className="section-main-title">{t('home.discoverTitle')}</h2>
          <a href="#" className="section-view-all" onClick={(e) => { e.preventDefault(); navigate('/packages'); }}>
            {t('home.viewAll')}
            <ChevronRight size={16} />
          </a>
        </div>

        <div className="travel-cards-grid">
          {DESTINATIONS.map((item) => (
            <div key={item.id} className="escape-card">
              <div className="card-img-box">
                <img loading="lazy" src={item.img} alt={t(item.nameKey)} className="card-img" onError={handleImgError} />
              </div>
              <div className="card-body">
                <div className="card-top-row">
                  <div className="card-title-group">
                    <h3 className="card-name">{t(item.nameKey)}</h3>
                    <p className="card-subtext">{t(item.subtextKey)}</p>
                  </div>
                  <button
                    className="btn-card-like"
                    aria-label={packagesWishlist.isSaved(String(item.id)) ? t('home.wishlistRemove') : t('home.wishlistAdd')}
                    onClick={() => packagesWishlist.toggle(String(item.id), { name: t(item.nameKey), image: item.img, price: item.price })}
                  >
                    <Heart size={16} fill={packagesWishlist.isSaved(String(item.id)) ? '#ef4444' : 'none'} color={packagesWishlist.isSaved(String(item.id)) ? '#ef4444' : 'currentColor'} />
                  </button>
                </div>
                <div className="card-bottom-row">
                  <div className="card-price-block">
                    <span className="card-price-amount">₹{item.price.toLocaleString('en-IN')}</span>
                    <span className="card-price-per">/ person</span>
                  </div>
                    <button className="btn-card-action" onClick={() => navigate(`/packages?destination=${encodeURIComponent(t(item.nameKey))}`)}>{t('home.bookNow')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Offers Section */}
      <div className="section-wrapper">
        <div className="section-header-row">
          <h2 className="section-main-title">{t('home.bestOffers')}</h2>
          <div className="section-header-actions">
            <a href="/offers" className="section-view-all" onClick={(e) => { e.preventDefault(); navigate('/offers'); }}>
              {t('home.offersViewAll')}
              <ChevronRight size={16} />
            </a>
          
          </div>
        </div>

        <div className="offers-carousel-row">
          {OFFERS.map((item) => (
            <div 
              key={item.id} 
              className="offer-card" 
              style={{ backgroundColor: item.bgColor }}
            >
              <div className="offer-left-section">
                <h3 className="offer-title" style={{ color: item.textColor }}>{t(item.titleKey)}</h3>

                <div className="offer-details">
                  {item.descKey && <p className="offer-card-desc">{t(item.descKey)}</p>}
                  <p className="offer-card-date">{t(item.dateKey)}</p>
                </div>

                <div className="offer-code-dashed" style={{ color: item.textColor }}>
                  {t(item.codeKey)}
                </div>
              </div>
              
              <div className="offer-right-section">
                <span className="offer-badge-pill" style={{ color: item.textColor }}>
                  <BadgePercent size={20} className="badge-percent-icon" style={{ color: '#fff', fill: item.badgeColor }} />
                  {t('home.offerBadge')}
                </span>
                <div className="offer-illust-container">
                  <img loading="lazy" src={item.img} className="offer-illust-img" alt="Offer illustration" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Top Hotels */}
      <div className="section-wrapper">
        <div className="section-header-row">
          <h2 className="section-main-title">{t('home.hotelsTitle')}</h2>
          <a href="/hotels" className="section-view-all" onClick={(e) => { e.preventDefault(); navigate('/hotels'); }}>
            {t('home.viewAll')}
            <ChevronRight size={16} />
          </a>
        </div>

        <div className="travel-cards-grid">
          {hotels.map((item, idx) => (
            <div key={item.id ?? idx} className="escape-card">
              <div className="card-img-box">
                <img loading="lazy" src={item.img} alt={item.name} className="card-img" onError={handleImgError} />
              </div>
              <div className="card-body">
                <div className="card-top-row">
                  <div className="card-title-group">
                    <h3 className="card-name">{item.name}</h3>
                    <p className="card-subtext">{item.subtext}</p>
                  </div>
                  <button
                    className="btn-card-like"
                    aria-label={hotelsWishlist.isSaved(item.id) ? t('home.wishlistRemove') : t('home.wishlistAdd')}
                    onClick={() => hotelsWishlist.toggle(item.id, { name: item.name, image: item.img, price: item.price, location: item.location })}
                  >
                    <Heart size={16} fill={hotelsWishlist.isSaved(item.id) ? '#ef4444' : 'none'} color={hotelsWishlist.isSaved(item.id) ? '#ef4444' : 'currentColor'} />
                  </button>
                </div>
                {item.location && (
                  <div className="card-location-row">
                    <MapPin size={13} />
                    <span>{item.location}</span>
                  </div>
                )}
                <div className="card-bottom-row">
                  <div className="card-price-block">
                    <span className="card-price-amount">₹{item.price.toLocaleString('en-IN')}</span>
                    <span className="card-price-per">{t('home.perNight')}</span>
                  </div>
                  <button className="btn-card-action" onClick={() => navigate(`/hotels/${item.id}`)}>{t('home.bookNow')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 9. App Download Banner */}
      <div className="section-wrapper">
        <div 
          className="app-download-banner" 
          style={{ backgroundImage: `url("${appDownloadCtaImage}")` }}
        >
          <div className="app-banner-left">
            <img src={nikloLogoWhite} alt="Niklo" className="app-banner-logo" />
            <h2 className="app-banner-title">{t('home.appBannerTitle')}</h2>
            <p>{t('home.appBannerDesc')}</p>
          </div>

          <div className="app-banner-right">
            <div className="app-store-badges">
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play Store" className="badge-store-img" onError={handleImgError} />
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="badge-store-img" onError={handleImgError} />
            </div>
            <div className="app-qr-container">
              <img src={QR_PLACEHOLDER} alt="Scan to download the Niklo app" className="app-qr-img" />
            </div>
          </div>
        </div>
      </div>

      {/* 10. FAQs (merged with Travel Tips into one combined accordion section, per client request) */}
      <div className="faq-container">
        <h2 className="faq-title">{t('home.faqTitle')}</h2>

        <div className="faq-list">
          {(showAllFaqs ? FAQ_AND_TIPS : FAQ_AND_TIPS.slice(0, FAQ_AND_TIPS_PREVIEW_COUNT)).map((item, idx) => (
            <div key={idx} className={`faq-item ${activeFaq === idx ? 'active' : ''}`}>
              <button className="faq-question-btn" onClick={() => toggleFaq(idx)}>
                <span>{t(item.qKey)}</span>
                <ChevronDown size={18} className={`faq-chevron ${activeFaq === idx ? 'open' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="faq-answer fade-in">
                  <p>{t(item.aKey)}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {!showAllFaqs && FAQ_AND_TIPS.length > FAQ_AND_TIPS_PREVIEW_COUNT && (
          <button className="faq-view-more-btn" onClick={() => setShowAllFaqs(true)}>
            {t('home.faqViewMore')}
          </button>
        )}
      </div>

      {/* 11. Footer */}
      <Footer />

      {/* Floating AI Planner chatbot button */}
      <LottiePlayer
        animationData={chatbotAnimation}
        className="floating-ai-planner"
        onClick={handleAiPlannerClick}
        ariaLabel="Open AI Journey Planner"
      />
    </div>
  );
};

export default Home;
