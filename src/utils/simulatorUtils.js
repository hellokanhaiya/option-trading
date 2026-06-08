// simulatorUtils.js

const INDEX_SYMBOLS = [
  "NIFTY",
  "SENSEX",
  "BANKNIFTY",
  "FINNIFTY",
  "MIDCPNIFTY",
  "BANKEX",
  "INDIAVIX",
];
const DELTA_SYMBOLS = ["BTCUSD", "ETHUSD"];

export async function getUnderlyingAssets() {
  try {
    const response = await fetch("/api/algotest/underlyings");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const categorized = {
      indices: [],
      delta: [],
      stocks: [],
    };

    data.forEach((item) => {
      const asset = {
        id: item.symbol,
        name: item.symbol,
        desc: item.display_name,
        icon: `https://cdn.algotest.in/stocks/${item.symbol}.svg`,
        underlying: item.underlying,
      };

      if (INDEX_SYMBOLS.includes(item.symbol)) {
        categorized.indices.push(asset);
      } else if (DELTA_SYMBOLS.includes(item.symbol)) {
        categorized.delta.push(asset);
      } else {
        categorized.stocks.push(asset);
      }
    });

    return categorized;
  } catch (error) {
    console.error("Error fetching underlying assets:", error);
    // Return empty state or fallback on error
    return { indices: [], delta: [], stocks: [] };
  }
}

export async function getLotSizes() {
  try {
    const response = await fetch("/api/algotest/lot-sizes");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching lot sizes:", error);
    return {};
  }
}

export async function getDayContracts(underlying, start_ts, end_ts) {
  try {
    const response = await fetch(
      `/api/algotest/day-contracts?underlying=${encodeURIComponent(underlying)}&start_ts=${encodeURIComponent(start_ts)}&end_ts=${encodeURIComponent(end_ts)}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching day contracts:", error);
    return null;
  }
}

export async function getOptionChain(underlying, candle_ts) {
  try {
    const response = await fetch(
      `/api/algotest/option-chain?underlying=${encodeURIComponent(underlying)}&candle=${encodeURIComponent(candle_ts)}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching option chain:", error);
    return null;
  }
}

export async function getTradingCalendar(underlying) {
  try {
    const response = await fetch(
      `/api/algotest/trading-calendar?underlying=${encodeURIComponent(underlying)}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.trading_days || [];
  } catch (error) {
    console.error("Error fetching trading calendar:", error);
    return [];
  }
}

export async function fetchLTP(candle, underlying, expiry, strike, contractType) {
  // Generate a random 8-character ID just like AlgoTest does
  const id = Math.random().toString(36).substring(2, 10);
  
  // Format the candle string to ensure seconds are present
  let formattedCandle = candle;
  if (formattedCandle.length === 16) {
    formattedCandle += ":00";
  }

  const payload = {
    candle: formattedCandle,
    symbols: [
      {
        id: id,
        underlying: underlying,
        expiry: expiry,
        strike: strike,
        contract_type: contractType
      }
    ]
  };

  try {
    const response = await fetch("/api/algotest/ltp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching specific LTP:", error);
    return null;
  }
}

export async function calculateMargin(positions) {
  if (!positions || positions.length === 0) return { margin: 0 };
  
  // Format positions for the margin API
  const ListOfPosition = positions.map(pos => {
    const p = pos.data || pos;
    const instType = p.InstrumentType === "FUT" || p.InstrumentType === 0 ? "FUT" : (p.InstrumentType === -1 ? "PE" : p.InstrumentType === 1 ? "CE" : p.type);
    const netQty = p.Quantity * p.Position;
    
    // Convert 2026-06-02 to 02-Jun-26
    const d = new Date(p.Expiry);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const formattedExpiry = `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear().toString().slice(-2)}`;

    return {
      Ticker: p.Ticker || p.asset,
      Expiry: formattedExpiry,
      Strike: p.Strike,
      InstrumentType: instType,
      NetQty: netQty
    };
  });

  const payload = {
    IndexPrices: {},
    ListOfPosition,
    CalculateForExpiryDay: false
  };

  try {
    const response = await fetch('/api/marginCalcAPI/calculate_margin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    // Total margin = FinalExposure + FinalSpan
    const totalMargin = (data.FinalExposure || 0) + (data.FinalSpan || 0);
    return { margin: totalMargin, details: data };
  } catch (error) {
    console.error("Error fetching margin:", error);
    // Fallback: calculate margin as total premium paid for buy positions
    let totalPremium = 0;
    positions.forEach(pos => {
      const p = pos.data || pos;
      const isBuy = p.Position === 1;
      if (isBuy) {
        totalPremium += parseFloat(p.TradedPrice || 0) * parseInt(p.Quantity || 0, 10);
      }
    });
    return { margin: totalPremium || 0 };
  }
}

