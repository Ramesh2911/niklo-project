import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ArrowRight, ArrowLeft, Heart, Share2, ChevronUp,
  AirVent, Plug, Layers, Waypoints, Wifi, Droplet, Star, Tag, Calendar, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import './SeatSelectionModal.css';
import { busService, type RawSeat } from '../lib/busService';
import { useI18n } from '../contexts/I18nContext';

import steeringSvgUrl from '../assets/line-md_steering.svg';
import seatIconUrl from '../assets/bus_seat.png';
import bedIconUrl from '../assets/berth_bed.png';

interface SeatSelectionModalProps {
  bus: any;
  date?: string;
  onClose: () => void;
}

// Design's seat/bed glyphs are the brand assets in src/assets (seat.svg, single-bed_(1)_1.svg);
// masked with a solid color so the 3 states (available/selected/booked) can still be tinted.
const SEAT_STATE_COLOR: Record<string, string> = {
  available: '#0052ff',
  selected: '#22c55e',
  booked: '#cbd5e1',
};

const maskIconStyle = (iconUrl: string, size: number, color: string): React.CSSProperties => ({
  width: size,
  height: size,
  color,
  WebkitMaskImage: `url("${iconUrl}")`,
  maskImage: `url("${iconUrl}")`,
});

const iconColor = (state: string, isLadies?: boolean) =>
  isLadies && state === 'available' ? '#db2777' : SEAT_STATE_COLOR[state];

const seatLabel = (seatNo: any) => (seatNo != null && seatNo !== '' ? `S${seatNo}` : null);

const SeaterIcon = ({ state = 'available', size = 32, onClick, seatNo, isLadies }: any) => {
  const label = seatLabel(seatNo);
  return (
    <span className={`seat-cell ${isLadies ? 'ladies' : ''}`}>
      <span className="seat-glyph" style={{ width: size, height: size }}>
        <span
          style={maskIconStyle(seatIconUrl, size, iconColor(state, isLadies))}
          className={`seat-icon ${state}`}
          onClick={state !== 'booked' ? onClick : undefined}
        />
        {label && (
          <span className={`seat-no ${isLadies ? 'ladies' : ''}`}>{label}</span>
        )}
      </span>
    </span>
  );
};

const SleeperIcon = ({ state = 'available', size = 32, onClick, seatNo, isLadies }: any) => {
  const label = seatLabel(seatNo);
  return (
    <span className={`seat-cell ${isLadies ? 'ladies' : ''}`}>
      <span className="seat-glyph" style={{ width: size, height: size }}>
        <span
          style={maskIconStyle(bedIconUrl, size, iconColor(state, isLadies))}
          className={`seat-icon ${state}`}
          onClick={state !== 'booked' ? onClick : undefined}
        />
        {label && (
          <span className={`seat-no ${isLadies ? 'ladies' : ''}`}>{label}</span>
        )}
      </span>
    </span>
  );
};

// 4-column decks use a 2+2 layout (left×2 | aisle | right×2);
// 3-column decks keep the existing 1+2 layout (left | aisle | right×2).
const COLUMN_TO_SLOT_3: Record<number, string> = { 1: 'left', 2: 'right-1', 3: 'right-2' };
const COLUMN_TO_SLOT_4: Record<number, string> = { 1: 'left-1', 2: 'left-2', 3: 'right-1', 4: 'right-2' };

const mapDeckSeats = (seats: RawSeat[]) => {
  const maxCol = seats.reduce((max, s) => Math.max(max, Number(s.column) || 0), 0);
  const slots = maxCol >= 4 ? COLUMN_TO_SLOT_4 : COLUMN_TO_SLOT_3;
  return seats.map((s) => {
    const col = Number(s.column);
    return {
      id: s.seat_number,
      row: Number(s.row) || 1,
      col: slots[col] || (maxCol >= 4 ? 'left-1' : 'left'),
      state: s.is_available ? 'available' : 'booked',
      originalState: (s.is_available ? 'available' : 'booked') as 'available' | 'booked',
      isLadies: Boolean(s.is_ladies_seat),
    };
  });
};

