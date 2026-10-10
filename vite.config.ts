import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const p = (target: string) => ({ target, changeOrigin: true })

export default defineConfig(({ mode }) => {
  // Service URLs — routed directly to bypass the nginx gateway. Sourced from
  // .env (VITE_*_BASE_URL) so prod endpoint rotations are a one-file edit
  // instead of a code change; falls back to the values known at write-time.
  const env = loadEnv(mode, process.cwd(), '');
  const SVC = {
    auth:         env.VITE_AUTH_BASE_URL || 'http://szs601uiqefhc8jbpeq587f3.187.127.157.13.sslip.io/api/v1',
    user:         env.VITE_USER_BASE_URL || 'http://f11slpsqn3bkula8r1yr292u.187.127.157.13.sslip.io/api/v1',
    ride:         env.VITE_RIDE_BASE_URL || 'http://my41fssoetuy2w34a2yettfe.187.127.157.13.sslip.io/api/v1',
    bus:          env.VITE_BUS_BASE_URL || 'http://w1n68oxs2na9q9tbveqsqa4s.187.127.157.13.sslip.io/api/v1',
    payment:      env.VITE_PAYMENT_BASE_URL || 'http://n13chiypv5vg517ffvioht20.187.127.157.13.sslip.io/api/v1',
    hotel:        env.VITE_HOTEL_BASE_URL || 'http://b5m0ntg98i0cpdaidmcvdqwd.187.127.157.13.sslip.io/api/v1',
    packages:     env.VITE_PACKAGE_BASE_URL || 'http://ltmzir9qa389f53ho5hkzlq0.187.127.157.13.sslip.io/api/v1',
    adventures:   env.VITE_ADVENTURE_BASE_URL || 'http://ra0qdnh3xfolrfu1y82bva9g.187.127.157.13.sslip.io/api/v1',
    notification: env.VITE_NOTIFICATION_BASE_URL || 'http://l2pdf6ail6mlmurxhtjjf44i.187.127.157.13.sslip.io/api/v1',
    booking:      env.VITE_BOOKING_BASE_URL || 'http://yjfbvszz8e2yv5sefwcpxye4.187.127.157.13.sslip.io/api/v1',
    driver:       env.VITE_DRIVER_BASE_URL || 'http://ebzdp7jvp5z5bhrl05tkvxsa.187.127.157.13.sslip.io/api/v1',
    aiPlanner:    env.VITE_AI_PLANNER_BASE_URL || 'http://s3knzzbxvavkb4t218hgb9nh.187.127.157.13.sslip.io/api/v1',
    nginx:        env.VITE_NGINX_BASE_URL || 'http://irtucumwj9akelon0k4iyatv.187.127.157.13.sslip.io/api/v1',
  };

  return {
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // jsdom's default document URL is the opaque origin "about:blank", where
    // localStorage throws SecurityError — a real http(s) URL gives it a
    // proper origin so localStorage actually works in tests.
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
  },
  server: {
    proxy: {
      '/api/v1/auth':          p(SVC.auth),
      '/api/v1/users/profile': p(SVC.user),
      '/api/v1/user/profile':  p(SVC.user),
      '/api/v1/addresses':     p(SVC.user),
      '/api/v1/wishlist':      p(SVC.user),
      '/api/v1/users':         p(SVC.user),
      '/api/v1/user':          p(SVC.user),
      '/api/v1/ride':          p(SVC.ride),
      '/api/v1/bus':           p(SVC.bus),
      '/api/v1/adventures':    p(SVC.adventures),
      // singular prefix = partner-panel routes (/adventure/activities, ...); no
      // overlap with the plural consumer prefix above
      '/api/v1/adventure':      p(SVC.adventures),
      '/api/v1/notifications': p(SVC.notification),
      '/api/v1/driver':        p(SVC.driver),
      '/api/v1/ai-planner':    p(SVC.aiPlanner),
      '/api/v1/payment':       p(SVC.payment),
      // hotel-created bookings live on hotel-service; everything else (create/cancel/my-bookings) on booking-service
      '/api/v1/bookings/hotel': p(SVC.hotel),
      '/api/v1/bookings':       p(SVC.booking),
      '/api/v1/offers':         p(SVC.booking),
      '/api/v1/recommendations':p(SVC.booking),
      '/api/v1/promotions':     p(SVC.booking),
      '/api/v1/user/active-trip': p(SVC.booking),
      // ride-service's live driver-tracking Socket.IO gateways
      '/socket.io':            { ...p(SVC.ride), ws: true },
    },
  },
  }
})
