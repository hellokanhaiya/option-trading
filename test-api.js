const https = require('https');
https.get('https://prices.algotest.in/option-chain?underlying=BANKNIFTY&candle=2026-05-14T09:16', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Top level keys:', Object.keys(parsed).slice(0, 5));
      const firstKey = Object.keys(parsed)[0];
      console.log('Keys of first property:', Object.keys(parsed[firstKey]).slice(0, 5));
      const secondKey = Object.keys(parsed[firstKey])[0];
      console.log('Value of second property:', parsed[firstKey][secondKey]);
    } catch (e) {
      console.log('Failed to parse:', e.message, data.substring(0, 100));
    }
  });
});
