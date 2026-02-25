// In-Memory map to cache the daily open price so we don't spam Yahoo
const anchorCache = {};
const { NseIndia } = require('stock-nse-india');
const nseIndia = new NseIndia();

const NSE_OC_URL = 'https://www.nseindia.com/option-chain';

// Per-symbol configuration
const SYMBOL_CONFIG = {
    NIFTY: { strikeOffset: 1000, expiryDay: 4, label: 'NIFTY 50', yahooSymbol: '^NSEI' },
    BANKNIFTY: { strikeOffset: 2500, expiryDay: 3, label: 'BANKNIFTY', yahooSymbol: '^NSEBANK' },
    FINNIFTY: { strikeOffset: 1200, expiryDay: 2, label: 'FINNIFTY', apiSymbol: 'FINNIFTY', yahooSymbol: 'NIFTY_FIN_SERVICE.NS' },
    SENSEX: { strikeOffset: 3500, expiryDay: 5, label: 'SENSEX', yahooSymbol: '^BSESN' },
    MIDCPNIFTY: { strikeOffset: 600, expiryDay: 1, label: 'MIDCAP NIFTY', yahooSymbol: '^NSEMDCP50' }
};
const VALID_SYMBOLS = Object.keys(SYMBOL_CONFIG);

function getUpcomingWeekdays(dayOfWeek, count = 2) {
    const dates = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    while (dates.length < count) {
        if (d.getDay() === dayOfWeek) {
            dates.push(new Date(d));
        }
        d.setDate(d.getDate() + 1);
    }
    return dates;
}

function getUpcomingTuesdays(count = 2) { return getUpcomingWeekdays(2, count); }
function getUpcomingThursdays(count = 2) { return getUpcomingWeekdays(4, count); }

function getLastWeekdayOfMonth(year, month, dayOfWeek) {
    const lastDay = new Date(year, month + 1, 0);
    while (lastDay.getDay() !== dayOfWeek) {
        lastDay.setDate(lastDay.getDate() - 1);
    }
    return lastDay;
}

function getUpcomingMonthlyExpiries(dayOfWeek, count = 2) {
    const dates = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let year = now.getFullYear();
    let month = now.getMonth();

    while (dates.length < count) {
        const lastDay = getLastWeekdayOfMonth(year, month, dayOfWeek);
        if (lastDay >= now) {
            dates.push(lastDay);
        }
        month++;
        if (month > 11) { month = 0; year++; }
    }
    return dates;
}

function formatNSEDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(date.getDate()).padStart(2, '0');
    return `${dd}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

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

async function fetchOptionChain(symbol = 'NIFTY') {
    const upperSymbol = symbol.toUpperCase();
    const config = SYMBOL_CONFIG[upperSymbol] || SYMBOL_CONFIG.NIFTY;
    const apiSymbol = config.apiSymbol || upperSymbol;

    const allIntercepted = [];
    let expiryDates = [];

    console.log(`[NSE Options Serverless] Fetching via stock-nse-india API for ${apiSymbol}...`);
    try {
        const apiData = await nseIndia.getIndexOptionChain(apiSymbol);
        if (apiData && apiData.records) {
            console.log(`[NSE Options Serverless] Successfully fetched data from API. Status: OK`);
            allIntercepted.push({ expiry: null, data: apiData });
            expiryDates = apiData.records.expiryDates || [];
        } else {
            throw new Error('[NSE Options Serverless] stock-nse-india API returned empty or invalid data format.');
        }
    } catch (e) {
        console.error('[NSE Options Serverless] stock-nse-india API fetch failed:', e.message);
        throw new Error('Failed to fetch NSE option chain data: ' + e.message);
    }

    return { intercepted: allIntercepted, expiryDates };
}

function getTargetExpiries(nseExpiries, symbol = 'NIFTY') {
    if (!nseExpiries || nseExpiries.length === 0) return [];
    return nseExpiries.slice(0, 2);
}

async function getAnchorPrice(symbol) {
    const config = SYMBOL_CONFIG[symbol] || SYMBOL_CONFIG.NIFTY;
    const yahooSymbol = config.yahooSymbol;
    const today = new Date().toISOString().split('T')[0];

    // Check memory cache first
    if (anchorCache[symbol] && anchorCache[symbol].date === today) {
        return anchorCache[symbol].price;
    }

    try {
        console.log(`[Anchor] Fetching ${yahooSymbol} from Yahoo Finance...`);
        const yahooFinance = require('yahoo-finance2').default;
        const quote = await yahooFinance.quote(yahooSymbol);
        if (quote && quote.regularMarketOpen) {
            const open = quote.regularMarketOpen;
            anchorCache[symbol] = { date: today, price: open }; // Save to memory!
            return open;
        } else {
            return null;
        }
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
        // Find matching intercepted data OR fallback to the universal 'null' expiry payload
        const match = raw.intercepted.find(i => i.expiry === expiry) || raw.intercepted.find(i => !i.expiry);

        let dataRows = [];
        if (match && match.data && match.data.records) {
            // For universal fetches, we MUST filter data rows by expiryDate or expiryDates array
            if (!match.expiry) {
                dataRows = match.data.records.data.filter(d => {
                    if (d.expiryDate && d.expiryDate === expiry) return true;
                    if (d.expiryDates) {
                        if (typeof d.expiryDates === 'string' && d.expiryDates === expiry) return true;
                        if (Array.isArray(d.expiryDates) && d.expiryDates.includes(expiry)) return true;
                    }
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
        expiryDay: config.monthly ? (config.expiryDay === 1 ? 'Monthly (Last Monday)' : 'Monthly (Last Tuesday)') : (config.expiryDay === 1 ? 'Monday' : config.expiryDay === 2 ? 'Tuesday' : 'Thursday'),
        expiries
    };
}

module.exports = { getOptionsTrackerData };

// Test script for standalone execution
if (require.main === module) {
    (async () => {
        try {
            console.log("Testing FINNIFTY Fetch...");
            const data = await getOptionsTrackerData('FINNIFTY');
            console.log("Success! Spot:", data.spot);
        } catch (e) {
            console.error("Test Error:", e);
        } finally {
            process.exit(0);
        }
    })();
}
