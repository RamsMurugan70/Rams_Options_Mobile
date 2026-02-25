const express = require('express');
const router = express.Router();
const { getOptionsTrackerData } = require('../utils/nseOptionsFetcher');
const { getSensexOptionsTrackerData } = require('../utils/bseOptionsFetcher');
const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'optionsCache.json');

function loadCacheMap() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        }
    } catch (e) {
        log.info('[Cache] Failed to load persistent cache: ' + e.message);
    }
    return {};
}

function saveCacheMap(cm) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cm));
    } catch (e) {
        log.info('[Cache] Failed to save persistent cache: ' + e.message);
    }
}

// Per-symbol cache to avoid hammering exchanges on every request
let cacheMap = loadCacheMap();  // { NIFTY: { data, timestamp }, SENSEX: { data, timestamp } }
const CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache
const VALID_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'];
let prefetchRunning = false;

// Background pre-fetch: populates cache so page loads are instant
async function prefetchAll() {
    if (prefetchRunning) return;
    prefetchRunning = true;
    for (const sym of VALID_SYMBOLS) {
        try {
            log.info(`[Options Prefetch] Fetching ${sym}...`);
            const fetcher = sym === 'SENSEX' ? getSensexOptionsTrackerData : () => getOptionsTrackerData(sym);
            const data = await fetcher();
            cacheMap[sym] = { data, timestamp: Date.now() };
            saveCacheMap(cacheMap);
            log.info(`[Options Prefetch] ${sym} cached ✓`);
        } catch (err) {
            log.info(`[Options Prefetch] ${sym} failed: ${err.message}`);
        }
    }
    prefetchRunning = false;
}

// Start pre-fetch 10s after server boot, then every 5 minutes
setTimeout(() => {
    prefetchAll();
    setInterval(prefetchAll, CACHE_DURATION);
}, 10 * 1000);

// GET /api/options/chain?symbol=NIFTY|SENSEX
// Returns live option chain data with calculated CE/PE strikes
router.get('/chain', async (req, res) => {
    try {
        const symbol = (req.query.symbol || 'NIFTY').toUpperCase();

        // Validate symbol
        if (!VALID_SYMBOLS.includes(symbol)) {
            return res.status(400).json({ error: `Invalid symbol. Supported: ${VALID_SYMBOLS.join(', ')}` });
        }

        const now = Date.now();
        const forceRefresh = req.query.refresh === 'true';
        const cached = cacheMap[symbol];

        if (cached && !forceRefresh && (now - cached.timestamp < CACHE_DURATION)) {
            log.debug(`[Options API] Serving cached ${symbol} data`);
            return res.json({ ...cached.data, cached: true });
        }

        log.info(`[Options API] Fetching fresh ${symbol} data...`);

        // Dispatch to the correct fetcher
        let data;
        if (symbol === 'SENSEX') {
            data = await getSensexOptionsTrackerData();
        } else {
            data = await getOptionsTrackerData(symbol);  // NIFTY or FINNIFTY
        }

        cacheMap[symbol] = { data, timestamp: now };
        saveCacheMap(cacheMap);

        res.json({ ...data, cached: false });
    } catch (err) {
        const symbol = (req.query.symbol || 'NIFTY').toUpperCase();
        console.error(`[Options API] Error (${symbol}):`, err.message);

        // If we have stale cache, serve it with a warning
        const cached = cacheMap[symbol];
        if (cached) {
            return res.json({ ...cached.data, cached: true, stale: true, error: 'Using stale data: ' + err.message });
        }

        res.status(503).json({ error: 'Failed to fetch option chain data. NSE/BSE may be blocking requests. ' + err.message });
    }
});

module.exports = router;
