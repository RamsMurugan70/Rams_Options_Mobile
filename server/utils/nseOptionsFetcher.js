const axios = require('axios');

// In-Memory map to cache the daily open price so we don't spam Yahoo
const anchorCache = {};

// Per-symbol configuration
const SYMBOL_CONFIG = {
    NIFTY: { strikeOffset: 1000, expiryDay: 4, label: 'NIFTY 50', yahooSymbol: '^NSEI', nseSymbol: 'NIFTY' },
    BANKNIFTY: { strikeOffset: 2500, expiryDay: 3, label: 'BANKNIFTY', yahooSymbol: '^NSEBANK', nseSymbol: 'BANKNIFTY' },
    FINNIFTY: { strikeOffset: 1200, expiryDay: 2, label: 'FINNIFTY', yahooSymbol: 'NIFTY_FIN_SERVICE.NS', nseSymbol: 'FINNIFTY' },
    SENSEX: { strikeOffset: 3500, expiryDay: 5, label: 'SENSEX', yahooSymbol: '^BSESN' },
    MIDCPNIFTY: { strikeOffset: 600, expiryDay: 1, label: 'MIDCAP NIFTY', yahooSymbol: '^NSEMDCP50', nseSymbol: 'MIDCPNIFTY' }
};
const VALID_SYMBOLS = Object.keys(SYMBOL_CONFIG);

const NSE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nseindia.com/option-chain',
    'Origin': 'https://www.nseindia.com'
};

function extractOptionFields(optObj, strike) {
    if (!optObj) return null;
    return {
        strike,
        ltp: optObj.lastPrice,
        change: optObj.change,
        pChange: optObj.pchange || optObj.pChange || 0,
        oi: optObj.openInterest,
        oiChange: optObj.changeinOpenInterest,
        volume: optObj.totalTradedVolume,
        iv: optObj.impliedVolatility,
        bid: optObj.buyPrice1 || optObj.bidprice || 0,
        ask: optObj.sellPrice1 || optObj.askPrice || 0,
        bidQty: optObj.buyQuantity1 || optObj.bidQty || 0,
        askQty: optObj.sellQuantity1 || optObj.askQty || 0
    };
}

// ─── Multi-Proxy Fallback Chain ───
// NSE blocks cloud/data center IPs (Netlify, AWS, etc.)
// Strategy: try direct first, then fall back through free CORS proxies.

const PROXY_STRATEGIES = [
    {
        name: 'Direct NSE',
        buildSessionUrl: () => 'https://www.nseindia.com/option-chain',
        buildApiUrl: (nseSymbol) => `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(nseSymbol)}`,
        parseResponse: (data) => data,
    },
    {
        name: 'corsproxy.io',
        buildSessionUrl: () => 'https://corsproxy.io/?' + encodeURIComponent('https://www.nseindia.com/option-chain'),
        buildApiUrl: (nseSymbol) => 'https://corsproxy.io/?' + encodeURIComponent(`https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(nseSymbol)}`),
        parseResponse: (data) => data,
    },
    {
        name: 'allorigins.win',
        buildSessionUrl: () => 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.nseindia.com/option-chain'),
        buildApiUrl: (nseSymbol) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(`https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(nseSymbol)}`),
        parseResponse: (data) => data,
    },
];

async function tryFetchWithStrategy(strategy, nseSymbol) {
    console.log(`[NSE Options] Trying strategy: ${strategy.name} for ${nseSymbol}...`);

    // Step 1: Get a session cookie (best-effort)
    let cookies = '';
    try {
        const sessionUrl = strategy.buildSessionUrl();
        const sessionRes = await axios.get(sessionUrl, {
            headers: NSE_HEADERS,
            maxRedirects: 5,
            timeout: 10000
        });
        const setCookies = sessionRes.headers['set-cookie'];
        if (setCookies) {
            cookies = setCookies.map(c => c.split(';')[0]).join('; ');
        }
    } catch (e) {
        console.log(`[NSE Options] [${strategy.name}] Session cookie failed (continuing):`, e.message);
    }

    // Step 2: Fetch the option chain data
    const apiUrl = strategy.buildApiUrl(nseSymbol);
    const res = await axios.get(apiUrl, {
        headers: { ...NSE_HEADERS, ...(cookies ? { Cookie: cookies } : {}) },
        timeout: 10000
    });

    let apiData = res.data;
    // Some proxies may return the data as a string
    if (typeof apiData === 'string') {
        try { apiData = JSON.parse(apiData); } catch (e) { /* leave as-is */ }
    }
    apiData = strategy.parseResponse(apiData);

    if (!apiData || !apiData.records) {
        throw new Error(`${strategy.name}: NSE API returned empty/invalid data`);
    }

    console.log(`[NSE Options] ✓ ${strategy.name} succeeded for ${nseSymbol}. Expiry dates: ${(apiData.records.expiryDates || []).length}`);
    return apiData;
}

