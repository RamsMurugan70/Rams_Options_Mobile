const { NseIndia } = require('stock-nse-india');
const axios = require('axios');

const nseIndia = new NseIndia();

async function testNSE() {
    try {
        console.log('Fetching NSE (NIFTY)...');
        const data = await nseIndia.getIndexOptionChain('NIFTY');
        console.log('NSE Data fetched successfully, records:', data.records?.data?.length);
    } catch (e) {
        console.error('NSE Error:', e.message);
    }
}

async function testBSE() {
    try {
        console.log('Fetching BSE Spot (SENSEX)...');
        const spotRes = await axios.get('https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Debtflag=&scripcode=1&seriesid=', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://www.bseindia.com/',
                'Accept': 'application/json, text/plain, */*'
            }
        });
        console.log('BSE Spot:', spotRes.data?.CurrRate?.LTP);

        console.log('Fetching BSE Options (SENSEX)...');
        // Let's just fetch a dummy expiry. It doesn't matter, we just need to see if the request hits CORS or 403.
        const d = new Date();
        d.setDate(d.getDate() + (5 + 7 - d.getDay()) % 7); // Next Friday
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dd = String(d.getDate()).padStart(2, '0');
        const expiry = `${dd} ${months[d.getMonth()]} ${d.getFullYear()}`;

        const optRes = await axios.get(`https://api.bseindia.com/BseIndiaAPI/api/DerivOptionChain_IV/w?Expiry=${encodeURIComponent(expiry)}&scrip_cd=1&strprice=0`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://www.bseindia.com/',
                'Accept': 'application/json, text/plain, */*'
            }
        });
        console.log('BSE Options Data fetched, rows:', optRes.data?.Table?.length);

    } catch (e) {
        console.error('BSE Error:', e.message);
    }
}

async function run() {
    await testNSE();
    await testBSE();
}
run();
