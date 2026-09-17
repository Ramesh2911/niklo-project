import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MapPin, Calendar, Users,
  ShieldCheck, Heart, Check,
  Coffee, UserCheck, Shield, Sparkles, Sun, Smile, ShoppingBag
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { experienceService, type Experience, type AdventureAvailability } from '../lib/experienceService';
import { useI18n } from '../contexts/I18nContext';
import { useWishlist } from '../hooks/useWishlist';
import './ExperienceDetails.css';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ExperienceDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed
  const [date, setDate] = useState(() => {
    const iso = searchParams.get('date');
    if (!iso) return 'Select Date';
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime())
      ? 'Select Date'
      : `${parsed.getDate()} ${MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`;
  });
  const [isoDate, setIsoDate] = useState(() => searchParams.get('date') ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [travellersCount, setTravellersCount] = useState(() => {
    const n = Number(searchParams.get('travelers'));
    return Number.isFinite(n) && n > 0 ? n : 2;
  });
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [dateError, setDateError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [availability, setAvailability] = useState<AdventureAvailability | null>(null);
  const wishlist = useWishlist('experience');

  const goToTab = (tab: string, sectionId: string) => {
    setActiveTab(tab);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (id) experienceService.getById(id).then(setExperience).catch(() => setExperience(null));
  }, [id]);

  // Real price/availability for the selected date + traveler count
  // (adventures.service.ts#checkAvailability), replacing any client guess.
  useEffect(() => {
    if (!id || !isoDate) { setAvailability(null); return; }
    experienceService.checkAvailability(id, { date: isoDate, participants: travellersCount })
      .then(setAvailability)
      .catch(() => setAvailability(null));
  }, [id, isoDate, travellersCount]);

  const handleBookNow = () => {
    if (date === 'Select Date') {
      setDateError(true);
      return;
    }
    if (availability && !availability.available) {
      setDateError(true);
      return;
    }

    // Navigate to checkout
    navigate(`/experiences/${id}/checkout`, {
      state: {
        date,
        isoDate,
        travellersCount,
        pricePerPerson: availability?.price_per_person ?? experience?.price ?? 0,
        experienceName: experience?.name,
        experienceLocation: experience?.location,
        experienceId: experience?.id,
      }
    });
  };

  if (!experience) {
    return (
      <div className="ed-page-wrapper">
        <Navbar theme="blue" />
        <p style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>{t('experienceDetails.loadingExperience')}</p>
        <Footer />
      </div>
    );
  }

  return (
    <div className="ed-page-wrapper" onClick={() => { setShowDatePicker(false); setShowGuestPicker(false); }}>
      <Navbar theme="blue" />

      {/* Breadcrumbs */}
      <div className="ed-breadcrumbs-bar">
        <div className="ed-breadcrumbs-container">
          <span onClick={() => navigate('/experiences')}>{t('experienceDetails.breadcrumbHome')}</span> &rsaquo;
          <span onClick={() => navigate('/experiences/search')}>{t('experienceDetails.breadcrumbExperiences')}</span> &rsaquo;
          <span className="active">{experience.name}</span>
        </div>
      </div>

      <main className="ed-main">
        <div className="ed-container">

          {/* Header title block */}
          <div className="ed-title-block">
            <div className="ed-title-row">
              <h1>{experience.name}</h1>
              <button
                type="button"
                className="ed-save-btn"
                aria-label={wishlist.isSaved(experience.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                onClick={() => wishlist.toggle(experience.id, { name: experience.name, image: experience.img, price: experience.price, location: experience.location })}
              >
                <Heart size={20} fill={wishlist.isSaved(experience.id) ? '#ef4444' : 'none'} color={wishlist.isSaved(experience.id) ? '#ef4444' : '#64748b'} />
              </button>
            </div>
            <div className="ed-meta-row">
              <span className="ed-location">
                <MapPin size={16} />
                <span>{experience.location}</span>
              </span>
            </div>
          </div>

          {/* Photo — adventure-service has no per-listing image field, so this
              is the same bundled illustration used everywhere else for this
              experience, not a fabricated multi-photo gallery. */}
          <div className="ed-gallery-grid">
            <div className="ed-gallery-main">
              <img src={experience.img} alt={experience.name} />
            </div>
          </div>

          {/* Quick info tags bar */}
          <div className="ed-quick-info-row">
            <div className="ed-quick-card">
              <span className="eq-label">{t('experienceDetails.quickInfoDurationLabel')}</span>
              <strong className="eq-value">{experience.durationHours} hr{experience.durationHours !== 1 ? 's' : ''}</strong>
            </div>
            <div className="ed-quick-card">
              <span className="eq-label">{t('experienceDetails.quickInfoGroupSizeLabel')}</span>
              <strong className="eq-value">{t('experienceDetails.quickInfoGroupSizeValue')}</strong>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="ed-tabs-row">
            <button className={`ed-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => goToTab('overview', 'ed-section-about')}>{t('experienceDetails.tabOverview')}</button>
            <button className={`ed-tab-btn ${activeTab === 'highlights' ? 'active' : ''}`} onClick={() => goToTab('highlights', 'ed-section-highlights')}>{t('experienceDetails.tabHighlights')}</button>
            <button className={`ed-tab-btn ${activeTab === 'amenities' ? 'active' : ''}`} onClick={() => goToTab('amenities', 'ed-section-included')}>{t('experienceDetails.tabAmenities')}</button>
            <button className={`ed-tab-btn ${activeTab === 'necessities' ? 'active' : ''}`} onClick={() => goToTab('necessities', 'ed-section-bring')}>{t('experienceDetails.tabNecessities')}</button>
          </div>

          {/* Main Content Details (Left) + Sticky Booking Card (Right) */}
          <div className="ed-grid-layout">
            
            <div className="ed-details-col">
              
              {/* About section */}
              <section className="ed-section" id="ed-section-about">
                <h2>{t('experienceDetails.sectionAboutTitle')}</h2>
                <p>{experience.description}</p>
              </section>

              {/* Highlights list */}
              <section className="ed-section" id="ed-section-highlights">
                <h2>{t('experienceDetails.sectionHighlightsTitle')}</h2>
                <div className="ed-highlights-list">
                  {(experience.highlights ?? [t('experienceDetails.highlight1'), t('experienceDetails.highlight2'), t('experienceDetails.highlight3'), t('experienceDetails.highlight4')]).map((highlight) => (
                    <div className="ed-highlight-item" key={highlight}>
                      <Check size={18} className="ed-check-icon" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* What's Included */}
              <section className="ed-section" id="ed-section-included">
                <h2>{t('experienceDetails.sectionWhatsIncludedTitle')}</h2>
                <div className="ed-inclusion-row">
                  <div className="ed-inclusion-item">
                    <div className="ed-inc-icon-box">
                      <Shield size={20} />
                    </div>
                    <span>{t('experienceDetails.inclusionSafetyEquipment')}</span>
                  </div>
                  <div className="ed-inclusion-item">
                    <div className="ed-inc-icon-box">
                      <UserCheck size={20} />
                    </div>
                    <span>{t('experienceDetails.inclusionProfessionalGuide')}</span>
                  </div>
                  <div className="ed-inclusion-item">
                    <div className="ed-inc-icon-box">
                      <Coffee size={20} />
                    </div>
                    <span>{t('experienceDetails.inclusionRefreshments')}</span>
                  </div>
                  <div className="ed-inclusion-item">
                    <div className="ed-inc-icon-box">
                      <Heart size={20} />
                    </div>
                    <span>{t('experienceDetails.inclusionInsurance')}</span>
                  </div>
                </div>
              </section>

              {/* What to Bring */}
              <section className="ed-section" id="ed-section-bring">
                <h2>{t('experienceDetails.sectionWhatToBringTitle')}</h2>
                <div className="ed-inclusion-row">
                  <div className="ed-inclusion-item">
                    <div className="ed-inc-icon-box">
                      <Sun size={20} />
                    </div>
                    <span>{t('experienceDetails.bringSwimwear')}</span>
                  </div>
                  <div className="ed-inclusion-item">
                    <div className="ed-inc-icon-box">
                      <Smile size={20} />
                    </div>
                    <span>{t('experienceDetails.bringTowel')}</span>
                  </div>
                  <div className="ed-inclusion-item">
                    <div className="ed-inc-icon-box">
                      <ShoppingBag size={20} />
                    </div>
                    <span>{t('experienceDetails.bringChangeOfClothes')}</span>
                  </div>
                  <div className="ed-inclusion-item">
                    <div className="ed-inc-icon-box">
                      <Sparkles size={20} />
                    </div>
                    <span>{t('experienceDetails.bringSunscreen')}</span>
                  </div>
                </div>
              </section>

            </div>

            {/* Right Sticky Booking Card */}
            <div className="ed-booking-col">
              <div className="ed-booking-card">
                <div className="ed-book-price-row">
                  <span>{t('experienceDetails.bookingPriceFrom')}</span>
                  <strong>₹{experience.price.toLocaleString('en-IN')}</strong>
                  <span>{t('experienceDetails.bookingPricePerPerson')}</span>
                </div>

                <div className="ed-book-form">
                  <div className="ed-book-field relative" onClick={e => { e.stopPropagation(); setShowDatePicker(!showDatePicker); setShowGuestPicker(false); }}>
                    <label>{t('experienceDetails.bookingDateLabel')}</label>
                    <div className="ed-book-input-row">
                      <span>{date === 'Select Date' ? t('experienceDetails.bookingDatePlaceholder') : date}</span>
                      <Calendar size={18} className="ed-book-icon" />
                    </div>

                    {showDatePicker && (() => {
                      const firstDay = new Date(calYear, calMonth, 1).getDay();
                      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                      const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                      const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
                      const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
                      return (
                        <div className="custom-calendar-popover" style={{ right: '0', top: '100%' }} onClick={e => e.stopPropagation()}>
                          <div className="calendar-header">
                            <button type="button" onClick={prevMonth}>&lt;</button>
                            <span>{MONTH_NAMES[calMonth]} {calYear}</span>
                            <button type="button" onClick={nextMonth}>&gt;</button>
                          </div>
                          <div className="calendar-grid">
                            {[
                              t('experienceDetails.calDayHeaderSu'),
                              t('experienceDetails.calDayHeaderMo'),
                              t('experienceDetails.calDayHeaderTu'),
                              t('experienceDetails.calDayHeaderWe'),
                              t('experienceDetails.calDayHeaderTh'),
                              t('experienceDetails.calDayHeaderFr'),
                              t('experienceDetails.calDayHeaderSa'),
                            ].map((d, i) => <div key={i} className="cal-day-header">{d}</div>)}
                            {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} className="cal-empty" />)}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                              const ts = new Date(calYear, calMonth, d).getTime();
                              const isPast = ts < todayTs;
                              const label = `${d} ${MONTH_NAMES[calMonth]} ${calYear}`;
                              const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                              return (
                                <div
                                  key={d}
                                  className={`cal-day ${date === label ? 'selected' : ''} ${isPast ? 'disabled' : ''}`}
                                  onClick={() => { if (!isPast) { setDate(label); setIsoDate(iso); setShowDatePicker(false); setDateError(false); } }}
                                >
                                  {d}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="ed-book-field relative" onClick={e => { e.stopPropagation(); setShowGuestPicker(!showGuestPicker); setShowDatePicker(false); }}>
                    <label>{t('experienceDetails.bookingTravelersLabel')}</label>
                    <div className="ed-book-input-row">
                      <span>{t('experienceDetails.bookingTravelersCount').replace('{count}', String(travellersCount))}</span>
                      <Users size={18} className="ed-book-icon" />
                    </div>

                    {showGuestPicker && (
                      <div className="custom-guest-popover" style={{ right: '0', top: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="guest-row">
                          <div className="guest-info"><span>{t('experienceDetails.guestPickerTravelersLabel')}</span></div>
                          <div className="guest-controls">
                            <button type="button" onClick={() => setTravellersCount(Math.max(1, travellersCount - 1))}>-</button>
                            <span>{travellersCount}</span>
                            <button type="button" onClick={() => setTravellersCount(travellersCount + 1)}>+</button>
                          </div>
                        </div>
                        <button type="button" className="guest-done-btn" onClick={() => setShowGuestPicker(false)}>{t('experienceDetails.guestPickerDoneButton')}</button>
                      </div>
                    )}
                  </div>
                </div>

                {dateError && (
                  <p className="ed-date-error">
                    {availability && !availability.available
                      ? 'No slots available on this date — try another.'
                      : t('experienceDetails.dateErrorMessage')}
                  </p>
                )}
                {!dateError && availability?.available && (
                  <p className="ed-date-error" style={{ color: '#16a34a' }}>
                    {availability.remaining_slots} slots left
                  </p>
                )}

                <button className="ed-btn-book" onClick={handleBookNow}>
                  {t('experienceDetails.bookNowButton')}
                </button>

                <div className="ed-free-cancel-lbl">
                  <ShieldCheck size={14} />
                  <span>{t('experienceDetails.freeCancellationLabel')}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ExperienceDetails;
