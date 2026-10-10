import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';

const GetStarted = lazy(() => import('./pages/GetStarted'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Home = lazy(() => import('./pages/Home'));
const BusBooking = lazy(() => import('./pages/BusBooking'));
const PassengerDetails = lazy(() => import('./pages/PassengerDetails'));
const BookingSuccess = lazy(() => import('./pages/BookingSuccess'));
const CabBooking = lazy(() => import('./pages/CabBooking'));
const PackagesHome = lazy(() => import('./pages/PackagesHome'));
const PackagesList = lazy(() => import('./pages/PackagesList'));
const PackageDetails = lazy(() => import('./pages/PackageDetails'));
const PackageCheckout = lazy(() => import('./pages/PackageCheckout'));
const HotelsHome = lazy(() => import('./pages/HotelsHome'));
const HotelsList = lazy(() => import('./pages/HotelsList'));
const HotelDetails = lazy(() => import('./pages/HotelDetails'));
const HotelAvailability = lazy(() => import('./pages/HotelAvailability'));
const HotelCheckout = lazy(() => import('./pages/HotelCheckout'));
const ExperiencesHome = lazy(() => import('./pages/ExperiencesHome'));
const ExperiencesList = lazy(() => import('./pages/ExperiencesList'));
const ExperienceDetails = lazy(() => import('./pages/ExperienceDetails'));
const ExperienceCheckout = lazy(() => import('./pages/ExperienceCheckout'));
const Offers = lazy(() => import('./pages/Offers'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Referral = lazy(() => import('./pages/Referral'));
const AiPlanner = lazy(() => import('./pages/AiPlanner'));
const AiPlannerList = lazy(() => import('./pages/AiPlannerList'));
const AiPlannerDetails = lazy(() => import('./pages/AiPlannerDetails'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const PrivacySecurity = lazy(() => import('./pages/PrivacySecurity'));
const BusRouteLanding = lazy(() => import('./pages/BusRouteLanding'));
const About = lazy(() => import('./pages/About'));
const Careers = lazy(() => import('./pages/Careers'));
const Blog = lazy(() => import('./pages/Blog'));
const Sustainability = lazy(() => import('./pages/Sustainability'));
const PressCenter = lazy(() => import('./pages/PressCenter'));
const InvestorRelations = lazy(() => import('./pages/InvestorRelations'));
const CancellationPolicy = lazy(() => import('./pages/CancellationPolicy'));

// Adventure partner panel (/partner) — English-only admin UI.
const PartnerLayout = lazy(() => import('./pages/partner/PartnerLayout'));
const PartnerDashboard = lazy(() => import('./pages/partner/PartnerDashboard'));
const PartnerSetup = lazy(() => import('./pages/partner/PartnerSetup'));
const PartnerActivities = lazy(() => import('./pages/partner/PartnerActivities'));
const PartnerPackages = lazy(() => import('./pages/partner/PartnerPackages'));
const PartnerAvailability = lazy(() => import('./pages/partner/PartnerAvailability'));
const PartnerBookings = lazy(() => import('./pages/partner/PartnerBookings'));
const PartnerEarnings = lazy(() => import('./pages/partner/PartnerEarnings'));
const PartnerNotifications = lazy(() => import('./pages/partner/PartnerNotifications'));
const PartnerProfile = lazy(() => import('./pages/partner/PartnerProfile'));

// No scroll restoration on navigate by default with react-router — reset to top
// on every route change so a new page doesn't open mid-scroll from the last one.
// When the URL has a #hash (e.g. /privacy-security#privacy-policy), scroll to
// that section instead — retry briefly so lazy-loaded pages exist first.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer: number | undefined;
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries++ < 20) {
        timer = window.setTimeout(scroll, 50);
        return;
      }
      window.scrollTo(0, 0);
    };
    scroll();
    return () => { if (timer) window.clearTimeout(timer); };
  }, [pathname, hash]);
  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
    <I18nProvider>
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <a href="#main-content" className="skip-to-main">Skip to main content</a>
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', fontSize: '1rem' }}>Loading…</div>}>
          <div id="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/welcome" element={<GetStarted />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/buses" element={<BusBooking />} />
            <Route path="/cabs" element={<CabBooking />} />
            <Route path="/passenger-details" element={<RequireAuth><PassengerDetails /></RequireAuth>} />
            <Route path="/booking-success" element={<RequireAuth><BookingSuccess /></RequireAuth>} />
            <Route path="/packages" element={<PackagesHome />} />
            <Route path="/packages/search" element={<PackagesList />} />
            <Route path="/packages/checkout" element={<RequireAuth><PackageCheckout /></RequireAuth>} />
            <Route path="/packages/:id" element={<PackageDetails />} />
            <Route path="/hotels" element={<HotelsHome />} />
            <Route path="/hotels/search" element={<HotelsList />} />
            <Route path="/hotels/:id" element={<HotelDetails />} />
            <Route path="/hotels/:id/availability" element={<HotelAvailability />} />
            <Route path="/hotels/:id/checkout" element={<RequireAuth><HotelCheckout /></RequireAuth>} />
            <Route path="/experiences" element={<ExperiencesHome />} />
            <Route path="/experiences/search" element={<ExperiencesList />} />
            <Route path="/experiences/:id" element={<ExperienceDetails />} />
            <Route path="/experiences/:id/checkout" element={<RequireAuth><ExperienceCheckout /></RequireAuth>} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
            <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
            <Route path="/referral" element={<Referral />} />
            <Route path="/ai-planner" element={<AiPlanner />} />
            <Route path="/ai-planner/search" element={<AiPlannerList />} />
            <Route path="/ai-planner/breakdown" element={<AiPlannerDetails />} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
            <Route path="/privacy-security" element={<PrivacySecurity />} />
            <Route path="/about" element={<About />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/sustainability" element={<Sustainability />} />
            <Route path="/press" element={<PressCenter />} />
            <Route path="/investors" element={<InvestorRelations />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />
            <Route path="/bus/:slug" element={<BusRouteLanding />} />
            <Route path="/partner" element={<PartnerLayout />}>
              <Route index element={<PartnerDashboard />} />
              <Route path="setup" element={<PartnerSetup />} />
              <Route path="activities" element={<PartnerActivities />} />
              <Route path="activities/:activityId/packages" element={<PartnerPackages />} />
              <Route path="availability" element={<PartnerAvailability />} />
              <Route path="bookings" element={<PartnerBookings />} />
              <Route path="earnings" element={<PartnerEarnings />} />
              <Route path="notifications" element={<PartnerNotifications />} />
              <Route path="profile" element={<PartnerProfile />} />
            </Route>
          </Routes>
          </div>
        </Suspense>
      </Router>
    </AuthProvider>
    </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
