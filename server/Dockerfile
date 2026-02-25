FROM ghcr.io/puppeteer/puppeteer:21.0.0

# Skip Chromium download for puppeteer as we are using the installed chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5001
CMD [ "node", "server.js" ]
