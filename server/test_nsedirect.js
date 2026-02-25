const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-http2'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log("Navigating to NSE...");
        // First go to homepage to get cookies
        await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));

        console.log("Navigating directly to API...");
        await page.goto('https://www.nseindia.com/api/option-chain-indices?symbol=BANKNIFTY', { waitUntil: 'domcontentloaded' });

        const content = await page.evaluate(() => document.body.innerText);
        const data = JSON.parse(content);

        console.log("Raw NSE Dates:");
        console.log(data.records.expiryDates.slice(0, 5));

    } catch (e) {
        console.error(e);
    } finally {
        if (browser) await browser.close();
    }
})();
