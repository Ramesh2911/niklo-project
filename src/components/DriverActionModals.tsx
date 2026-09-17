import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, Volume2, Grid3x3, PhoneOff, Send, Copy, Siren, ShieldCheck, TriangleAlert, ChevronRight } from 'lucide-react';
import './DriverActionModals.css';

export type DriverActionMode = 'call' | 'message' | 'share' | 'safety' | null;

interface DriverActionModalsProps {
  mode: DriverActionMode;
  driverName: string;
  driverAvatar: string;
  pickupLocation: string;
  onClose: () => void;
}

const DriverActionModals: React.FC<DriverActionModalsProps> = ({ mode, driverName, driverAvatar, pickupLocation, onClose }) => {
  if (!mode) return null;
  return (
    <div className="dam-backdrop" role="dialog" aria-modal="true">
      {mode === 'call' && <CallModal driverName={driverName} driverAvatar={driverAvatar} onClose={onClose} />}
      {mode === 'message' && <MessageModal driverName={driverName} driverAvatar={driverAvatar} onClose={onClose} />}
      {mode === 'share' && <ShareModal onClose={onClose} />}
      {mode === 'safety' && <SafetyModal driverName={driverName} pickupLocation={pickupLocation} onClose={onClose} />}
    </div>
  );
};

export default DriverActionModals;

// ── Call ─────────────────────────────────────────────────────────────────────

const CallModal: React.FC<{ driverName: string; driverAvatar: string; onClose: () => void }> = ({ driverName, driverAvatar, onClose }) => {
  const [status, setStatus] = useState<'Connecting…' | 'Ringing…' | 'Connected'>('Connecting…');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const t1 = window.setTimeout(() => setStatus('Ringing…'), 1200);
    const t2 = window.setTimeout(() => setStatus('Connected'), 3200);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (status !== 'Connected') return;
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [status]);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="dam-call-screen">
      <div className="dam-call-top">
        <h3>{driverName}</h3>
        <p className={status === 'Connected' ? 'connected' : ''}>{status === 'Connected' ? formatted : status}</p>
      </div>
      <div className="dam-call-avatar-wrap">
        <img src={driverAvatar} alt={driverName} className="dam-call-avatar" />
      </div>
      <div className="dam-call-bottom">
        <div className="dam-call-options">
          <button type="button" className="dam-call-opt"><Mic size={20} /><span>Mute</span></button>
          <button type="button" className="dam-call-opt"><Volume2 size={20} /><span>Speaker</span></button>
          <button type="button" className="dam-call-opt"><Grid3x3 size={20} /><span>Dialer</span></button>
        </div>
        <button type="button" className="dam-call-end" aria-label="End call" onClick={onClose}>
          <PhoneOff size={26} />
        </button>
      </div>
    </div>
  );
};

// ── Message ──────────────────────────────────────────────────────────────────

interface ChatMsg { sender: 'driver' | 'user'; text: string }

const canPlyReply = (text: string): string => {
  const low = text.toLowerCase();
  if (low.includes('where') || low.includes('eta') || low.includes('time')) {
    return "I've crossed the main signal. Arriving in about 2 minutes.";
  }
  if (low.includes('gate') || low.includes('lobby') || low.includes('outside')) {
    return "Perfect, please wait at the gate. I'll pull up shortly.";
  }
  if (low.includes('hello') || low.includes('hi')) {
    return 'Hi! Yes, I am headed your way.';
  }
  return 'Got it. See you shortly!';
};

const MessageModal: React.FC<{ driverName: string; driverAvatar: string; onClose: () => void }> = ({ driverName, driverAvatar, onClose }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([{ sender: 'driver', text: 'Hello! I am on my way to your location.' }]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { sender: 'user', text }]);
    setInput('');
    window.setTimeout(() => {
      setMessages((m) => [...m, { sender: 'driver', text: canPlyReply(text) }]);
    }, 900);
  };

  return (
    <div className="dam-sheet dam-chat-sheet">
      <div className="dam-chat-header">
        <img src={driverAvatar} alt={driverName} className="dam-chat-avatar" />
        <div className="dam-chat-header-text">
          <h4>{driverName}</h4>
          <span><span className="dam-online-dot" />Online</span>
        </div>
        <button type="button" className="dam-close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>
      <div className="dam-chat-messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`dam-chat-bubble ${m.sender}`}>{m.text}</div>
        ))}
      </div>
      <div className="dam-chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type your message…"
        />
        <button type="button" onClick={send} aria-label="Send message"><Send size={18} /></button>
      </div>
    </div>
  );
};

