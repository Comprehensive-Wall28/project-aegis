# Stage 1: Build
FROM node:20-slim AS build

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies
# Using cache mount for npm significantly speeds up repeat builds
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN --mount=type=cache,target=/root/.npm \
  npm install

# Copy source code
COPY . .

# Build typescript code
RUN npm run build

# Stage 2: Production
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install ONLY production dependencies
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Use cache mount for npm and install production deps only
RUN --mount=type=cache,target=/root/.npm \
  npm install --omit=dev

# Install Playwright dependencies and Chromium
# Consolidate apt-get and clean up in one layer to minimize size
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
  fonts-noto-color-emoji \
  fonts-liberation \
  fonts-noto-cjk \
  && npx playwright install --with-deps chromium \
  && rm -rf /var/lib/apt/lists/* \
  && chmod -R 755 /ms-playwright

# Copy compiled artifacts from the build stage
# Use --chown to avoid expensive separate chown layers
COPY --from=build --chown=node:node /usr/src/app/dist ./dist

# Change ownership of the root dir (just in case for package.json etc)
RUN chown -R node:node /usr/src/app

# Switch to the non-root 'node' user
USER node

# Start the server using node directly (more efficient than npm start)
CMD [ "node", "dist/server.js" ]
