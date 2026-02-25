const axios = require('axios');

// In-Memory map to cache the daily open price so we don't spam Yahoo
const anchorCache = {};

const BSE_DERIV_URL = 'https://www.bseindia.com/stock-share-price/future-options/derivatives/1/';
const BSE_API_BASE = 'https://api.bseindia.com';
const SENSEX_SCRIP_CD = '1';
const STRIKE_OFFSET = 3500;

function getUpcomingFridays(count = 2) {
    const dates = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    while (dates.length < count) {
        if (d.getDay() === 5) dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return dates;
}

function formatBSEDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(date.getDate()).padStart(2, '0');
    return `${dd} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function parseBseNumber(str) {
    if (!str || str === '-' || str === '') return null;
    return parseFloat(String(str).replace(/,/g, ''));
}

function extractBseOptionFields(row, strike, type) {
    if (!row) return null;
    return {
        strike,
        ltp: parseBseNumber(type === 'CE' ? row.C_Last_Trd_Price : row.Last_Trd_Price),
        change: parseBseNumber(type === 'CE' ? row.C_NetChange : row.NetChange),
        pChange: 0,
        oi: parseBseNumber(type === 'CE' ? row.C_Open_Interest : row.Open_Interest),
        oiChange: parseBseNumber(type === 'CE' ? row.C_Absolute_Change_OI : row.Absolute_Change_OI),
        volume: parseBseNumber(type === 'CE' ? row.C_Vol_Traded : row.Vol_Traded),
        iv: null,
        bid: parseBseNumber(type === 'CE' ? row.C_BidPrice : row.BidPrice),
        ask: parseBseNumber(type === 'CE' ? row.C_OfferPrice : row.OfferPrice),
        bidQty: parseBseNumber(type === 'CE' ? row.C_BIdQty : row.BIdQty),
        askQty: parseBseNumber(type === 'CE' ? row.C_OfferQty : row.OfferQty)
    };
}

async function fetchSensexOptionChain() {
    console.log('[BSE Options Serverless] Fetching BSE Spot via Axios...');
    let spot = 0;
    try {
        const spotRes = await axios.get(`${BSE_API_BASE}/BseIndiaAPI/api/getScripHeaderData/w?Debtflag=&scripcode=${SENSEX_SCRIP_CD}&seriesid=`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://www.bseindia.com/',
                'Accept': 'application/json, text/plain, */*'
            }
        });
        spot = parseBseNumber(spotRes.data?.CurrRate?.LTP) || 0;
    } catch (e) {
        console.error('[BSE Options Serverless] Spot fetch error:', e.message);
    }

    const candidateFridays = getUpcomingFridays(4).map(formatBSEDate);
    const targetExpiries = [];

    for (const expiry of candidateFridays) {
        if (targetExpiries.length >= 2) break;
        console.log(`[BSE Options Serverless] Fetching expiry: ${expiry}`);
        try {
            const res = await axios.get(`${BSE_API_BASE}/BseIndiaAPI/api/DerivOptionChain_IV/w?Expiry=${encodeURIComponent(expiry)}&scrip_cd=${SENSEX_SCRIP_CD}&strprice=0`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Referer': 'https://www.bseindia.com/',
                    'Accept': 'application/json, text/plain, */*'
                }
            });
            const json = res.data;
            if (json && json.Table && json.Table.length > 0) {
                targetExpiries.push({ expiry, data: json.Table });
            }
        } catch (e) {
            console.error(`[BSE Options Serverless] Fetch failed for ${expiry}:`, e.message);
        }
    }

    return { spot, allExpiries: targetExpiries };
}

async function getAnchorPrice() {
    const symbol = 'SENSEX';
    const yahooSymbol = '^BSESN';
    const today = new Date().toISOString().split('T')[0];

    if (anchorCache[symbol] && anchorCache[symbol].date === today) {
        return anchorCache[symbol].price;
    }

    try {
        const yahooFinance = require('yahoo-finance2').default;
        const quote = await yahooFinance.quote(yahooSymbol);
        if (quote && quote.regularMarketOpen) {
            const open = quote.regularMarketOpen;
            anchorCache[symbol] = { date: today, price: open };
            return open;
        } else {
            return null;
        }
    } catch (e) {
        console.error(`[BSE Anchor] Error fetching ${symbol}:`, e.message);
        return null;
    }
}

async function getSensexOptionsTrackerData() {
    const raw = await fetchSensexOptionChain();
    if (!raw.spot || raw.allExpiries.length === 0) throw new Error('No SENSEX option chain data available');

    const spot = raw.spot;
    const anchorPrice = await getAnchorPrice();
    const referencePrice = anchorPrice || spot;

    const ceStrike = Math.ceil((referencePrice + STRIKE_OFFSET) / 100) * 100;
    const peStrike = Math.ceil((referencePrice - STRIKE_OFFSET) / 100) * 100;

    const expiries = raw.allExpiries.map(({ expiry, data }) => {
        const ceRow = data.find(d => parseBseNumber(d.Strike_Price) === ceStrike);
        const peRow = data.find(d => parseBseNumber(d.Strike_Price) === peStrike);

        return {
            expiry,
            ce: extractBseOptionFields(ceRow, ceStrike, 'CE'),
            pe: extractBseOptionFields(peRow, peStrike, 'PE')
        };
    });

    return {
        symbol: 'SENSEX',
        label: 'SENSEX',
        spot,
        anchorPrice,
        timestamp: new Date().toISOString(),
        ceStrike,
        peStrike,
        strikeOffset: STRIKE_OFFSET,
        expiryDay: 'Friday',
        expiries
    };
}

module.exports = { getSensexOptionsTrackerData };
