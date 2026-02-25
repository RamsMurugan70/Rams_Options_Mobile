const { NseIndia } = require('stock-nse-india');
const nseIndia = new NseIndia();
nseIndia.getIndexOptionChain('FINNIFTY').then(d => {
    console.log("FINNIFTY NSE Expiry Dates:", d.records.expiryDates);
}).catch(console.error);
