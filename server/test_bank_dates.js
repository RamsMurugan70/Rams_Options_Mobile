const { NseIndia } = require('stock-nse-india');
const nseIndia = new NseIndia();

async function testDates() {
    try {
        console.log("Fetching BANKNIFTY...");
        const apiData = await nseIndia.getIndexOptionChain('BANKNIFTY');
        console.log("Expiry Dates:", apiData.records.expiryDates);
    } catch (e) {
        console.error("Error:", e);
    }
}
testDates();
