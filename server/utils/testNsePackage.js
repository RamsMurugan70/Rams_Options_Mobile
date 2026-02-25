const { NseIndia } = require('stock-nse-india');
const nseIndia = new NseIndia();

console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(nseIndia)));
