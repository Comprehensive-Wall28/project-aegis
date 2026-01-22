# Stage 1: Build
FROM node:20-slim AS build

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies
# Skip puppeteer download as we will use system chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install

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
RUN npm install --omit=dev

# Install Playwright dependencies and Chromium
# We do this AFTER npm install to avoid warnings and ensure version compatibility
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium \
  && chmod -R 777 /ms-playwright

# Install additional fonts for high-quality rendering (Emoji, CJK, etc)
RUN apt-get update && apt-get install -y \
  fonts-noto-color-emoji \
  fonts-liberation \
  fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

# Copy compiled artifacts from the build stage
COPY --from=build /usr/src/app/dist ./dist

# Change ownership of the app directory to the node user
RUN chown -R node:node /usr/src/app

# Switch to the non-root 'node' user
USER node

# Start the server using node directly (more efficient than npm start)
CMD [ "node", "dist/server.js" ]
