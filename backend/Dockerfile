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

# Install Playwright dependencies and Chromium
# We use a global path to ensure the 'node' user can access the browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install-deps chromium \
  && npx playwright install chromium \
  && chmod -R 777 /ms-playwright

# Install fonts for high-quality rendering (Emoji, CJK, etc)
RUN apt-get update && apt-get install -y \
  fonts-noto-color-emoji \
  fonts-liberation \
  fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install ONLY production dependencies
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --omit=dev

# Set Puppeteer executable path to system chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy compiled artifacts from the build stage
COPY --from=build /usr/src/app/dist ./dist

# Change ownership of the app directory to the node user
RUN chown -R node:node /usr/src/app

# Switch to the non-root 'node' user
USER node

# Start the server using node directly (more efficient than npm start)
CMD [ "node", "dist/server.js" ]
