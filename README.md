# ZT-Options-App Setup & Deployment Guide

## Project Structure
- **server/**: Node.js backend with Puppeteer (for NSE/BSE scraping) and SQLite.
- **client/**: React (Vite) frontend.

## Local Development
1. **Start Backend**:
   ```bash
   cd server
   npm install
   npm start
   ```
   Runs on `http://localhost:5001`.

2. **Start Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Runs on `http://localhost:5173`.

## Cloud Deployment (Recommended)

### Backend (Render / Railway)
Since the backend uses Puppeteer (Headless Chrome), it needs a Docker-based host.
1. **Push to GitHub**: Create a repo and push this folder.
2. **Deploy to Render**:
   - Connect GitHub repo.
   - Select `server` directory as Root Directory (if possible, or deploy from root).
   - Use **Docker** environment.
   - **Important**: Add a clear cache variable if needed or ensure it rebuilds.
   - Add Persistent Disk (optional) if you want to keep the SQLite DB (otherwise data resets on deploy).

### Frontend (Vercel)
1. **Deploy to Vercel**:
   - Connect GitHub repo.
   - Select `client` directory as Root Directory.
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - **Environment Variables**:
     - `VITE_API_URL`: Set this to your deployed Backend URL (e.g., `https://zt-options-app.onrender.com`).
     - *Note*: You might need to update `vite.config.js` or `axios` setup to use this ENV variable instead of the proxy if deployed separately.

## Configuration
- **Yahoo Finance**: The app uses `yahoo-finance2` to fetch open prices. No API key needed.
- **NSE/BSE**: Uses Puppeteer to scrape.

## Docker (Local)
Build and run the backend locally with Docker:
```bash
cd server
docker build -t zt-options-server .
docker run -p 5001:5001 zt-options-server
```
