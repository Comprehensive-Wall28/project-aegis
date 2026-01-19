# Stage 1: Build
FROM node:20-slim AS build

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm install

# Copy source code
COPY . .

# Build typescript code
RUN npm run build

# Stage 2: Production
FROM node:20-slim

# Install latest chrome dev package and fonts to support major charsets
# This is needed at runtime for Puppeteer/Scraper features
RUN apt-get update \
  && apt-get install -y wget gnupg \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
  && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Determine the path of the installed Google Chrome
RUN which google-chrome-stable > /tmp/chrome-path

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled artifacts from the build stage
COPY --from=build /usr/src/app/dist ./dist

# Change ownership of the app directory to the node user
RUN chown -R node:node /usr/src/app

# Switch to the non-root 'node' user
USER node

# Start the server using node directly (more efficient than npm start)
CMD [ "node", "dist/server.js" ]
