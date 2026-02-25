const { NseIndia } = require('stock-nse-india');
const nseIndia = new NseIndia();
nseIndia.getIndexOptionChain('FINNIFTY').then(d => {
    console.log(d.records.expiryDates);
}).catch(console.error);
