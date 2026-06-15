// API route do Vercel para proxy da API Apised
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }

    const apiKey = 'sk_b86F7F67be355ee9BFa375e7ddAD8EF8D29221828eD71a6a';
    
    // Mapear símbolos para os endpoints corretos
    let apiUrl;
    let symbolsParam;
    let useApised = true;
    
    if (symbol.includes('XAU')) {
      // Metais API - XAU (com fallback para dados simulados)
      apiUrl = 'https://metals.g.apised.com/v1/market-data';
      symbolsParam = 'XAU';
      // Fallback para dados simulados se API falhar
      try {
        const testRes = await fetch(`${apiUrl}?symbols=${symbolsParam}&base_currency=USD`, {
          headers: { 'x-api-key': apiKey }
        });
        const testData = await testRes.json();
        if (testData.status === 'fail' || testData.message?.includes('Credit limit')) {
          console.log('API Apised limit reached, using simulated data for XAU');
          const goldPrice = 4200 + (Math.random() - 0.5) * 50;
          const result = {
            success: true,
            data: {
              price: goldPrice,
              high: goldPrice * 1.01,
              low: goldPrice * 0.99,
              open: goldPrice * 0.995,
              volume: 1000,
              timestamp: Date.now()
            }
          };
          return res.status(200).json(result);
        }
      } catch (e) {
        console.log('API check failed, using simulated data for XAU');
      }
    } else if (symbol.includes('XAG')) {
      // Metais API - XAG (com fallback para dados simulados)
      apiUrl = 'https://metals.g.apised.com/v1/market-data';
      symbolsParam = 'XAG';
      // Fallback para dados simulados se API falhar
      try {
        const testRes = await fetch(`${apiUrl}?symbols=${symbolsParam}&base_currency=USD`, {
          headers: { 'x-api-key': apiKey }
        });
        const testData = await testRes.json();
        if (testData.status === 'fail' || testData.message?.includes('Credit limit')) {
          console.log('API Apised limit reached, using simulated data for XAG');
          const silverPrice = 28 + (Math.random() - 0.5) * 1;
          const result = {
            success: true,
            data: {
              price: silverPrice,
              high: silverPrice * 1.01,
              low: silverPrice * 0.99,
              open: silverPrice * 0.995,
              volume: 500,
              timestamp: Date.now()
            }
          };
          return res.status(200).json(result);
        }
      } catch (e) {
        console.log('API check failed, using simulated data for XAG');
      }
    } else if (symbol.includes('BTC')) {
      // Para BTC, usar CoinGecko API (gratuita)
      apiUrl = 'https://api.coingecko.com/api/v3/simple/price';
      symbolsParam = 'bitcoin';
      useApised = false;
    } else if (symbol.includes('USOIL')) {
      // Para Oil, usar dados simulados (APIs gratuitas limitadas)
      // Preço aproximado do WTI Crude Oil
      const oilPrice = 78.50 + (Math.random() - 0.5) * 2;
      const result = {
        success: true,
        data: {
          price: oilPrice,
          high: oilPrice * 1.02,
          low: oilPrice * 0.98,
          open: oilPrice * 0.99,
          volume: 5000,
          timestamp: Date.now()
        }
      };
      return res.status(200).json(result);
    } else {
      // Fallback para metals
      apiUrl = 'https://metals.g.apised.com/v1/market-data';
      symbolsParam = symbol.replace('/', '').replace('USD', '');
    }

    let fullUrl;
    let headers = {};

    if (useApised) {
      fullUrl = `${apiUrl}?symbols=${symbolsParam}&base_currency=USD`;
      headers = { 'x-api-key': apiKey };
    } else {
      // CoinGecko API (gratuita, não precisa de API key)
      fullUrl = `${apiUrl}?ids=${symbolsParam}&vs_currencies=usd&include_24hr_change=true`;
    }

    console.log(`Fetching data for symbol: ${symbol}`);
    console.log(`API URL: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      headers: headers
    });
    
    const data = await response.json();

    console.log('API Response:', JSON.stringify(data, null, 2));
    console.log('Symbols param:', symbolsParam);

    // Processar resposta da API
    if (useApised) {
      // Processar resposta da API Apised
      if (data && data.data && data.data.rates) {
        console.log('Data structure:', Object.keys(data.data));
        const quote = data.data.rates[symbolsParam];
        console.log('Quote:', JSON.stringify(quote, null, 2));
        
        if (!quote) {
          return res.status(500).json({ error: 'Symbol not found in response', data });
        }
        
        const result = {
          success: true,
          data: {
            price: parseFloat(quote.current || quote.price || quote.close || quote.last),
            high: parseFloat(quote.high || quote.day_high || quote.high_24h),
            low: parseFloat(quote.low || quote.day_low || quote.low_24h),
            open: parseFloat(quote.open || quote.day_open),
            volume: parseFloat(quote.volume || quote.vol || quote.vol_24h || 1000),
            timestamp: parseInt(data.data.timestamp || quote.timestamp || Date.now())
          }
        };
        console.log('Result:', JSON.stringify(result, null, 2));
        return res.status(200).json(result);
      }
    } else {
      // Processar resposta da API CoinGecko
      if (data && data[symbolsParam]) {
        console.log('CoinGecko data structure:', Object.keys(data));
        const coinData = data[symbolsParam];
        console.log('Coin data:', JSON.stringify(coinData, null, 2));
        
        // Calcular open baseado no preço atual e mudança de 24h
        const currentPrice = parseFloat(coinData.usd);
        const change24h = parseFloat(coinData.usd_24h_change || 0);
        const openPrice = currentPrice / (1 + (change24h / 100));
        
        const result = {
          success: true,
          data: {
            price: currentPrice,
            high: parseFloat(coinData.usd_24h_high || currentPrice * 1.02),
            low: parseFloat(coinData.usd_24h_low || currentPrice * 0.98),
            open: openPrice,
            volume: 10000,
            timestamp: Date.now()
          }
        };
        console.log('Result:', JSON.stringify(result, null, 2));
        return res.status(200).json(result);
      }
    }

    return res.status(500).json({ error: 'Invalid API response', data });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return res.status(500).json({ error: 'Failed to fetch market data', message: error.message });
  }
};
