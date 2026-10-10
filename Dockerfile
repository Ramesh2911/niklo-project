# syntax=docker/dockerfile:1

########################################################################
# Stage 1 — build the Vite bundle
########################################################################
FROM node:22-alpine AS build
WORKDIR /app

# Warm the dependency layer first so source edits don't bust the npm cache
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time config (Vite inlines VITE_* into the bundle).
# Empty default => app falls back to relative "/api/v1" paths,
# which the nginx stage proxies to the backend services.
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_AUTH_BASE_URL
ARG VITE_USER_BASE_URL
ARG VITE_RIDE_BASE_URL
ARG VITE_BUS_BASE_URL
ARG VITE_PAYMENT_BASE_URL
ARG VITE_HOTEL_BASE_URL
ARG VITE_PACKAGE_BASE_URL
ARG VITE_ADVENTURE_BASE_URL
ARG VITE_NOTIFICATION_BASE_URL
ARG VITE_BOOKING_BASE_URL
ARG VITE_AI_PLANNER_BASE_URL
ARG VITE_NGINX_BASE_URL

ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID \
    VITE_AUTH_BASE_URL=$VITE_AUTH_BASE_URL \
    VITE_USER_BASE_URL=$VITE_USER_BASE_URL \
    VITE_RIDE_BASE_URL=$VITE_RIDE_BASE_URL \
    VITE_BUS_BASE_URL=$VITE_BUS_BASE_URL \
    VITE_PAYMENT_BASE_URL=$VITE_PAYMENT_BASE_URL \
    VITE_HOTEL_BASE_URL=$VITE_HOTEL_BASE_URL \
    VITE_PACKAGE_BASE_URL=$VITE_PACKAGE_BASE_URL \
    VITE_ADVENTURE_BASE_URL=$VITE_ADVENTURE_BASE_URL \
    VITE_NOTIFICATION_BASE_URL=$VITE_NOTIFICATION_BASE_URL \
    VITE_BOOKING_BASE_URL=$VITE_BOOKING_BASE_URL \
    VITE_AI_PLANNER_BASE_URL=$VITE_AI_PLANNER_BASE_URL \
    VITE_NGINX_BASE_URL=$VITE_NGINX_BASE_URL

RUN npm run build

########################################################################
# Stage 2 — serve with nginx + reverse-proxy /api/v1 to the services
########################################################################
FROM nginx:1.27-alpine AS runtime
LABEL org.opencontainers.image.title="niklo-frontend"
LABEL org.opencontainers.image.description="Niklo travel SPA served by nginx with /api/v1 reverse proxy"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/proxy-params.conf /etc/nginx/snippets/proxy-params.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
