import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageService, type TravelPackage } from '../lib/packageService';
import {
  Calendar, Users, Filter, Clock, Wallet, LayoutGrid, User,
  CheckCircle2, RefreshCw, ChevronRight, Heart
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWishlist } from '../hooks/useWishlist';
import { useI18n } from '../contexts/I18nContext';
import './PackagesHome.css';

import packagesHeroImg from '../assets/package_hero.png';
import beachHolidayImg from '../assets/beach_holiday.png';
import mountainEscapeImg from '../assets/mountain_escape.png';
import honeymoonImg from '../assets/honeymoon.png';
import familyTripImg from '../assets/family_trip.png';
import spiritualImg from '../assets/spiritual.png';

const styleIcons = [beachHolidayImg, mountainEscapeImg, honeymoonImg, familyTripImg, spiritualImg];


const PackagesHome: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const packagesWishlist = useWishlist('package');
  const [from, setFrom] = useState('Kolkata');
  const [to, setTo] = useState('Gangtok');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [guests, setGuests] = useState({ rooms: 1, adults: 2, children: 0 });
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [trendingPackages, setTrendingPackages] = useState<TravelPackage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeSort, setActiveSort] = useState<'All' | 'Duration' | 'Budget'>('All');

  const popularDestinations = trendingPackages.slice(0, 6).map((pkg) => ({
    name: pkg.title.split(/[-–—]/)[0].trim() || pkg.title,
    img: pkg.img,
  }));

  const travelStyles = categories.slice(0, 5).map((category, index) => ({
    name: category,
    icon: styleIcons[index % styleIcons.length],
    key: `travelStyle${index}`,
  }));

  useEffect(() => {
    packageService.getTrending().then(setTrendingPackages).catch(() => {});
    packageService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleGuestChange = (type: 'rooms' | 'adults' | 'children', op: 'add' | 'sub') => {
    setGuests(prev => {
      const newVal = op === 'add' ? prev[type] + 1 : Math.max(0, prev[type] - 1);
      if (type === 'rooms' && newVal < 1) return prev;
      if (type === 'adults' && newVal < 1) return prev;
      return { ...prev, [type]: newVal };
    });
  };

  const getGuestsString = () => {
    const totalGuests = guests.adults + guests.children;
    const guestsPart = (totalGuests > 1 ? t('packagesHome.guestsPlural') : t('packagesHome.guestsSingular')).replace('{count}', String(totalGuests));
    const roomsPart = (guests.rooms > 1 ? t('packagesHome.roomsPlural') : t('packagesHome.roomsSingular')).replace('{count}', String(guests.rooms));
    return `${guestsPart} • ${roomsPart}`;
  };

  const handleSearch = () => {
    navigate('/packages/search');
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/packages/search?category=${encodeURIComponent(category)}`);
  };

  const handleDestinationClick = (destination: string) => {
    navigate(`/packages/search?destination=${encodeURIComponent(destination)}`);
  };

  return (
    <div className="packages-home">
      <Navbar theme="blue" />
      
      {/* 1. Header Area with Search */}
      <div className="packages-header-bg">
        <div className="packages-container">
          <h1 className="packages-title">{t('packagesHome.pageTitle')}</h1>
          <p className="packages-subtitle">{t('packagesHome.pageSubtitle')}</p>

          <div className="packages-search-bar">
            <div className="pkg-search-field">
              <span className="pkg-label">{t('packagesHome.searchLabelFrom')}</span>
              <input type="text" className="pkg-input" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="pkg-search-field">
              <span className="pkg-label">{t('packagesHome.searchLabelTo')}</span>
              <input type="text" className="pkg-input" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="pkg-search-field">
              <span className="pkg-label">{t('packagesHome.searchLabelDate')}</span>
              <div className="pkg-value-row">
                <Calendar size={16} className="pkg-icon" />
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDate(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', cursor: 'pointer' }}
                />
              </div>
            </div>
            <div className="pkg-search-field relative" onClick={() => { setShowGuestPicker(!showGuestPicker); }}>
              <span className="pkg-label">{t('packagesHome.searchLabelGuests')}</span>
              <div className="pkg-value-row">
                <Users size={16} className="pkg-icon" />
                <span className="pkg-text-val">{getGuestsString()}</span>
              </div>
              {showGuestPicker && (
                <div className="custom-guest-popover" onClick={e => e.stopPropagation()}>
                  <div className="guest-row">
                    <div className="guest-info"><span>{t('packagesHome.guestPickerRooms')}</span></div>
                    <div className="guest-controls">
                      <button onClick={() => handleGuestChange('rooms', 'sub')}>-</button>
                      <span>{guests.rooms}</span>
                      <button onClick={() => handleGuestChange('rooms', 'add')}>+</button>
                    </div>
                  </div>
                  <div className="guest-row">
                    <div className="guest-info"><span>{t('packagesHome.guestPickerAdults')}</span><small>{t('packagesHome.guestPickerAdultsAge')}</small></div>
                    <div className="guest-controls">
                      <button onClick={() => handleGuestChange('adults', 'sub')}>-</button>
                      <span>{guests.adults}</span>
                      <button onClick={() => handleGuestChange('adults', 'add')}>+</button>
                    </div>
                  </div>
                  <div className="guest-row">
                    <div className="guest-info"><span>{t('packagesHome.guestPickerChildren')}</span><small>{t('packagesHome.guestPickerChildrenAge')}</small></div>
                    <div className="guest-controls">
                      <button onClick={() => handleGuestChange('children', 'sub')}>-</button>
                      <span>{guests.children}</span>
                      <button onClick={() => handleGuestChange('children', 'add')}>+</button>
                    </div>
                  </div>
                  <button className="guest-done-btn" onClick={() => setShowGuestPicker(false)}>{t('packagesHome.guestPickerDone')}</button>
                </div>
              )}
            </div>
            <button className="pkg-search-btn" onClick={handleSearch}>{t('packagesHome.searchButton')}</button>
          </div>

          <div className="pkg-filter-pills">
            <div className="pkg-pill"><Filter size={14} /> {t('packagesHome.filterLabel')}</div>
            {(['All', 'Duration', 'Budget'] as const).map(label => (
              <div
                key={label}
                className={`pkg-pill${activeSort === label ? ' active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSort(label)}
              >
                {label === 'All' && <LayoutGrid size={14} />}
                {label === 'Duration' && <Clock size={14} />}
                {label === 'Budget' && <Wallet size={14} />}
                {' '}{label === 'All' ? t('packagesHome.sortAll') : label === 'Duration' ? t('packagesHome.sortDuration') : t('packagesHome.sortBudget')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Content */}
      <div className="packages-main-content">
        <div className="packages-main-container">
          
          <div className="pkg-hero-banner" style={{ backgroundImage: `url('${packagesHeroImg}')` }}>
            <div className="pkg-hero-content">
              <h2>{t('packagesHome.heroBannerHeading')}</h2>
              <button className="pkg-hero-btn" onClick={handleSearch}>{t('packagesHome.heroBannerButton')}</button>
            </div>
          </div>

          {categories.length > 0 && (
            <section className="pkg-section">
              <div className="pkg-section-header">
                <h3 className="pkg-section-title">{t('packagesHome.sectionBrowseByCategory')}</h3>
              </div>
              <div className="pkg-categories-grid">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="pkg-category-chip"
                    onClick={() => handleCategoryClick(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="pkg-section">
            <div className="pkg-section-header">
              <h3 className="pkg-section-title">{t('packagesHome.sectionPopularDestinations')}</h3>
            </div>
            <div className="pkg-destinations-grid">
              {popularDestinations.map((dest, i) => (
                <div key={i} className="pkg-dest-item" onClick={() => handleDestinationClick(dest.name)}>
                  <img src={dest.img} alt={dest.name} className="pkg-dest-img" />
                  <span className="pkg-dest-name">{dest.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="pkg-section">
            <div className="pkg-section-header">
              <h3 className="pkg-section-title">{t('packagesHome.sectionTravelStyles')}</h3>
              <a href="#" className="pkg-view-all">{t('packagesHome.viewAll')} <ChevronRight size={16} /></a>
            </div>
            <div className="pkg-styles-grid">
              {travelStyles.map((style, i) => (
                <div key={i} className="pkg-style-card">
                  <div className="pkg-style-icon-wrap">
                    <img src={style.icon} alt={style.name} className="pkg-style-img" />
                  </div>
                  <span className="pkg-style-name">{style.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="pkg-section">
            <div className="pkg-section-header">
              <h3 className="pkg-section-title">{t('packagesHome.sectionTrendingPackages')}</h3>
            </div>
            <div className="pkg-trending-grid">
              {[...trendingPackages].sort((a, b) => {
                if (activeSort === 'Budget') return parseFloat(a.price.replace(/[^\d.]/g, '')) - parseFloat(b.price.replace(/[^\d.]/g, ''));
                if (activeSort === 'Duration') return a.duration.localeCompare(b.duration);
                return 0;
              }).map((pkg, i) => (
                <div key={i} className="pkg-trend-card">
                  <div style={{ position: 'relative' }}>
                    <img loading="lazy" src={pkg.img} alt={pkg.title} className="pkg-trend-img" />
                    <button
                      type="button"
                      aria-label={packagesWishlist.isSaved(pkg.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                      onClick={() => packagesWishlist.toggle(pkg.id, { name: pkg.title, image: pkg.img, price: pkg.price })}
                      style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(15,23,42,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Heart size={16} fill={packagesWishlist.isSaved(pkg.id) ? '#ef4444' : 'none'} color={packagesWishlist.isSaved(pkg.id) ? '#ef4444' : '#ffffff'} />
                    </button>
                  </div>
                  <div className="pkg-trend-info">
                    <div className="pkg-trend-left">
                      <h4>{pkg.title}</h4>
                      <p>{pkg.duration}</p>
                    </div>
                    <div className="pkg-trend-right">
                      <div className="pkg-trend-price-block">
                        <div className="pkg-trend-price">{pkg.price}</div>
                        <div className="pkg-trend-person">{t('packagesHome.pricePerPerson')}</div>
                      </div>
                      <button className="pkg-view-deal-btn" onClick={() => navigate(`/packages/${pkg.id}`)}>{t('packagesHome.viewDealButton')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pkg-value-props">
            <div className="pkg-prop-item">
              <div className="pkg-prop-icon"><CheckCircle2 size={24} /></div>
              <div className="pkg-prop-content">
                <h4>{t('packagesHome.valueProp1Title')}</h4>
                <p>{t('packagesHome.valueProp1Desc')}</p>
              </div>
            </div>
            <div className="pkg-prop-item">
              <div className="pkg-prop-icon"><User size={24} /></div>
              <div className="pkg-prop-content">
                <h4>{t('packagesHome.valueProp2Title')}</h4>
                <p>{t('packagesHome.valueProp2Desc')}</p>
              </div>
            </div>
            <div className="pkg-prop-item">
              <div className="pkg-prop-icon"><RefreshCw size={24} /></div>
              <div className="pkg-prop-content">
                <h4>{t('packagesHome.valueProp3Title')}</h4>
                <p>{t('packagesHome.valueProp3Desc')}</p>
              </div>
            </div>
          </section>

          <section className="pkg-section" style={{ marginTop: '60px' }}>
            <div className="pkg-section-header">
              <h3 className="pkg-section-title">{t('packagesHome.sectionOffers')}</h3>
            </div>
            <div className="pkg-offers-grid">
              <div className="pkg-offer-banner" style={{ backgroundImage: `url('${packagesHeroImg}')` }}>
                <div className="pkg-offer-overlay">
                  <h4>{t('packagesHome.offerWeekendTitle')}</h4>
                  <p>{t('packagesHome.offerWeekendDesc')}</p>
                </div>
              </div>
              <div className="pkg-offer-banner" style={{ backgroundImage: `url('${packagesHeroImg}')` }}>
                <div className="pkg-offer-overlay">
                  <h4>{t('packagesHome.offerPremiumTitle')}</h4>
                  <p>{t('packagesHome.offerPremiumDesc')}</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PackagesHome;
