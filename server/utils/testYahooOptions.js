const symbol = 'NIFTY_FIN_SERVICE.NS';

async function testFetch() {
    console.log(`Testing fetch for ${symbol}`);
    try {
        const yahooFinance = require('yahoo-finance2').default;
        console.log("Yahoo Finance loaded.");
        const result = await yahooFinance.options(symbol);

        console.log("Spot Price:", result.quote.regularMarketPrice);
        console.log("Expiries Count:", result.options.length);

        if (result.options.length > 0) {
            console.log("First Expiry:", new Date(result.options[0].expirationDate * 1000).toISOString());
            console.log("Calls Count:", result.options[0].calls.length);
            console.log("Puts Count:", result.options[0].puts.length);

            if (result.options[0].calls.length > 0) {
                console.log("Sample Call:", result.options[0].calls[0]);
            }
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testFetch();
