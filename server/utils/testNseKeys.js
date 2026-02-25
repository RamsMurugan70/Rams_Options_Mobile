const { NseIndia } = require('stock-nse-india');
const nseIndia = new NseIndia();

async function testApi() {
    try {
        const symbol = 'FINNIFTY';
        const data = await nseIndia.getIndexOptionChain(symbol);

        if (data && data.records && data.records.data.length > 0) {
            console.log(JSON.stringify(data.records.data[0], null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testApi();
