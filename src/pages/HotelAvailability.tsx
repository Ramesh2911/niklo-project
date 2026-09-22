import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, CheckCircle2,
  ChevronDown, ShieldCheck, Lock, Star
} from 'lucide-react';
import { hotelService, type HotelAvailabilityCheck } from '../lib/hotelService';
import { createApi } from '../lib/api';
const api = createApi(import.meta.env.VITE_HOTEL_BASE_URL || '/api/v1');
import { useI18n } from '../contexts/I18nContext';
import './HotelAvailability.css';

interface HotelBasicInfo {
  id: string;
  name?: string;
  hotelName?: string;
  address?: string;
}

const formatDisplayDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

const monthLabel = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

const firstWeekdayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();

const addDays = (d: Date, n: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

const HotelAvailability: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const [hotel, setHotel] = useState<HotelBasicInfo | null>(null);
  const [checkInDate, setCheckInDate] = useState(() => addDays(new Date(), 1));
  const [checkOutDate, setCheckOutDate] = useState(() => addDays(new Date(), 2));
  const [checkInViewMonth, setCheckInViewMonth] = useState(() => new Date(checkInDate.getFullYear(), checkInDate.getMonth(), 1));
  const [checkOutViewMonth, setCheckOutViewMonth] = useState(() => new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), 1));

  const checkIn = formatDisplayDate(checkInDate);
  const checkOut = formatDisplayDate(checkOutDate);

  useEffect(() => {
    if (!id) return;
    api.get<{ success?: boolean; data?: HotelBasicInfo } | HotelBasicInfo>(`/hotels/${id}`)
      .then((res) => {
        const data = (res as any).data ?? (res as HotelBasicInfo);
        setHotel(data);
      })
      .catch(() => {});
  }, [id]);

  const hotelName = hotel?.hotelName ?? hotel?.name ?? '';
  const hotelAddress = hotel?.address ?? '';

  const [showCheckInCal, setShowCheckInCal] = useState(false);
  const [showCheckOutCal, setShowCheckOutCal] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [showAvailableModal, setShowAvailableModal] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<HotelAvailabilityCheck | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');

  const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });

  const handleGuestChange = (type: 'rooms' | 'adults' | 'children', op: 'add' | 'sub') => {
    setGuests(prev => {
      const newVal = op === 'add' ? prev[type] + 1 : Math.max(0, prev[type] - 1);
      if (type === 'rooms' && newVal < 1) return prev;
      if (type === 'adults' && newVal < 1) return prev;
      return { ...prev, [type]: newVal };
    });
  };

  const handleCheckAvailability = async () => {
    setCheckingAvailability(true);
    setAvailabilityError('');
    try {
      const result = await hotelService.checkAvailability(id || 'the-lalit-great-eastern', {
        check_in: checkInDate.toISOString().slice(0, 10),
        check_out: checkOutDate.toISOString().slice(0, 10),
        rooms_count: guests.rooms,
        guests_count: guests.adults + guests.children,
      });
      setAvailability(result);
      if (result.available) {
        setShowAvailableModal(true);
      } else {
        setAvailabilityError('No rooms available for the selected dates — try different dates or fewer rooms.');
      }
    } catch {
      setAvailability(null);
      setAvailabilityError('Could not check room availability. Please try again.');
    }
    setCheckingAvailability(false);
  };

  const handleContinueToPayment = () => {
    setShowAvailableModal(false);
    navigate(`/hotels/${id || 'the-lalit-great-eastern'}/checkout`, {
      state: {
        checkIn,
        checkOut,
        guests,
        roomTypeId: availability?.room_type_id,
        pricePerNight: availability?.price_per_night,
        nightsCount: availability?.nights_count,
      }
    });
  };

  return (
    <div className="ha-page-wrapper" onClick={() => { setShowCheckInCal(false); setShowCheckOutCal(false); setShowGuestPicker(false); }}>
      
      {/* Dynamic Header */}
      <header className="ha-header">
        <div className="ha-header-left">
          <button className="ha-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div className="ha-hotel-info">
            <h2>{hotelName}</h2>
            <p>{hotelAddress}</p>
          </div>
        </div>

        <div className="ha-header-right">
          <nav className="ha-nav-links">
            <span onClick={() => navigate(`/hotels/${id || 'the-lalit-great-eastern'}`)}>{t('hotelAvailability.navOverview')}</span>
            <span>{t('hotelAvailability.navRooms')}</span>
            <span>{t('hotelAvailability.navAmenities')}</span>
            <span>{t('hotelAvailability.navReviews')}</span>
          </nav>
          <button className="ha-signin-btn" onClick={() => navigate('/login')}>{t('hotelAvailability.signIn')}</button>
        </div>
      </header>

      {/* Main Container */}
      <main className="ha-main">
        <div className="ha-card">
          
          <h1 className="ha-title">{t('hotelAvailability.pageTitle')}</h1>
          <p className="ha-subtitle">{t('hotelAvailability.pageSubtitle')}</p>

          {/* Cancellation Alert */}
          <div className="ha-alert-box">
            <div className="ha-alert-left">
              <ShieldCheck size={24} className="ha-alert-icon" />
              <div className="ha-alert-text">
                <h3>{t('hotelAvailability.freeCancellationTitle')}</h3>
                <p>{t('hotelAvailability.freeCancellationDesc')}</p>
              </div>
            </div>
            <ChevronDown size={20} className="ha-alert-caret" />
          </div>

          {/* Date Picker Grid */}
          <div className="ha-section-lbl-row">
            <span className="ha-section-title">{t('hotelAvailability.selectDates')}</span>
            <span className="ha-nights-badge">{t('hotelAvailability.nightsBadge')}</span>
          </div>

          <div className="ha-dates-grid">
            <div className="ha-field relative" onClick={e => { e.stopPropagation(); setShowCheckInCal(!showCheckInCal); setShowCheckOutCal(false); setShowGuestPicker(false); }}>
              <label>{t('hotelAvailability.checkInLabel')}</label>
              <div className="ha-input-wrap">
                <span className="ha-val-text">{checkIn}</span>
                <span className="ha-sub-val">{t('hotelAvailability.checkInSubLabel')}</span>
              </div>
              <Calendar size={18} className="ha-field-icon" />

              {showCheckInCal && (
                <div className="custom-calendar-popover" style={{ left: '0', top: '100%' }} onClick={e => e.stopPropagation()}>
                  <div className="calendar-header">
                    <button type="button" onClick={() => setCheckInViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>&lt;</button>
                    <span>{monthLabel(checkInViewMonth)}</span>
                    <button type="button" onClick={() => setCheckInViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>&gt;</button>
                  </div>
                  <div className="calendar-grid">
                    {['su','mo','tu','we','th','fr','sa'].map(d => <div key={d} className="cal-day-header">{t(`calendar.${d}`)}</div>)}
                    {Array.from({length: firstWeekdayOfMonth(checkInViewMonth)}, (_, i) => <div key={`e${i}`} className="cal-empty"></div>)}
                    {Array.from({length: daysInMonth(checkInViewMonth)}, (_, i) => i + 1).map(d => {
                      const dayDate = new Date(checkInViewMonth.getFullYear(), checkInViewMonth.getMonth(), d);
                      const isSelected = dayDate.toDateString() === checkInDate.toDateString();
                      return (
                        <div
                          key={d}
                          className={`cal-day ${isSelected ? 'selected' : ''}`}
                          onClick={() => { setCheckInDate(dayDate); setShowCheckInCal(false); }}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="ha-field relative" onClick={e => { e.stopPropagation(); setShowCheckOutCal(!showCheckOutCal); setShowCheckInCal(false); setShowGuestPicker(false); }}>
              <label>{t('hotelAvailability.checkOutLabel')}</label>
              <div className="ha-input-wrap">
                <span className="ha-val-text">{checkOut}</span>
                <span className="ha-sub-val">{t('hotelAvailability.checkOutSubLabel')}</span>
              </div>
              <Calendar size={18} className="ha-field-icon" />

              {showCheckOutCal && (
                <div className="custom-calendar-popover" style={{ right: '0', top: '100%' }} onClick={e => e.stopPropagation()}>
                  <div className="calendar-header">
                    <button type="button" onClick={() => setCheckOutViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>&lt;</button>
                    <span>{monthLabel(checkOutViewMonth)}</span>
                    <button type="button" onClick={() => setCheckOutViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>&gt;</button>
                  </div>
                  <div className="calendar-grid">
                    {['su','mo','tu','we','th','fr','sa'].map(d => <div key={d} className="cal-day-header">{t(`calendar.${d}`)}</div>)}
                    {Array.from({length: firstWeekdayOfMonth(checkOutViewMonth)}, (_, i) => <div key={`e${i}`} className="cal-empty"></div>)}
                    {Array.from({length: daysInMonth(checkOutViewMonth)}, (_, i) => i + 1).map(d => {
                      const dayDate = new Date(checkOutViewMonth.getFullYear(), checkOutViewMonth.getMonth(), d);
                      const isSelected = dayDate.toDateString() === checkOutDate.toDateString();
                      return (
                        <div
                          key={d}
                          className={`cal-day ${isSelected ? 'selected' : ''}`}
                          onClick={() => { setCheckOutDate(dayDate); setShowCheckOutCal(false); }}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guest and Room Grid */}
          <div className="ha-section-lbl-row" style={{ marginTop: '24px' }}>
            <span className="ha-section-title">{t('hotelAvailability.guestsAndRooms')}</span>
          </div>

          <div className="ha-guests-grid">
            <div className="ha-field relative" onClick={e => { e.stopPropagation(); setShowGuestPicker(!showGuestPicker); setShowCheckInCal(false); setShowCheckOutCal(false); }}>
              <label>{t('hotelAvailability.roomsLabel')}</label>
              <div className="ha-input-wrap">
                <span className="ha-val-text">{t('hotelAvailability.roomsSummary').replace('{rooms}', String(guests.rooms))}</span>
              </div>
              <ChevronDown size={18} className="ha-field-icon" />
            </div>

            <div className="ha-field relative" onClick={e => { e.stopPropagation(); setShowGuestPicker(!showGuestPicker); setShowCheckInCal(false); setShowCheckOutCal(false); }}>
              <label>{t('hotelAvailability.guestsLabel')}</label>
              <div className="ha-input-wrap">
                <span className="ha-val-text">{t('hotelAvailability.guestsSummary').replace('{adults}', String(guests.adults)).replace('{children}', String(guests.children))}</span>
              </div>
              <ChevronDown size={18} className="ha-field-icon" />

              {showGuestPicker && (
                <div className="custom-guest-popover" style={{ right: '0', top: '100%' }} onClick={e => e.stopPropagation()}>
                  <div className="guest-row">
                    <div className="guest-info"><span>{t('hotelAvailability.guestPickerRooms')}</span></div>
                    <div className="guest-controls">
                      <button type="button" onClick={() => handleGuestChange('rooms', 'sub')}>-</button>
                      <span>{guests.rooms}</span>
                      <button type="button" onClick={() => handleGuestChange('rooms', 'add')}>+</button>
                    </div>
                  </div>
                  <div className="guest-row">
                    <div className="guest-info"><span>{t('hotelAvailability.guestPickerAdults')}</span><small>{t('hotelAvailability.guestPickerAdultsAge')}</small></div>
                    <div className="guest-controls">
                      <button type="button" onClick={() => handleGuestChange('adults', 'sub')}>-</button>
                      <span>{guests.adults}</span>
                      <button type="button" onClick={() => handleGuestChange('adults', 'add')}>+</button>
                    </div>
                  </div>
                  <div className="guest-row">
                    <div className="guest-info"><span>{t('hotelAvailability.guestPickerChildren')}</span><small>{t('hotelAvailability.guestPickerChildrenAge')}</small></div>
                    <div className="guest-controls">
                      <button type="button" onClick={() => handleGuestChange('children', 'sub')}>-</button>
                      <span>{guests.children}</span>
                      <button type="button" onClick={() => handleGuestChange('children', 'add')}>+</button>
                    </div>
                  </div>
                  <button type="button" className="guest-done-btn" onClick={() => setShowGuestPicker(false)}>{t('hotelAvailability.guestPickerDone')}</button>
                </div>
              )}
            </div>
          </div>

          {availabilityError && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '8px 0 0' }}>{availabilityError}</p>
          )}
          <button type="button" className="ha-btn-submit" onClick={handleCheckAvailability} disabled={checkingAvailability}>
            {checkingAvailability ? t('hotelAvailability.checkingAvailability') : t('hotelAvailability.checkAvailabilityBtn')}
          </button>
          <span className="ha-no-pay-lbl">{t('hotelAvailability.noPaymentRequired')}</span>

        </div>

        {/* Guarantees Row */}
        <div className="ha-footer-benefits">
          <div className="ha-benefit-item">
            <Lock size={16} />
            <span>{t('hotelAvailability.securePayment')}</span>
          </div>
          <div className="ha-benefit-item">
            <CheckCircle2 size={16} />
            <span>{t('hotelAvailability.bestPriceGuaranteed')}</span>
          </div>
          <div className="ha-benefit-item">
            <Star size={16} />
            <span>{t('hotelAvailability.verifiedLuxuryStay')}</span>
          </div>
        </div>
      </main>

      {/* Available Rooms Modal */}
      {showAvailableModal && (
        <div className="ha-modal-overlay">
          <div className="ha-modal">
            <button className="ha-modal-close" onClick={() => setShowAvailableModal(false)}>✕</button>
            <div className="ha-modal-icon-wrap">
              <span className="ha-modal-check">✓</span>
            </div>
            <h2>{t('hotelAvailability.modalRoomsAvailable')}</h2>
            <p>{t('hotelAvailability.modalGreatNews')}</p>
            <button className="ha-modal-continue" onClick={handleContinueToPayment}>{t('hotelAvailability.modalContinueToPayment')}</button>
            <button className="ha-modal-modify" onClick={() => setShowAvailableModal(false)}>{t('hotelAvailability.modalModifySelection')}</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default HotelAvailability;
