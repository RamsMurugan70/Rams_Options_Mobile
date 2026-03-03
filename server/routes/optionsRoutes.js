const express = require('express');
const router = express.Router();
const { getOptionsTrackerData } = require('../utils/nseOptionsFetcher');
const { getSensexOptionsTrackerData } = require('../utils/bseOptionsFetcher');
const log = require('../utils/logger');

// In-memory cache (serverless-compatible, no filesystem needed)
const cacheMap = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const VALID_SYMBOLS = ['NIFTY', 'SENSEX'];

// Helper: parse expiry date strings like "06-Mar-2026" or "05 Mar 2026" into Date
function parseExpiryDate(dateStr) {
    if (!dateStr) return null;
    const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
    let parts = dateStr.split('-');
    if (parts.length !== 3) parts = dateStr.split(' ');
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0], 10));
    d.setHours(23, 59, 59);
    return isNaN(d.getTime()) ? null : d;
}

// Filter out any expiries that have already passed
function filterPastExpiries(data) {
    if (!data || !data.expiries) return data;
    const now = new Date();
    const filtered = data.expiries.filter(exp => {
        const expDate = parseExpiryDate(exp.expiry);
        return expDate && expDate >= now;
    });
    return { ...data, expiries: filtered };
}

// GET /api/options/chain?symbol=NIFTY|SENSEX
router.get('/chain', async (req, res) => {
    try {
        const symbol = (req.query.symbol || 'NIFTY').toUpperCase();

        if (!VALID_SYMBOLS.includes(symbol)) {
            return res.status(400).json({ error: `Invalid symbol. Supported: ${VALID_SYMBOLS.join(', ')}` });
        }

        const now = Date.now();
        const forceRefresh = req.query.refresh === 'true';
        const cached = cacheMap[symbol];

        if (cached && !forceRefresh && (now - cached.timestamp < CACHE_DURATION)) {
            return res.json({ ...filterPastExpiries(cached.data), cached: true });
        }

        log.info(`[Options API] Fetching fresh ${symbol} data...`);

        let data;
        if (symbol === 'SENSEX') {
            data = await getSensexOptionsTrackerData();
        } else {
            data = await getOptionsTrackerData(symbol);
        }

        cacheMap[symbol] = { data, timestamp: now };

        res.json({ ...filterPastExpiries(data), cached: false });
    } catch (err) {
        const symbol = (req.query.symbol || 'NIFTY').toUpperCase();
        console.error(`[Options API] Error (${symbol}):`, err.message);

        const cached = cacheMap[symbol];
        if (cached) {
            return res.json({ ...filterPastExpiries(cached.data), cached: true, stale: true, error: 'Using stale data: ' + err.message });
        }

        res.status(503).json({ error: 'Failed to fetch option chain data. ' + err.message });
    }
});

module.exports = router;
