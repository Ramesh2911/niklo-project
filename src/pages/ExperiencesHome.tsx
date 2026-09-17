import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { experienceService, type Experience } from '../lib/experienceService';
import {
  MapPin, Calendar, Compass, Users, Search,
  Footprints, Waves, Tent, Wind, TreePine, Car, Snowflake, Anchor
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import experiencesHeroImg from '../assets/exp_adv.png';
import { useI18n } from '../contexts/I18nContext';
import './ExperiencesHome.css';

const iconMap = [Footprints, Waves, Tent, Wind, TreePine, Car, Snowflake, Anchor];

const ExperiencesHome: React.FC = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [location, setLocation] = useState('Kolkata, WB');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [adventureType, setAdventureType] = useState('Water Sports');
  const [travelers, setTravelers] = useState('21 Travelers');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [guestsCount, setGuestsCount] = useState(21);
  const [trendingAdventures, setTrendingAdventures] = useState<Experience[]>([]);

  const popularDestinations = Array.from(new Set(trendingAdventures.map((adv) => adv.location).filter(Boolean))).slice(0, 5).map((location, index) => ({
    name: location,
    img: trendingAdventures[index]?.img || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=400',
  }));

  const adventureTypes = Array.from(new Set(trendingAdventures.map((adv) => adv.category).filter(Boolean) as string[])).slice(0, 8).map((label, index) => ({
    id: label.toLowerCase().replace(/\s+/g, '-'),
    label,
    icon: iconMap[index % iconMap.length],
  }));

  useEffect(() => {
    experienceService.getTrending().then(setTrendingAdventures).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (date) params.set('date', date);
    if (adventureType) params.set('type', adventureType);
    params.set('travelers', String(guestsCount));
    navigate(`/experiences/search?${params.toString()}`);
  };

  const ADVENTURE_TYPE_LABELS: Record<string, string> = {
    'Trekking': t('experiencesHome.adventureTypeTrekking'),
    'Water Sports': t('experiencesHome.adventureTypeWaterSports'),
    'Camping': t('experiencesHome.adventureTypeCamping'),
    'Air Sports': t('experiencesHome.adventureTypeAirSports'),
    'Nature Trek': t('experiencesHome.adventureTypeNatureTrek'),
    'Road Trip': t('experiencesHome.adventureTypeRoadTrip'),
    'Skiing': t('experiencesHome.adventureTypeSkiing'),
    'Scuba Diving': t('experiencesHome.adventureTypeScubaDiving'),
  };

  return (
    <div className="exp-page-wrapper" onClick={() => { setShowTypePicker(false); setShowGuestPicker(false); }}>
      <Navbar theme="blue" />

      {/* Hero Banner */}
      <section className="exp-hero" style={{ backgroundImage: `url('${experiencesHeroImg}')` }}>
        <div className="exp-hero-overlay"></div>
        <div className="exp-hero-content">
          <h1>{lang === 'English' ? (<>Unleash Your Inner<br />Adventurer</>) : t('experiencesHome.heroHeading')}</h1>
          <p>{t('experiencesHome.heroSubheading')}</p>
        </div>

        {/* Floating Search Bar */}
        <div className="exp-search-container" onClick={e => e.stopPropagation()}>
          <form className="exp-search-bar" onSubmit={handleSearch}>
            <div className="exp-search-field">
              <label>{t('experiencesHome.searchLabelLocation')}</label>
              <div className="exp-input-row">
                <MapPin size={16} className="exp-icon" />
                <input 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  className="exp-field-input"
                />
              </div>
            </div>

            <div className="exp-search-field" onClick={e => e.stopPropagation()}>
              <label>{t('experiencesHome.searchLabelDate')}</label>
              <div className="exp-input-row">
                <Calendar size={16} className="exp-icon" />
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDate(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="exp-search-field relative" onClick={() => { setShowTypePicker(!showTypePicker); setShowGuestPicker(false); }}>
              <label>{t('experiencesHome.searchLabelAdventureType')}</label>
              <div className="exp-input-row">
                <Compass size={16} className="exp-icon" />
                <span className="exp-field-val">{ADVENTURE_TYPE_LABELS[adventureType] ?? adventureType}</span>
              </div>
              {showTypePicker && (
                <div className="custom-guest-popover" style={{ left: '0', top: '100%' }} onClick={e => e.stopPropagation()}>
                  <div className="guest-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['Trekking', 'Water Sports', 'Camping', 'Air Sports', 'Road Trip'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        className="guest-done-btn"
                        style={{ margin: 0, background: adventureType === opt ? '#0052ff' : '#f1f5f9', color: adventureType === opt ? '#ffffff' : '#334155' }}
                        onClick={() => { setAdventureType(opt); setShowTypePicker(false); }}
                      >
                        {ADVENTURE_TYPE_LABELS[opt]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="exp-search-field relative" onClick={() => { setShowGuestPicker(!showGuestPicker); setShowTypePicker(false); }}>
              <label>{t('experiencesHome.searchLabelTravelers')}</label>
              <div className="exp-input-row">
                <Users size={16} className="exp-icon" />
                <span className="exp-field-val">{travelers}</span>
              </div>
              {showGuestPicker && (
                <div className="custom-guest-popover" style={{ right: '0', top: '100%' }} onClick={e => e.stopPropagation()}>
                  <div className="guest-row">
                    <div className="guest-info"><span>{t('experiencesHome.guestPickerTravelers')}</span></div>
                    <div className="guest-controls">
                      <button type="button" onClick={() => { setGuestsCount(Math.max(1, guestsCount - 1)); setTravelers(`${Math.max(1, guestsCount - 1)} Travelers`); }}>-</button>
                      <span>{guestsCount}</span>
                      <button type="button" onClick={() => { setGuestsCount(guestsCount + 1); setTravelers(`${guestsCount + 1} Travelers`); }}>+</button>
                    </div>
                  </div>
                  <button type="button" className="guest-done-btn" onClick={() => setShowGuestPicker(false)}>{t('experiencesHome.guestPickerDone')}</button>
                </div>
              )}
            </div>

            <button type="submit" className="exp-search-btn">
              <Search size={16} />
              <span>{t('experiencesHome.searchButton')}</span>
            </button>
          </form>
        </div>
      </section>

      {/* Main Grid Content */}
      <main className="exp-main">
        <div className="exp-container">
          
          {/* Popular Destinations */}
          <section className="exp-section">
            <div className="exp-section-header">
              <h2>{t('experiencesHome.popularDestinationsHeading')}</h2>
              <a href="#" className="exp-view-all" onClick={(e) => { e.preventDefault(); navigate('/experiences/search'); }}>{t('experiencesHome.viewAll')} &rsaquo;</a>
            </div>
            
            <div className="exp-dest-grid">
              {popularDestinations.map((dest, idx) => (
                <div key={idx} className="exp-dest-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/experiences/search?location=${encodeURIComponent(dest.name)}`)}>
                  <img src={dest.img} alt={dest.name} className="exp-dest-img" />
                  <div className="exp-dest-overlay"></div>
                  <span className="exp-dest-name">{dest.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Browse by Adventure Type */}
          <section className="exp-section">
            <div className="exp-section-header">
              <h2>{t('experiencesHome.browseByAdventureTypeHeading')}</h2>
              <a href="#" className="exp-view-all" onClick={(e) => { e.preventDefault(); navigate(`/experiences/search?type=${encodeURIComponent(adventureType)}`); }}>{t('experiencesHome.viewAll')} &rsaquo;</a>
            </div>

            <div className="exp-types-row">
              {(adventureTypes.length ? adventureTypes : [
                { id: 'water-sports', label: 'Water Sports', icon: Waves },
                { id: 'trekking', label: 'Trekking', icon: Footprints },
                { id: 'camping', label: 'Camping', icon: Tent },
              ]).map(type => (
                <button
                  key={type.id}
                  className={`exp-type-pill ${type.label === adventureType ? 'active' : ''}`}
                  onClick={() => { setAdventureType(type.label); navigate(`/experiences/search?type=${encodeURIComponent(type.label)}`); }}
                >
                  <type.icon size={16} className="exp-pill-icon" />
                  <span>{ADVENTURE_TYPE_LABELS[type.label] ?? type.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Trending Adventures */}
          <section className="exp-section">
            <div className="exp-section-header">
              <h2>{t('experiencesHome.trendingAdventuresHeading')}</h2>
            </div>

            <div className="exp-trending-grid">
              {trendingAdventures.map(adv => (
                <div key={adv.id} className="exp-trend-card">
                  <img loading="lazy" src={adv.img} alt={adv.name} className="exp-trend-img" />
                  <div className="exp-trend-body">
                    <div className="exp-trend-loc">
                      <MapPin size={14} />
                      <span>{adv.location}</span>
                    </div>
                    <h3>{adv.name}</h3>
                    <div className="exp-trend-footer">
                      <div className="exp-price-col">
                        <span className="exp-price-lbl">{t('experiencesHome.priceStartingFrom')}</span>
                        <strong className="exp-price-val">₹{adv.price.toLocaleString('en-IN')}</strong>
                      </div>
                      <button className="exp-book-btn" onClick={() => navigate(`/experiences/${adv.id}`)}>{t('experiencesHome.bookNow')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Exciting Offers For You */}
          <section className="exp-section">
            <div className="exp-section-header">
              <h2>{t('experiencesHome.excitingOffersHeading')}</h2>
            </div>

            <div className="exp-offers-grid">
              <div className="exp-offer-card dark-blue">
                <div className="exp-offer-left">
                  <span className="offer-badge">{t('experiencesHome.offerBadgeEarlyBird')}</span>
                  <h3>{t('experiencesHome.offerEarlyBirdHeading')}</h3>
                  <p>{t('experiencesHome.offerEarlyBirdCode')}</p>
                </div>
                <div className="exp-offer-graphic trek-graphic"></div>
              </div>

              <div className="exp-offer-card light-blue">
                <div className="exp-offer-left">
                  <span className="offer-badge">{t('experiencesHome.offerBadgeSolo')}</span>
                  <h3>{t('experiencesHome.offerSoloHeading')}</h3>
                  <p>{t('experiencesHome.offerSoloValidity')}</p>
                </div>
                <div className="exp-offer-graphic road-graphic"></div>
              </div>
            </div>
          </section>

          {/* Travel Memories Section */}
          <section className="exp-section" style={{ marginBottom: '60px' }}>
            <div className="exp-section-header" style={{ justifyContent: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('experiencesHome.travelMemoriesHeading')}</h2>
            </div>
            
            <div className="exp-memories-row">
              {trendingAdventures.slice(0, 6).map((adv, idx) => (
                <div key={adv.id || idx} className="exp-memory-item">
                  <div className="exp-memory-circle">
                    <img src={adv.img} alt={adv.name} className="exp-memory-img" />
                  </div>
                  <span>{adv.name}</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ExperiencesHome;