async function fetchOptionChain(symbol = 'NIFTY') {
    const upperSymbol = symbol.toUpperCase();
    const config = SYMBOL_CONFIG[upperSymbol] || SYMBOL_CONFIG.NIFTY;
    const nseSymbol = config.nseSymbol || upperSymbol;

    console.log(`[NSE Options] Fetching option chain for ${nseSymbol} (will try ${PROXY_STRATEGIES.length} strategies)...`);

    const errors = [];
    for (const strategy of PROXY_STRATEGIES) {
        try {
            const apiData = await tryFetchWithStrategy(strategy, nseSymbol);
            return {
                intercepted: [{ expiry: null, data: apiData }],
                expiryDates: apiData.records.expiryDates || []
            };
        } catch (e) {
            console.error(`[NSE Options] ✗ ${strategy.name} failed:`, e.message);
            errors.push(`${strategy.name}: ${e.message}`);
        }
    }

    throw new Error(`All proxy strategies failed for ${nseSymbol}. Errors: ${errors.join(' | ')}`);
}

function getTargetExpiries(nseExpiries, symbol = 'NIFTY') {
    if (!nseExpiries || nseExpiries.length === 0) return [];
    return nseExpiries.slice(0, 2);
}

async function getAnchorPrice(symbol) {
    const config = SYMBOL_CONFIG[symbol] || SYMBOL_CONFIG.NIFTY;
    const yahooSymbol = config.yahooSymbol;
    const today = new Date().toISOString().split('T')[0];

    if (anchorCache[symbol] && anchorCache[symbol].date === today) {
        return anchorCache[symbol].price;
    }

    try {
        console.log(`[Anchor] Fetching ${yahooSymbol} from Yahoo Finance...`);
        const yahooFinance = require('yahoo-finance2').default;
        const quote = await yahooFinance.quote(yahooSymbol);
        if (quote && quote.regularMarketOpen) {
            const open = quote.regularMarketOpen;
            anchorCache[symbol] = { date: today, price: open };
            return open;
        }
        return null;
    } catch (e) {
        console.error(`[Anchor] Error fetching ${symbol}:`, e.message);
        return null;
    }
}

async function getOptionsTrackerData(symbol = 'NIFTY') {
    const upperSymbol = symbol.toUpperCase();
    const config = SYMBOL_CONFIG[upperSymbol] || SYMBOL_CONFIG.NIFTY;
    const raw = await fetchOptionChain(upperSymbol);

    if (raw.intercepted.length === 0) throw new Error(`No option chain data available for ${upperSymbol}`);

    const firstData = raw.intercepted[0].data;
    const spot = firstData.records.underlyingValue || (firstData.records.data && firstData.records.data[0] ? firstData.records.data[0].PE.underlyingValue : 0);

    const anchorPrice = await getAnchorPrice(upperSymbol);
    const referencePrice = anchorPrice || spot;

    const ceStrike = Math.ceil((referencePrice + config.strikeOffset) / 100) * 100;
    const peStrike = Math.ceil((referencePrice - config.strikeOffset) / 100) * 100;

    let targetExpiries = getTargetExpiries(raw.expiryDates, upperSymbol);
    if (targetExpiries.length === 0 && raw.intercepted.length > 0) {
        const potentialExpiries = raw.intercepted.map(i => i.expiry).filter(e => e);
        targetExpiries = [...new Set(potentialExpiries)];
    }

    const expiries = targetExpiries.map(expiry => {
        const match = raw.intercepted.find(i => i.expiry === expiry) || raw.intercepted.find(i => !i.expiry);

        let dataRows = [];
        if (match && match.data && match.data.records) {
            if (!match.expiry) {
                dataRows = match.data.records.data.filter(d => {
                    if (d.expiryDate && d.expiryDate === expiry) return true;
                    if (d.CE && d.CE.expiryDate === expiry) return true;
                    if (d.PE && d.PE.expiryDate === expiry) return true;
                    return false;
                });
            } else {
                dataRows = match.data.records.data;
            }
        }

        const ceRow = dataRows.length ? dataRows.find(d => d.strikePrice === ceStrike) : null;
        const peRow = dataRows.length ? dataRows.find(d => d.strikePrice === peStrike) : null;

        return {
            expiry,
            ce: extractOptionFields(ceRow?.CE, ceStrike),
            pe: extractOptionFields(peRow?.PE, peStrike)
        };
    });

    return {
        symbol: upperSymbol,
        label: config.label,
        spot,
        anchorPrice,
        timestamp: new Date().toISOString(),
        ceStrike,
        peStrike,
        strikeOffset: config.strikeOffset,
        expiryDay: config.expiryDay === 1 ? 'Monday' : config.expiryDay === 2 ? 'Tuesday' : config.expiryDay === 3 ? 'Wednesday' : 'Thursday',
        expiries
    };
}

module.exports = { getOptionsTrackerData };