const SeatSelectionModal: React.FC<SeatSelectionModalProps> = ({ bus, date, onClose }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [lowerSeats, setLowerSeats] = useState<ReturnType<typeof mapDeckSeats>>([]);
  const [upperSeats, setUpperSeats] = useState<ReturnType<typeof mapDeckSeats>>([]);
  const [seatsLoading, setSeatsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState('');
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSeatsLoading(true);
    busService.getScheduleSeats(bus.id)
      .then((data) => {
        if (cancelled) return;
        const lower = data.seats.filter((s) => s.deck === 'LOWER');
        const upper = data.seats.filter((s) => s.deck === 'UPPER');
        setLowerSeats(mapDeckSeats(lower));
        setUpperSeats(mapDeckSeats(upper));
      })
      .catch(() => {
        if (!cancelled) { setLowerSeats([]); setUpperSeats([]); }
      })
      .finally(() => { if (!cancelled) setSeatsLoading(false); });
    return () => { cancelled = true; };
  }, [bus.id]);

  const lowerRows = lowerSeats.length ? Math.max(...lowerSeats.map((s) => s.row)) : 0;
  const upperRows = upperSeats.length ? Math.max(...upperSeats.map((s) => s.row)) : 0;

  // Guide §6: after a lock conflict (HTTP 409) the seat map must be refreshed
  // from the server. Selections for seats that are still available are kept;
  // the contested seat (named in the backend error) is dropped.
  const refreshSeatMap = async (opts: { keepSelections?: boolean; deselect?: string } = {}) => {
    try {
      const data = await busService.getScheduleSeats(bus.id);
      const lower = mapDeckSeats(data.seats.filter((s) => s.deck === 'LOWER'));
      const upper = mapDeckSeats(data.seats.filter((s) => s.deck === 'UPPER'));
      if (opts.keepSelections) {
        const previouslySelected = new Set(
          [...lowerSeats, ...upperSeats].filter((s) => s.state === 'selected').map((s) => s.id),
        );
        const restore = (seats: typeof lower) =>
          seats.map((s) =>
            s.id !== opts.deselect && previouslySelected.has(s.id) && s.state === 'available'
              ? { ...s, state: 'selected' as const }
              : s,
          );
        setLowerSeats(restore(lower));
        setUpperSeats(restore(upper));
      } else {
        setLowerSeats(lower);
        setUpperSeats(upper);
      }
    } catch {
      // keep the current view if the refresh itself fails
    }
  };

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleSeatClick = (seatId: string, isUpper: boolean) => {
    const updateSeat = (seats: any[]) => seats.map(s => {
      if (s.id === seatId) {
        if (s.state === 'available') return { ...s, state: 'selected' };
        if (s.state === 'selected') return { ...s, state: s.originalState }; // revert to available
      }
      return s;
    });

    if (isUpper) {
      setUpperSeats(updateSeat(upperSeats));
    } else {
      setLowerSeats(updateSeat(lowerSeats));
    }
  };

  const removeSeat = (seatId: string) => {
    const isUpper = upperSeats.some(s => s.id === seatId);
    handleSeatClick(seatId, isUpper);
  };

  const handleShare = () => {
    const shareData = { title: `${bus.depLoc} to ${bus.arrLoc}`, url: window.location.href };
    if (navigator.share) navigator.share(shareData).catch(() => {});
  };

  const ratingLabel = (rating: number) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4) return 'Very Good';
    if (rating >= 3) return 'Good';
    if (rating >= 2) return 'Average';
    return 'Poor';
  };

  const selectedSeats = [...lowerSeats, ...upperSeats].filter(s => s.state === 'selected');
  const basePrice = selectedSeats.length * bus.price;
  const discount = selectedSeats.length > 0 ? 125 : 0;
  const total = basePrice > 0 ? basePrice - discount : 0;

  const handleContinueBooking = async () => {
    const seatIds = selectedSeats.map(s => s.id);
    setLockError('');
    setIsLocking(true);
    try {
      // Booking creation now rejects seats that aren't held by this user, so
      // the hold has to be taken here before we ever leave this screen.
      await busService.lockSeats(bus.id, seatIds);
    } catch (err) {
      setIsLocking(false);
      // Guide §3.2 / §6: a 409 returns "Seat X is already locked by another
      // user" — surface that message, drop the contested seat, refresh the
      // rest of the map. api.ts throws the backend message as Error.message.
      const serverMsg = err instanceof Error ? err.message : '';
      const isSpecific = Boolean(serverMsg) && !/^\d+$/.test(serverMsg) && !/^HTTP\s/.test(serverMsg);
      setLockError(isSpecific ? serverMsg : t('seatSelection.seatsTakenError'));
      const contested = /seat\s+([A-Za-z0-9]+)/i.exec(serverMsg)?.[1];
      void refreshSeatMap({ keepSelections: true, deselect: contested });
      return;
    }
    setIsLocking(false);
    onClose();
    navigate('/passenger-details', {
      state: {
        scheduleId: bus.id,
        selectedSeats: seatIds,
        busPrice: bus.price,
        busName: bus.name,
        from: bus.depLoc,
        to: bus.arrLoc,
        depTime: bus.depTime,
        travelDate: date,
      },
    });
  };

  const renderSeatIcon = (seat: ReturnType<typeof mapDeckSeats>[number] | undefined, isUpper: boolean) => {
    if (!seat) return null;
    const props = {
      state: seat.state,
      seatNo: seat.id,
      isLadies: seat.isLadies,
      onClick: () => handleSeatClick(seat.id, isUpper),
    };
    return isUpper ? <SleeperIcon {...props} size={40} /> : <SeaterIcon {...props} size={32} />;
  };

  const renderSeatGrid = (seats: any[], isUpper: boolean) => {
    const rows = isUpper ? upperRows : lowerRows;
    const rowArray = Array.from({ length: rows }, (_, i) => i + 1);

    return (
      <div className={`seat-grid ${isUpper ? 'seat-grid--upper' : ''}`}>
            {rowArray.map(r => {
              const rowSeats = seats.filter(s => s.row === r);
              const leftSeat1 = rowSeats.find(s => s.col === 'left' || s.col === 'left-1');
              const leftSeat2 = rowSeats.find(s => s.col === 'left-2');
              const rightSeat1 = rowSeats.find(s => s.col === 'right-1');
              const rightSeat2 = rowSeats.find(s => s.col === 'right-2');

              return (
                <div key={r} className="seat-row">
                  <div className="seat-col left">
                    {renderSeatIcon(leftSeat1, isUpper)}
                    {renderSeatIcon(leftSeat2, isUpper)}
                  </div>
                  <div className="seat-aisle"></div>
                  <div className="seat-col right">
                    {renderSeatIcon(rightSeat1, isUpper)}
                    {renderSeatIcon(rightSeat2, isUpper)}
                  </div>
                </div>
              );
            })}
      </div>
    );
  };

  return (
    <div className="seat-modal-overlay">
      <div className="seat-modal-container">

        {/* Header */}
        <div className="seat-modal-header">
          <button className="btn-close-modal" onClick={onClose}>
            <X size={22} />
          </button>
          <div className="modal-route-title">
            <span>{bus.depLoc}</span>
            <ArrowRight size={20} className="route-arrow" />
            <span>{bus.arrLoc}</span>
          </div>

          {/* Mobile-only header: back arrow + page title/subtitle + wishlist/share */}
          <div className="mobile-header-row">
            <button className="btn-back-mobile" onClick={onClose} aria-label="Back">
              <ArrowLeft size={22} />
            </button>
            <div className="mobile-header-titles">
              <h2>{t('seatSelection.pageHeading')}</h2>
              <p>{t('seatSelection.pageSubtitle')}</p>
            </div>
            <div className="mobile-header-actions">
              <button className={`icon-btn ${liked ? 'liked' : ''}`} onClick={() => setLiked(l => !l)} aria-label="Wishlist">
                <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button className="icon-btn" onClick={handleShare} aria-label="Share">
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="seat-modal-body">

          {/* Left Column */}
          <div className="seat-modal-left">

            <div className="seat-selection-card">
              <div className="legend-header">
                <h3>{t('seatSelection.selectSeatsHeading')}</h3>
                <div className="legend-items">
                  <div className="legend-item">
                    <SeaterIcon state="available" size={20} />
                    <span>{t('seatSelection.legendAvailable')}</span>
                  </div>
                  <div className="legend-item">
                    <SeaterIcon state="selected" size={20} />
                    <span>{t('seatSelection.legendSelected')}</span>
                  </div>
                  <div className="legend-item">
                    <SeaterIcon state="booked" size={20} />
                    <span>{t('seatSelection.legendBooked')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-ladies-chip" aria-hidden="true">S</span>
                    <span>{t('seatSelection.legendLadies')}</span>
                  </div>
                </div>
              </div>

              <div className="decks-wrapper">
                {seatsLoading ? (
                  <p style={{ padding: '24px', color: '#64748b' }}>{t('seatSelection.loadingSeatLayout')}</p>
                ) : (
                  <>
                    {lowerRows > 0 && (
                      <div className="deck-panel">
                        <span className="deck-label">{t('seatSelection.lowerDeck')}</span>
                        <div className="deck-frame">
                          <div className="steering-wheel-badge">
                            <img src={steeringSvgUrl} alt="Steering Wheel" width="24" height="24" />
                          </div>
                          {renderSeatGrid(lowerSeats, false)}
                        </div>
                      </div>
                    )}
                    {upperRows > 0 && (
                      <div className="deck-panel">
                        <span className="deck-label">{t('seatSelection.upperDeck')}</span>
                        <div className="deck-frame">
                          {renderSeatGrid(upperSeats, true)}
                        </div>
                      </div>
                    )}
                    {lowerRows === 0 && upperRows === 0 && (
                      <p style={{ padding: '24px', color: '#64748b' }}>{t('seatSelection.noSeatsAvailable')}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Features Card */}
            <div className="features-card">
              <h3>{t('seatSelection.busFeaturesHeading')}</h3>
              <div className="features-list">
                <span className="feature-pill"><AirVent size={14} /> {t('seatSelection.featureAc')}</span>
                <span className="feature-pill"><Plug size={14} /> {t('seatSelection.featureChargingPoint')}</span>
                <span className="feature-pill"><Layers size={14} /> {t('seatSelection.featureBlanket')}</span>
                <span className="feature-pill"><Waypoints size={14} /> {t('seatSelection.featureLiveTracking')}</span>
                <span className="feature-pill"><Wifi size={14} /> {t('seatSelection.featureWifi')}</span>
                <span className="feature-pill"><Droplet size={14} /> {t('seatSelection.featureWaterBottle')}</span>
              </div>
            </div>

            {/* Ratings Card — only the real per-schedule rating/count from
                bus-service; no fabricated review text or star-distribution
                breakdown since the backend doesn't provide either. */}
            {bus.rating > 0 && (
              <div className="ratings-card">
                <h3>{t('seatSelection.ratingsHeading')}</h3>
                <div className="ratings-content">
                  <div className="rating-summary">
                    <div className="rating-score">
                      <Star size={16} fill="#ffffff" />
                      <span>{bus.rating}</span>
                    </div>
                    <span className="rating-text">{ratingLabel(bus.rating)}</span>
                    <span className="rating-count">{t('seatSelection.basedOnReviews').replace('{{count}}', String(bus.ratingsCount))}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column */}
          <div className="seat-modal-right">

            {/* Trip Details Card */}
            <div className="sidebar-card trip-details-card">
              <h3>{t('seatSelection.tripDetailsHeading')}</h3>
              <div className="trip-timeline">
                <div className="timeline-point">
                  <div className="point-dot start"></div>
                  <div className="point-row">
                    <div className="point-info">
                      <span className="point-meta">{t('seatSelection.boardingLabel')}</span>
                      <span className="point-name">{bus.depTime} • {bus.depLoc}</span>
                    </div>
                    <button className="btn-change">{t('seatSelection.changeButton')}</button>
                  </div>
                </div>
                <div className="timeline-line"></div>
                <div className="timeline-point">
                  <div className="point-dot end"></div>
                  <div className="point-row">
                    <div className="point-info">
                      <span className="point-meta">{t('seatSelection.destinationLabel')}</span>
                      <span className="point-name">{bus.arrTime} • {bus.arrLoc}</span>
                    </div>
                    <button className="btn-change">{t('seatSelection.changeButton')}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown Card (desktop; mobile uses the fixed price sheet below) */}
            <div className="sidebar-card price-card desktop-price-card">
              <h3>{t('seatSelection.priceBreakdownHeading')}</h3>
              <div className="price-row">
                <span className="price-lbl">{t('seatSelection.seatsLabel')} <strong>{selectedSeats.map(s => s.id).join(', ') || '-'}</strong></span>
                <span className="price-val">₹{basePrice}</span>
              </div>
              {selectedSeats.length > 0 && discount > 0 && (
                <div className="discount-pill">
                  <span>{t('seatSelection.savedOnBooking')}</span>
                  <span>- ₹{discount}</span>
                </div>
              )}
              <div className="total-row">
                <span>{t('seatSelection.totalLabel')}</span>
                <span className="total-val">₹{total}</span>
              </div>
              {lockError && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '8px 0 0' }}>{lockError}</p>
              )}
              <button
                className="btn-continue-booking"
                disabled={selectedSeats.length === 0 || isLocking}
                onClick={handleContinueBooking}
              >
                {isLocking ? t('seatSelection.holdingSeats') : t('seatSelection.continueToPassengerDetails')}
              </button>
            </div>

            {/* Offers Card */}
            <div className="sidebar-card offers-card">
              <h3><Tag size={18} className="offer-header-icon" fill="currentColor" strokeWidth={1.5} /> {t('seatSelection.availableOffersHeading')}</h3>
              {selectedSeats.length > 0 && discount > 0 && (
                <div className="savings-banner">
                  <span>{t('seatSelection.savingsBannerText').replace('{{amount}}', String(discount))}</span>
                  <CheckCircle2 size={18} />
                </div>
              )}
              <div className="offer-item">
                <Calendar size={20} className="offer-icon" />
                <div className="offer-info">
                  <h4>{t('seatSelection.freeCancelTitle')}</h4>
                  <p>{t('seatSelection.freeCancelDesc')}</p>
                </div>
              </div>
              <div className="offer-item">
                <ShieldCheck size={20} className="offer-icon" />
                <div className="offer-info">
                  <h4>{t('seatSelection.securePaymentsTitle')}</h4>
                  <p>{t('seatSelection.securePaymentsDesc')}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Mobile-only fixed bottom sheet: price + CTA + selected-seat chips */}
        <div className="mobile-price-sheet">
          <div className="price-sheet-top">
            <div className="price-sheet-price">
              <span className="ps-amount">₹{total}</span>
              <button className="ps-toggle" onClick={() => setShowPriceDetails(v => !v)}>
                {t('seatSelection.viewPriceDetails')}
                <ChevronUp size={16} className={showPriceDetails ? 'expanded' : ''} />
              </button>
            </div>
            <button
              className="btn-continue-booking btn-continue-mobile"
              disabled={selectedSeats.length === 0 || isLocking}
              onClick={handleContinueBooking}
            >
              {isLocking ? t('seatSelection.holdingSeats') : t('seatSelection.continueToPassengerDetails')}
            </button>
          </div>

          {showPriceDetails && (
            <div className="price-sheet-details">
              <div className="price-row">
                <span className="price-lbl">{t('seatSelection.seatsLabel')} <strong>{selectedSeats.map(s => s.id).join(', ') || '-'}</strong></span>
                <span className="price-val">₹{basePrice}</span>
              </div>
              {selectedSeats.length > 0 && discount > 0 && (
                <div className="discount-pill">
                  <span>{t('seatSelection.savedOnBooking')}</span>
                  <span>- ₹{discount}</span>
                </div>
              )}
            </div>
          )}

          {selectedSeats.length > 0 && (
            <div className="price-sheet-seats">
              <div className="selected-seat-chips">
                {selectedSeats.map(s => (
                  <span key={s.id} className="seat-chip">
                    {s.id}
                    <button onClick={() => removeSeat(s.id)} aria-label={`Remove seat ${s.id}`}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <span className="seats-count-label">
                <SeaterIcon state="selected" size={16} />
                {t('seatSelection.seatsSelectedCount').replace('{{count}}', String(selectedSeats.length))}
              </span>
            </div>
          )}

          {lockError && <p className="sheet-lock-error">{lockError}</p>}
        </div>
      </div>
    </div>
  );
};

export default SeatSelectionModal;