// ── Share ────────────────────────────────────────────────────────────────────

const ShareModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const trackingUrl = `${window.location.origin}/track/${Math.random().toString(36).slice(2, 10)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — the link is still visible to copy manually
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My ride tracking link', url: trackingUrl });
      } catch {
        // user cancelled the native share sheet
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="dam-sheet">
      <div className="dam-sheet-header">
        <h3>Share Ride Status</h3>
        <button type="button" className="dam-close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>
      <p className="dam-sheet-desc">Share your live tracking link with family and friends so they can follow your journey.</p>
      <div className="dam-link-row">
        <span className="dam-link-text">{trackingUrl}</span>
        <button type="button" className="dam-copy-btn" onClick={handleCopy}>
          <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {!!navigator.share && (
        <button type="button" className="dam-share-native-btn" onClick={handleShare}>Share via…</button>
      )}
    </div>
  );
};

// ── Safety ───────────────────────────────────────────────────────────────────

const SafetyModal: React.FC<{ driverName: string; pickupLocation: string; onClose: () => void }> = ({ driverName, pickupLocation, onClose }) => {
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [toast, setToast] = useState('');
  const pin = '4821';

  useEffect(() => {
    if (!sosActive) return;
    if (countdown <= 0) {
      setSosActive(false);
      setToast('SOS alert sent! Dispatching assistance & emergency contacts notified.');
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [sosActive, countdown]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (sosActive) {
    return (
      <div className="dam-sheet dam-sos-active">
        <TriangleAlert size={56} />
        <h3>Sending SOS Alert</h3>
        <p>Calling emergency services and sharing live location from {pickupLocation} in:</p>
        <div className="dam-sos-count">{countdown}</div>
        <button type="button" className="dam-sos-cancel" onClick={() => { setSosActive(false); setCountdown(5); }}>Cancel SOS</button>
      </div>
    );
  }

  return (
    <div className="dam-sheet">
      <div className="dam-sheet-header">
        <h3>Safety Center</h3>
        <button type="button" className="dam-close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>

      <div className="dam-pin-row">
        <div>
          <strong>Ride Verification PIN</strong>
          <p>Share this PIN with {driverName} before boarding to verify the ride.</p>
        </div>
        <span className="dam-pin-value">{pin}</span>
      </div>

      <button type="button" className="dam-safety-tile" onClick={() => { setCountdown(5); setSosActive(true); }}>
        <span className="dam-safety-icon danger"><Siren size={20} /></span>
        <span className="dam-safety-tile-text">
          <strong>Emergency SOS</strong>
          <small>Directly call emergency dispatch and alert family</small>
        </span>
        <ChevronRight size={18} />
      </button>

      <button type="button" className="dam-safety-tile" onClick={() => setToast('Connecting to Niklo Safety Helpline…')}>
        <span className="dam-safety-icon info"><ShieldCheck size={20} /></span>
        <span className="dam-safety-tile-text">
          <strong>24/7 Safety Helpline</strong>
          <small>Connect instantly with Niklo's dedicated safety team</small>
        </span>
        <ChevronRight size={18} />
      </button>

      <button type="button" className="dam-safety-tile" onClick={() => setToast('Opening report issue form…')}>
        <span className="dam-safety-icon warn"><TriangleAlert size={20} /></span>
        <span className="dam-safety-tile-text">
          <strong>Report Security Issue</strong>
          <small>Report driver behavior or vehicle concerns</small>
        </span>
        <ChevronRight size={18} />
      </button>

      {toast && <div className="dam-toast">{toast}</div>}
    </div>
  );
};
