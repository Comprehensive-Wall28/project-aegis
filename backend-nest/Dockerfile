# Stage 1: Build
FROM node:lts-slim AS build
WORKDIR /usr/src/app
COPY package*.json ./
# Skip chromium download (we install system deps later)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:lts-slim
WORKDIR /usr/src/app
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --omit=dev

# --- PLAYWRIGHT SETUP (Critical for Scraper) ---
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Install dependencies + Chromium
# Using npx playwright install might require @playwright/test or playwright package
RUN npx playwright install --with-deps chromium \
    && chmod -R 777 /ms-playwright

# Install fonts (Emoji, CJK)
RUN apt-get update && apt-get install -y \
    fonts-noto-color-emoji \
    fonts-liberation \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*
# -----------------------------------------------

COPY --from=build /usr/src/app/dist ./dist
RUN chown -R node:node /usr/src/app
USER node

# Start NestJS (Fastify)
CMD [ "node", "dist/main.js" ]
