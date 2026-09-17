import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, List, Gift, Ticket, Headphones, BadgePercent,
  ShieldCheck, Star, Bus, Car, ChevronRight, Copy, Check
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import walletSvg from '../assets/wallet.png';
import { paymentService, type WalletTransaction } from '../lib/paymentService';
import { useI18n } from '../contexts/I18nContext';
import './Wallet.css';


const Wallet: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [topupState, setTopupState] = useState<{ status: 'pending' | 'success' | 'error'; message: string } | null>(null);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);

  const refreshWallet = () => {
    paymentService.getWalletInfo()
      .then((info) => {
        setWalletBalance(info.balance);
        setTransactions(info.transactions);
      })
      .catch(() => { /* not signed in / wallet unavailable — keep zero balance, empty history */ });
  };

  useEffect(refreshWallet, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleConfirmAddMoney = async () => {
    const amount = Number(addAmount);
    if (!addAmount || !Number.isFinite(amount) || amount <= 0) {
      setTopupState({ status: 'error', message: t('wallet.errorInvalidAmount') });
      return;
    }

    setTopupState({ status: 'pending', message: t('wallet.topupPendingMessage') });
    try {
      const order = await paymentService.topUpWallet(amount);
      const sdkLoaded = await paymentService.loadRazorpayScript();
      const RazorpayClass = (window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(event: string, handler: (response: unknown) => void): void } }).Razorpay;
      if (sdkLoaded && RazorpayClass) {
        const razorpay = new RazorpayClass({
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          order_id: order.razorpay_order_id,
          name: 'Niklo Wallet Top-up',
          description: 'Wallet Top-up',
          prefill: { name: '', email: '', contact: '' },
          theme: { color: '#0052ff' },
          handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature?: string }) => {
            // Razorpay succeeding client-side doesn't credit anything by itself —
            // payment-service's /wallet/confirm verifies the signature and
            // actually writes the CREDIT transaction.
            paymentService.confirmTopUp(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature)
              .then(() => {
                setTopupState({ status: 'success', message: t('wallet.topupSuccessMessage') });
                refreshWallet();
              })
              .catch(() => {
                setTopupState({ status: 'error', message: t('wallet.topupGenericError') });
              });
          },
          modal: { ondismiss: () => setTopupState({ status: 'error', message: t('wallet.topupGatewayError') }) },
        });
        razorpay.on('payment.failed', () => {
          setTopupState({ status: 'error', message: t('wallet.topupGatewayError') });
        });
        razorpay.open();
      } else {
        setTopupState({ status: 'error', message: t('wallet.topupGatewayError') });
      }
    } catch {
      setTopupState({ status: 'error', message: t('wallet.topupGenericError') });
    }
  };

  const closeAddMoney = () => {
    setShowAddMoney(false);
    setAddAmount('');
    setTopupState(null);
  };

  return (
    <div className="wa-page-wrapper">
      <Navbar theme="blue" />

      {/* Header Info */}
      <div className="wa-header-section">
        <div className="wa-header-container">
          <h1>{t('wallet.pageTitle')}</h1>
          <p>{t('wallet.pageSubtitle')}</p>
        </div>
      </div>

      {/* Main Container */}
      <main className="wa-main">
        <div className="wa-container">
          
          {/* 1. Wallet Header Banner Card */}
          <div className="wa-banner-card">
            <div className="wa-banner-left">
              <span className="wa-lbl">{t('wallet.availableBalance')}</span>
              <strong className="wa-balance">₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              {!showAddMoney ? (
                <button className="wa-add-btn" onClick={() => setShowAddMoney(true)}>{t('wallet.addMoneyButton')}</button>
              ) : (
                <div className="wa-add-money-form">
                  <div className="wa-add-money-row">
                    <span className="wa-add-money-prefix">₹</span>
                    <input
                      type="number"
                      min="1"
                      autoFocus
                      placeholder={t('wallet.amountInputPlaceholder')}
                      value={addAmount}
                      onChange={e => setAddAmount(e.target.value)}
                      className="wa-add-money-input"
                    />
                  </div>
                  <div className="wa-add-money-actions">
                    <button className="wa-add-btn" onClick={handleConfirmAddMoney} disabled={topupState?.status === 'pending'}>{t('wallet.confirmButton')}</button>
                    <button className="wa-add-money-cancel" onClick={closeAddMoney}>{t('wallet.cancelButton')}</button>
                  </div>
                  {topupState && (
                    <span className={`wa-add-money-msg ${topupState.status}`}>{topupState.message}</span>
                  )}
                </div>
              )}
            </div>

            <div className="wa-banner-middle">
              <img src={walletSvg} alt={t('wallet.walletIllustrationAlt')} className="wa-wallet-graphic" />
            </div>

            <div className="wa-banner-right">
              <span className="wa-cashback-lbl">{t('wallet.unlockCashback')}</span>
              <strong className="wa-cashback-val">₹200 OFF</strong>
              <p>{t('wallet.cashbackOffer')}</p>
            </div>
          </div>

          {/* 2. Action Menu Row */}
          <div className="wa-action-menu">
            <button className="wa-menu-item" onClick={() => document.getElementById('recent-transactions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <div className="wa-menu-icon-box">
                <List size={20} />
              </div>
              <span>{t('wallet.menuTransactionHistory')}</span>
            </button>
            <button className="wa-menu-item" onClick={() => navigate('/referral')}>
              <div className="wa-menu-icon-box">
                <Gift size={20} />
              </div>
              <span>{t('wallet.menuReferAndEarn')}</span>
            </button>
            <button className="wa-menu-item" onClick={() => navigate('/offers')}>
              <div className="wa-menu-icon-box">
                <Ticket size={20} />
              </div>
              <span>{t('wallet.menuExclusiveOffers')}</span>
            </button>
            <button className="wa-menu-item" onClick={() => navigate('/help')}>
              <div className="wa-menu-icon-box">
                <Headphones size={20} />
              </div>
              <span>{t('wallet.menuHelpAndSupport')}</span>
            </button>
          </div>

          {/* 3. Recent Transactions */}
          <section className="wa-section" id="recent-transactions">
            <div className="wa-section-header">
              <h2>{t('wallet.recentTransactionsSectionTitle')}</h2>
              {/* ponytail: transactions list below is already the full history from the API (no pagination) — nothing more to reveal */}
              <a href="#all" className="wa-view-all" onClick={e => e.preventDefault()}>{t('wallet.viewAll')}</a>
            </div>

            <div className="wa-transactions-list">
              {transactions.map(tx => (
                <div key={tx.id} className="wa-tx-row">
                  <div className="wa-tx-left">
                    <div className={`wa-tx-icon-box ${tx.color}`}>
                      {tx.type === 'add' && <Plus size={18} />}
                      {tx.type === 'bus' && <Bus size={18} />}
                      {tx.type === 'cashback' && <Star size={18} />}
                      {tx.type === 'cab' && <Car size={18} />}
                    </div>
                    <div className="wa-tx-info">
                      <h3>{tx.title}</h3>
                      <p>{tx.desc} • {tx.date}</p>
                    </div>
                  </div>
                  <div className="wa-tx-right">
                    <strong className={`wa-tx-amt ${tx.amount.startsWith('+') ? 'green' : ''}`}>{tx.amount}</strong>
                    <span className="wa-tx-bal">{tx.balance}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Exclusive Offers */}
          <section className="wa-section">
            <div className="wa-section-header">
              <h2>{t('wallet.exclusiveOffersSectionTitle')}</h2>
              <a href="#all" className="wa-view-all" onClick={e => { e.preventDefault(); navigate('/offers'); }}>{t('wallet.viewAll')}</a>
            </div>

            <div className="wa-offers-grid">
              <div className="wa-offer-box light-green">
                <div className="wa-offer-badge green">
                  <BadgePercent size={24} />
                </div>
                <h3>{t('wallet.offer1Title')}</h3>
                <p>{t('wallet.offer1Description')}</p>
                <div className="wa-offer-code-wrap" onClick={() => handleCopy('BUS100')}>
                  <div className="wa-offer-code">
                    <span>{t('wallet.offerCodePrefix')} BUS100</span>
                  </div>
                  <button className="wa-copy-btn">
                    {copiedCode === 'BUS100' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
                </div>
                <span className="wa-offer-expiry">Valid till 31 May 2024</span>
              </div>

              <div className="wa-offer-box light-blue">
                <div className="wa-offer-badge blue">
                  <BadgePercent size={24} />
                </div>
                <h3>{t('wallet.offer2Title')}</h3>
                <p>{t('wallet.offer2Description')}</p>
                <div className="wa-offer-code-wrap" onClick={() => handleCopy('RIDE20')}>
                  <div className="wa-offer-code">
                    <span>{t('wallet.offerCodePrefix')} RIDE20</span>
                  </div>
                  <button className="wa-copy-btn">
                    {copiedCode === 'RIDE20' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
                </div>
                <span className="wa-offer-expiry">Valid till 25 May 2024</span>
              </div>
            </div>
          </section>

          {/* 5. Trust Security Alert */}
          <div className="wa-security-alert">
            <div className="wa-security-alert-row">
              <div className="wa-sec-left">
                <ShieldCheck size={20} className="wa-sec-icon" />
                <div className="wa-sec-text">
                  <strong>{t('wallet.securityAlertTitle')}</strong>
                  <span>{t('wallet.securityAlertSubtitle')}</span>
                </div>
              </div>
              <a href="#details" className="wa-sec-link" onClick={e => { e.preventDefault(); setShowSecurityDetails(v => !v); }}>
                <span>{t('wallet.securityKnowMore')}</span>
                <ChevronRight size={16} className={showSecurityDetails ? 'wa-chevron-open' : ''} />
              </a>
            </div>
            {showSecurityDetails && (
              <p className="wa-sec-details">
                {t('wallet.securityDetails')}
              </p>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Wallet;
