import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Star, Clock, Users, Calendar, Lock, Phone, Loader2, Heart
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { packageService, type PackageAvailability, type TravelPackage } from '../lib/packageService';
import { useWishlist } from '../hooks/useWishlist';
import { useI18n } from '../contexts/I18nContext';
import './PackageDetails.css';

const PackageDetails: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const packageWishlist = useWishlist('package');
  const [activeTab, setActiveTab] = useState('Overview');
  const [pkg, setPkg] = useState<TravelPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guests, setGuests] = useState({ adults: 2, children: 0 });
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [date, setDate] = useState('');
  const [availability, setAvailability] = useState<PackageAvailability | null>(null);

  useEffect(() => {
    if (!id) return;
    packageService.getById(id).then(setPkg)
      .catch(() => setError(t('packageDetails.errorCouldNotLoad')))
      .finally(() => setLoading(false));
  }, [id]);

  // Real price/availability for the selected date + traveler count, from the
  // backend's checkAvailability endpoint (replaces client-side fare math).
  useEffect(() => {
    if (!id || !date) { setAvailability(null); return; }
    const travelers = guests.adults + guests.children;
    packageService.checkAvailability(id, date, travelers).then(setAvailability)
      .catch(() => setAvailability(null));
  }, [id, date, guests.adults, guests.children]);

  const handleGuestChange = (type: 'adults' | 'children', op: 'add' | 'sub') => {
    setGuests(prev => {
      const newVal = op === 'add' ? prev[type] + 1 : Math.max(0, prev[type] - 1);
      if (type === 'adults' && newVal < 1) return prev;
      return { ...prev, [type]: newVal };
    });
  };

  const getGuestsString = () => {
    const total = guests.adults + guests.children;
    return (total > 1 ? t('packageDetails.travelerPlural') : t('packageDetails.travelerSingular')).replace('{count}', String(total));
  };

  if (loading) {
    return (
      <div className="pkg-detail-container">
        <Navbar theme="blue" />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#64748b' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="pkg-detail-container">
        <Navbar theme="blue" />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: '12px', color: '#94a3b8' }}>
          <p>{error || t('packageDetails.errorPackageNotFound')}</p>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 20px', background: '#0052ff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{t('packageDetails.errorGoBack')}</button>
        </div>
      </div>
    );
  }

  const totalGuests = guests.adults + guests.children;
  const packagePrice = Number(pkg.price.replace(/[^\d.]/g, '')) || 0;
  // Real total comes from POST /packages/:id/availability once a date is
  // picked (see useEffect above); until then, fall back to a plain estimate
  // instead of the old client-side GST/discount formula.
  const totalPrice = availability?.total_price ?? packagePrice * totalGuests;
  const pricePerPerson = availability?.price_per_person ?? packagePrice;

  return (
    <div className="pkg-detail-container">
      <Navbar theme="blue" />

      <div className="pkg-detail-hero" style={{ backgroundImage: `url('${pkg.img}')` }}>
        <div className="pkg-detail-hero-content">
          {pkg.destination && (
            <div className="pkg-breadcrumbs">{t('packageDetails.breadcrumbExplore')} › {pkg.destination}</div>
          )}
          <h1>{pkg.title}</h1>
          <div className="pkg-hero-badges">
            <div className="pkg-hero-rating">
              <Star size={16} fill="#fbbf24" color="#fbbf24" /> {t('packageDetails.featuredPackage')}
            </div>
            <button
              type="button"
              aria-label={packageWishlist.isSaved(pkg.id) ? 'Remove from wishlist' : 'Save to wishlist'}
              onClick={() => packageWishlist.toggle(pkg.id, { name: pkg.title, price: pkg.price })}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(15,23,42,0.45)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Heart size={18} fill={packageWishlist.isSaved(pkg.id) ? '#ef4444' : 'none'} color={packageWishlist.isSaved(pkg.id) ? '#ef4444' : '#ffffff'} />
            </button>
          </div>
        </div>
      </div>

      <div className="pkg-detail-tabs-nav">
        <div className="pkg-tabs-container">
          {['Overview', 'Inclusions'].map(tab => (
            <div
              key={tab}
              className={`pkg-tab-link ${activeTab === tab ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab);
                document.getElementById(tab === 'Overview' ? 'pkg-section-overview' : 'pkg-section-inclusions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {tab === 'Overview' ? t('packageDetails.tabOverview') : t('packageDetails.tabInclusions')}
            </div>
          ))}
        </div>
      </div>

      {pkg.galleryImages && pkg.galleryImages.length > 0 && (
        <div className="pkg-detail-gallery" aria-label="Package photos">
          {pkg.galleryImages.map((image, index) => (
            <img key={`${image}-${index}`} src={image} alt={`${pkg.title} ${index + 1}`} />
          ))}
        </div>
      )}

      <div className="pkg-detail-main">
        <div className="pkg-detail-left">

          <div className="pkg-quick-info">
            {pkg.duration && (
              <div className="pkg-qi-item">
                <div className="pkg-qi-icon"><Clock size={20} /></div>
                <div className="pkg-qi-content">
                  <span className="pkg-qi-label">{t('packageDetails.quickInfoDurationLabel')}</span>
                  <span className="pkg-qi-value">{pkg.duration}</span>
                </div>
              </div>
            )}
            <div className="pkg-qi-item">
              <div className="pkg-qi-icon"><Users size={20} /></div>
              <div className="pkg-qi-content">
                <span className="pkg-qi-label">{t('packageDetails.quickInfoTravelersLabel')}</span>
                <span className="pkg-qi-value">{getGuestsString()}</span>
              </div>
            </div>
          </div>

          {pkg.description && (
            <section className="pkg-detail-section" id="pkg-section-overview">
              <h2>{t('packageDetails.sectionOverviewHeading')}</h2>
              <p className="pkg-detail-desc">{pkg.description}</p>
              {pkg.destination && (
                <div className="pkg-tags-row">
                  <span className="pkg-tag">{pkg.destination}</span>
                </div>
              )}
            </section>
          )}

          {pkg.inclusions && pkg.inclusions.length > 0 && (
            <section className="pkg-detail-section" id="pkg-section-inclusions">
              <h2>{t('packageDetails.sectionInclusionsHeading')}</h2>
              <ul style={{ padding: '0 0 0 20px', color: '#475569', fontSize: '0.95rem', lineHeight: '1.8' }}>
                {pkg.inclusions.map((inc, i) => (
                  <li key={i}>{inc}</li>
                ))}
              </ul>
            </section>
          )}

        </div>

        <div className="pkg-detail-right">
          <div className="pkg-detail-sidebar">

            <div className="pkg-pricing-card">
              <div className="pkg-price-header">
                <span className="label">{t('packageDetails.pricingStartingFrom')}</span>
                <div className="pkg-price-amount">₹{packagePrice.toLocaleString('en-IN')} <span>{t('packageDetails.pricingPerPerson')}</span></div>
                <span className="pkg-price-taxes">{t('packageDetails.pricingTaxesNote')}</span>
              </div>

              <div className="pkg-booking-form">
                <div className="pkg-form-group relative">
                  <label>{t('packageDetails.formLabelSelectDate')}</label>
                  <div className="pkg-form-input">
                    <Calendar size={18} color="#64748b" />
                    <input
                      type="date"
                      style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e293b', fontSize: '0.9rem', flex: 1 }}
                      min={new Date().toISOString().slice(0, 10)}
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pkg-form-group relative" onClick={() => setShowGuestPicker(v => !v)}>
                  <label>{t('packageDetails.formLabelTravelers')}</label>
                  <div className="pkg-form-input">
                    <Users size={18} color="#64748b" />
                    <span className="pkg-text-val">{getGuestsString()}</span>
                  </div>
                  {showGuestPicker && (
                    <div className="custom-guest-popover" onClick={e => e.stopPropagation()}>
                      <div className="guest-row">
                        <div className="guest-info"><span>{t('packageDetails.guestAdults')}</span><small>{t('packageDetails.guestAdultsAge')}</small></div>
                        <div className="guest-controls">
                          <button onClick={() => handleGuestChange('adults', 'sub')}>-</button>
                          <span>{guests.adults}</span>
                          <button onClick={() => handleGuestChange('adults', 'add')}>+</button>
                        </div>
                      </div>
                      <div className="guest-row">
                        <div className="guest-info"><span>{t('packageDetails.guestChildren')}</span><small>{t('packageDetails.guestChildrenAge')}</small></div>
                        <div className="guest-controls">
                          <button onClick={() => handleGuestChange('children', 'sub')}>-</button>
                          <span>{guests.children}</span>
                          <button onClick={() => handleGuestChange('children', 'add')}>+</button>
                        </div>
                      </div>
                      <button className="guest-done-btn" onClick={() => setShowGuestPicker(false)}>{t('packageDetails.guestDoneButton')}</button>
                    </div>
                  )}
                </div>

                <div style={{ padding: '10px 0', borderTop: '1px solid #e2e8f0', marginTop: '8px', color: '#0052ff', fontWeight: 700 }}>
                  {t('packageDetails.totalLabel')} ₹{totalPrice.toLocaleString('en-IN')}
                </div>
              </div>

              <button
                className="pkg-book-btn"
                onClick={() => navigate('/packages/checkout', {
                  state: {
                    packageId: pkg.id,
                    packageName: pkg.title,
                    destination: pkg.destination ?? '',
                    pricePerPerson,
                    totalAmount: totalPrice,
                    travelDate: date,
                    travellersCount: totalGuests,
                    adultsCount: guests.adults,
                    childrenCount: guests.children,
                    duration: pkg.duration,
                  }
                })}
              >
                {t('packageDetails.bookButton')}
              </button>

              <div className="pkg-secure-text">
                <Lock size={14} /> {t('packageDetails.secureBooking')}
              </div>
            </div>

            <div className="pkg-help-card">
              <h4>{t('packageDetails.helpCardHeading')}</h4>
              <p>{t('packageDetails.helpCardBody')}</p>
              <a href="tel:+9118001234567" className="pkg-help-phone">
                <Phone size={16} /> +91 1800 123 4567
              </a>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PackageDetails;
