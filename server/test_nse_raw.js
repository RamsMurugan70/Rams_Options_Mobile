const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-http2'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log("Navigating to NSE...");
        await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));

        console.log("Evaluating fetch...");

        const data = await page.evaluate(async () => {
            const res = await fetch('/api/option-chain-indices?symbol=BANKNIFTY');
            return await res.json();
        });

        console.log("True Expiry Dates from NSE:", data.records.expiryDates.slice(0, 5));

    } finally {
        if (browser) await browser.close();
    }
})();
