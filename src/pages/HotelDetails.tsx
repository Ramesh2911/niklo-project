import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Star, Shield, RefreshCw, Image, Loader2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HotelLocationMap from '../components/HotelLocationMap';
import { hotelService, type HotelDetail } from '../lib/hotelService';
import { useI18n } from '../contexts/I18nContext';
import './HotelDetails.css';

const HotelDetails: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('Overview');
  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    hotelService.getHotelDetails(id)
      .then(setHotel)
      .catch(() => setError(t('hotelDetails.errorLoadFailed')))
      .finally(() => setLoading(false));
  }, [id]);

  const name = hotel?.hotelName ?? 'Hotel';
  const rating = hotel?.ratingValue ?? 0;
  const address = hotel?.address ?? '';
  const description = hotel?.description ?? '';
  const price = hotel?.priceInt ?? hotel?.roomTypes?.[0]?.price ?? 0;
  const heroImg = hotel?.imagePath || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200';
  const amenities = hotel?.popularAmenities ?? [];
  const topReviews = hotel?.topReviews ?? [];

  if (loading) {
    return (
      <div className="hotel-details-page">
        <Navbar theme="blue" />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#64748b' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hotel-details-page">
        <Navbar theme="blue" />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: '12px', color: '#94a3b8' }}>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 20px', background: '#0052ff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{t('hotelDetails.goBack')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hotel-details-page">
      <Navbar theme="blue" />

      <section
        className="hd-hero"
        style={{ backgroundImage: `url('${heroImg}')` }}
      >
        <div className="hd-hero-overlay"></div>
        <div className="hd-hero-content">
          <h1>{name}</h1>
          <div className="hd-hero-rating">
            {rating > 0 && (
              <div className="hd-stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(rating) ? '#fbbf24' : 'none'} color={i < Math.round(rating) ? '#fbbf24' : '#cbd5e1'} />
                ))}
              </div>
            )}
            {rating > 0 && <span>{rating} ({hotel?.ratingText ?? t('hotelDetails.defaultRatingText')})</span>}
            {address && <> • <span className="hd-addr">{address}</span></>}
          </div>
        </div>
        <div className="hd-photo-badge">
          <Image size={14} />
          <span>1 / 1</span>
        </div>
      </section>

      <div className="hd-tabs-nav">
        <div className="hd-tabs-container">
          {[
            { id: 'Overview', label: t('hotelDetails.tabOverview') },
            { id: 'Rooms', label: t('hotelDetails.tabRooms') },
            { id: 'Amenities', label: t('hotelDetails.tabAmenities') },
            { id: 'Reviews', label: t('hotelDetails.tabReviews') },
            { id: 'Location', label: t('hotelDetails.tabLocation') },
          ].map(tab => (
            <div
              key={tab.id}
              className={`hd-tab-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                document.getElementById(`hd-section-${tab.id.toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      <div className="hd-main-content">
        <div className="hd-container">

          <div className="hd-left-col">

            <section className="hd-info-section" id="hd-section-overview">
              <div className="hd-section-header">
                <h2>{t('hotelDetails.aboutProperty')}</h2>
                <span className="hd-cancel-badge">{t('hotelDetails.freeCancellationBadge')}</span>
              </div>
              <p className="hd-desc-text">
                {description || t('hotelDetails.defaultDescription').replace('{{name}}', name)}
              </p>
            </section>

            {amenities.length > 0 && (
              <section className="hd-info-section" id="hd-section-amenities">
                <h2>{t('hotelDetails.amenitiesHeading')}</h2>
                <div className="hd-amenities-grid">
                  {amenities.slice(0, 6).map((a, i) => (
                    <div key={i} className="hd-amenity-item"><span>{a}</span></div>
                  ))}
                </div>
              </section>
            )}

            {hotel?.roomTypes && hotel.roomTypes.length > 0 && (
              <section className="hd-info-section" id="hd-section-rooms">
                <h2>{t('hotelDetails.roomTypesHeading')}</h2>
                <div className="hd-roomtype-list">
                  {hotel.roomTypes.map((rt) => (
                    <div key={rt.id} className="hd-roomtype-card">
                      <span className="hd-roomtype-title">{rt.title}</span>
                      <span className="hd-roomtype-price">₹{(rt.price ?? 0).toLocaleString('en-IN')}{t('hotelDetails.perNightSuffix')}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {topReviews.length > 0 && (
              <section className="hd-info-section" id="hd-section-reviews">
                <h2>{t('hotelDetails.tabReviews')}</h2>
                <div className="hd-roomtype-list">
                  {topReviews.map((review) => (
                    <div key={review.id} className="hd-review-card">
                      <div className="hd-review-card-header">
                        <span className="hd-roomtype-title">{review.title}</span>
                        <span className="hd-review-rating">★ {review.rating}</span>
                      </div>
                      <p className="hd-review-comment">{review.comment}</p>
                      <small className="hd-review-author">{review.reviewerName}</small>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="hd-info-section" id="hd-section-location">
              <h2>{t('hotelDetails.tabLocation')}</h2>
              <HotelLocationMap
                latitude={hotel?.latitude}
                longitude={hotel?.longitude}
                address={address}
                name={name}
              />
            </section>

          </div>

          <div className="hd-right-col">
            <div className="hd-booking-card">
              <div className="hd-price-box">
                <span className="hd-start-lbl">{t('hotelDetails.startingFrom')}</span>
                <strong className="hd-price-amount">
                  {price > 0 ? `₹${price.toLocaleString('en-IN')} ` : t('hotelDetails.contactForPrice')}
                  {price > 0 && <span>/ {t('hotelDetails.perNightSuffix')}</span>}
                </strong>
                {price > 0 && <span className="hd-tax-lbl">{t('hotelDetails.taxesAndFees')}</span>}
              </div>

              <div className="hd-action-buttons">
                <button
                  className="hd-btn-check-availability"
                  onClick={() => navigate(`/hotels/${id}/availability`)}
                >
                  {t('hotelDetails.checkAvailability')}
                </button>
              </div>

              <div className="hd-guarantees">
                <div className="hd-guar-item">
                  <Shield size={14} />
                  <span>{t('hotelDetails.priceMatchGuarantee')}</span>
                </div>
                <div className="hd-guar-item">
                  <RefreshCw size={14} />
                  <span>{t('hotelDetails.freeCancellationPolicy')}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HotelDetails;
