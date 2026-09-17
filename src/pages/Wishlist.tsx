import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Hotel as HotelIcon, Gift, Compass, Bus as BusIcon, Bookmark } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { wishlistService, type WishlistItem, type WishlistItemType } from '../lib/authService';
import { useI18n } from '../contexts/I18nContext';
import './Wishlist.css';

type Category = 'all' | WishlistItemType;

const CATEGORIES: { key: Category; icon: React.ReactNode }[] = [
  { key: 'all', icon: <Bookmark size={16} /> },
  { key: 'hotel', icon: <HotelIcon size={16} /> },
  { key: 'package', icon: <Gift size={16} /> },
  { key: 'experience', icon: <Compass size={16} /> },
  { key: 'bus', icon: <BusIcon size={16} /> },
];

const detailRouteFor = (item: WishlistItem): string => {
  const raw = item.raw_data || {};
  switch (item.item_type) {
    case 'hotel': return `/hotels/${item.item_id}`;
    case 'package': return `/packages/${item.item_id}`;
    case 'experience': return `/experiences/${item.item_id}`;
    case 'bus': {
      const from = (raw.from as string) || '';
      const to = (raw.to as string) || '';
      return `/buses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    default: return '/';
  }
};

const Wishlist: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('all');

  useEffect(() => {
    wishlistService.list().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  const handleRemove = async (item: WishlistItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await wishlistService.toggle(item.item_type, item.item_id);
    } catch {
      wishlistService.list().then(setItems).catch(() => {});
    }
  };

  const filtered = category === 'all' ? items : items.filter((i) => i.item_type === category);

  const categoryLabel = (key: Category) => t(`wishlist.category${key.charAt(0).toUpperCase()}${key.slice(1)}`);

  return (
    <div className="wl-page-wrapper">
      <Navbar theme="blue" />

      <div className="wl-header-section">
        <div className="wl-header-container">
          <Heart size={28} fill="#ffffff" />
          <h1>{t('wishlist.pageTitle')}</h1>
        </div>
      </div>

      <main className="wl-main">
        <div className="wl-container">
          <div className="wl-chips-row">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                className={`wl-chip ${category === c.key ? 'active' : ''}`}
                onClick={() => setCategory(c.key)}
              >
                {c.icon}
                <span>{categoryLabel(c.key)}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <p className="wl-empty-note">{t('common.loading')}</p>
          ) : items.length === 0 ? (
            <div className="wl-empty-state">
              <div className="wl-empty-icon"><Heart size={40} /></div>
              <h2>{t('wishlist.emptyHeading')}</h2>
              <p>{t('wishlist.emptyBody')}</p>
              <button className="wl-empty-cta" onClick={() => navigate('/')}>{t('wishlist.emptyCta')}</button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="wl-empty-note">{t('wishlist.emptyCategory')}</p>
          ) : (
            <div className="wl-grid">
              {filtered.map((item) => {
                const raw = item.raw_data || {};
                const name = (raw.name as string) || (raw.title as string) || item.item_id;
                const image = raw.image as string | undefined;
                const price = raw.price as number | string | undefined;
                const location = (raw.location as string) || (raw.from && raw.to ? `${raw.from} → ${raw.to}` : '');

                return (
                  <div className="wl-card" key={item.id}>
                    <div className="wl-card-img-box">
                      {image ? <img src={image} alt={name} className="wl-card-img" /> : <div className="wl-card-img-placeholder">{CATEGORIES.find(c => c.key === item.item_type)?.icon}</div>}
                      <button className="wl-remove-btn" onClick={() => handleRemove(item)} aria-label={t('wishlist.removeAriaLabel')}>
                        <Heart size={16} fill="#ef4444" color="#ef4444" />
                      </button>
                    </div>
                    <div className="wl-card-body">
                      <span className="wl-card-type">{categoryLabel(item.item_type)}</span>
                      <h3 className="wl-card-name">{name}</h3>
                      {location && <p className="wl-card-location">{location}</p>}
                      <div className="wl-card-footer">
                        {price !== undefined && (
                          <strong className="wl-card-price">{typeof price === 'string' && price.includes('₹') ? price : `₹${price}`}</strong>
                        )}
                        <button className="wl-view-btn" onClick={() => navigate(detailRouteFor(item))}>{t('common.viewDetails')}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Wishlist;
