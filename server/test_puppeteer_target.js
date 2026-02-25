const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-http2'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('api/option-chain')) {
                try {
                    const json = await response.json();
                    if (json.records && json.records.expiryDates) {
                        console.log(`INTERCEPTED EXPIRY DATES FROM ${url}:`);
                        console.log(json.records.expiryDates.slice(0, 5));
                    }
                } catch (e) { }
            }
        });

        console.log("Navigating to NSE BANKNIFTY options page...");
        await page.goto('https://www.nseindia.com/option-chain?symbol=BANKNIFTY', { waitUntil: 'networkidle2', timeout: 30000 });
        console.log(`Done waiting.`);
    } finally {
        if (browser) await browser.close();
    }
})();
