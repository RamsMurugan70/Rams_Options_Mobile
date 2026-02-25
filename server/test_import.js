async function test() {
    try {
        const yf = await import('yahoo-finance2');
        const quote = await yf.default.quote('AAPL');
        console.log("Success! Price:", quote.regularMarketPrice);
    } catch (e) {
        console.error("Error importing:", e);
    }
}
test();
