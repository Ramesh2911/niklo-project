import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import {
  UserPlus, FilePenLine, CircleCheck, Gift, Copy, Check, ChevronRight
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import referralHeroSvg from '../assets/refer_earn.png';
import { useI18n } from '../contexts/I18nContext';
import { userService, type ReferralStats } from '../lib/userService';
import './Referral.css';

const Referral: React.FC = () => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getReferrals().then(setReferral).catch(() => setReferral(null)).finally(() => setLoading(false));
  }, []);

  const referralCode = referral?.referral_code || '';

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = async () => {
    if (!referralCode) return;
    const shareText = `Join me on Niklo Travel and get rewards! Use my referral code ${referralCode}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Niklo Travel', text: shareText });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(shareText);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="re-page-wrapper">
      <Navbar theme="blue" />

      {/* Main Container */}
      <main className="re-main">
        <div className="re-container">
          
          {/* Backend notice */}
          <div style={{ background: '#422006', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.85rem', color: '#fbbf24' }}>
            {t('referral.bannerComingSoon')}
          </div>

          {/* 1. Header Banner Card */}
          <div className="re-banner-card">
            <div className="re-banner-left">
              <h1>{t('referral.bannerHeading')}</h1>
              <p>
                {t('referral.bannerDescription')}
              </p>
              <button className="re-share-btn" onClick={handleShareInvite}>{shared ? t('referral.shareInviteCopied') : t('referral.shareInviteButton')}</button>
            </div>

            <div className="re-banner-right">
              <img src={referralHeroSvg} alt={t('referral.referralIllustrationAlt')} className="re-hero-graphic" />
            </div>
          </div>

          {/* 2. Centered Floating Referral Code Card */}
          <div className="re-code-section">
            <div className="re-code-card">
              <span className="re-code-lbl">{t('referral.referralCodeLabel')}</span>
              <div className="re-code-box" onClick={handleCopyCode}>
                <span className="re-code-val">{loading ? t('common.loading') : referralCode || '—'}</span>
                <button className="re-copy-btn">
                  {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
                </button>
              </div>
              <span className="re-code-note">{t('referral.referralCodeNote')}</span>
              {referral && <span className="re-code-note">{referral.total_referrals} referrals • {referral.currency} {referral.total_earned.toLocaleString('en-IN')} earned</span>}
            </div>
          </div>

          {/* 3. How It Works */}
          <section className="re-how-it-works">
            <h2>{t('referral.howItWorksHeading')}</h2>

            <div className="re-steps-row">
              <div className="re-step-item">
                <div className="re-step-icon-box">
                  <UserPlus size={22} />
                </div>
                <h3>{t('referral.stepInviteFriends')}</h3>
              </div>

              <div className="re-step-divider"></div>

              <div className="re-step-item">
                <div className="re-step-icon-box">
                  <FilePenLine size={22} />
                </div>
                <h3>{t('referral.stepFriendSignsUp')}</h3>
              </div>

              <div className="re-step-divider"></div>

              <div className="re-step-item">
                <div className="re-step-icon-box">
                  <CircleCheck size={22} />
                </div>
                <h3>{t('referral.stepFriendCompletesBooking')}</h3>
              </div>

              <div className="re-step-divider"></div>

              <div className="re-step-item">
                <div className="re-step-icon-box">
                  <Gift size={22} />
                </div>
                <h3>{t('referral.stepBothEarnRewards')}</h3>
              </div>
            </div>
          </section>

          {/* 4. Recent Referrals */}
          <section className="re-section">
            <div className="re-section-header">
              <h2>{t('referral.recentReferralsHeading')}</h2>
              {/* ponytail: REFERRALS_DATA above is already the full list — no pagination/backend to page through, so this is a no-op rather than a fake "loading more" alert */}
              <a href="#all" className="re-view-all" onClick={e => e.preventDefault()}>{t('referral.viewAllReferrals')}</a>
            </div>

            <div className="re-table-wrapper">
              <div className="re-table-header">
                <span>{t('referral.tableHeaderFriendDetails')}</span>
                <span>{t('referral.tableHeaderStatusReward')}</span>
              </div>

              <div className="re-table-body">
                <div className="re-table-row">
                  <div className="re-friend-text">
                    <h3>{loading ? t('common.loading') : `${referral?.total_referrals ?? 0} referrals`}</h3>
                    <p>{referral ? `${referral.currency} ${referral.total_earned.toLocaleString('en-IN')} earned` : 'Referral history unavailable.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Bottom Call to Action */}
          <div className="re-cta-banner">
            <div className="re-cta-left">
              <h2>{t('referral.ctaHeading')}</h2>
              <p>{t('referral.ctaDescription')}</p>
            </div>
            <button className="re-cta-btn" onClick={handleCopyCode}>
              <span>{t('referral.referNowButton')}</span>
              <ChevronRight size={16} />
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Referral;
