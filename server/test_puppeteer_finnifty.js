const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-http2'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

        console.log("Navigating to NSE...");
        await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));

        console.log("Fetching FINNIFTY via fetch...");
        const data = await page.evaluate(async () => {
            try {
                const res = await fetch('/api/option-chain-indices?symbol=FINNIFTY');
                return await res.json();
            } catch (e) { return e.message; }
        });

        if (data && data.records) {
            console.log("SUCCESS. Expiries:", data.records.expiryDates);
        } else {
            console.log("Failed:", data);
        }
    } finally {
        if (browser) await browser.close();
    }
})();
