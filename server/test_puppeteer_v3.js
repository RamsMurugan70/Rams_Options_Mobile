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

        const contractInfo = await page.evaluate(async () => {
            const res = await fetch('/api/option-chain-contract-info?symbol=FINNIFTY');
            return await res.json();
        });

        console.log("Contract Expiries:", contractInfo.expiryDates);

        const firstExpiry = contractInfo.expiryDates[0];

        console.log("Fetching Option Chain for", firstExpiry);

        const chainResponse = await page.evaluate(async (exp) => {
            const res = await fetch(`/api/option-chain-v3?type=Indices&symbol=FINNIFTY&expiry=${encodeURIComponent(exp)}`);
            return await res.json();
        }, firstExpiry);

        console.log("Total Records:", chainResponse.records.data.length);


    } finally {
        if (browser) await browser.close();
    }
})();
