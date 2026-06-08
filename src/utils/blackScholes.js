// src/utils/blackScholes.js

// Standard normal cumulative distribution function
export function N(x) {
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (x >= 0.0) {
    const t = 1.0 / (1.0 + p * x);
    return (
      1.0 -
      c *
        Math.exp((-x * x) / 2.0) *
        t *
        (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1)
    );
  } else {
    const t = 1.0 / (1.0 - p * x);
    return (
      c *
      Math.exp((-x * x) / 2.0) *
      t *
      (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1)
    );
  }
}

/**
 * Calculate Call Option Price using Black-Scholes
 */
export function bsCall(S, K, T, r, v) {
  if (T <= 0) return Math.max(0, S - K);
  if (v <= 0) v = 0.001;
  const d1 =
    (Math.log(S / K) + (r + (v * v) / 2.0) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);
  return S * N(d1) - K * Math.exp(-r * T) * N(d2);
}

/**
 * Calculate Put Option Price using Black-Scholes
 */
export function bsPut(S, K, T, r, v) {
  if (T <= 0) return Math.max(0, K - S);
  if (v <= 0) v = 0.001;
  const d1 =
    (Math.log(S / K) + (r + (v * v) / 2.0) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);
  return K * Math.exp(-r * T) * N(-d2) - S * N(-d1);
}

/**
 * Calculate all option Greeks
 */
export function calcGreeks(S, K, T, r, v, isCall) {
  if (T <= 0) return { delta: 0, gamma: 0, theta: 0, vega: 0 };
  if (v <= 0) v = 0.001;
  const d1 = (Math.log(S / K) + (r + (v * v) / 2.0) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);
  
  const Nd1 = N(d1);
  const Nd2 = N(d2);
  const Nd1_prime = Math.exp(-d1 * d1 / 2.0) / Math.sqrt(2.0 * Math.PI);
  
  const delta = isCall ? Nd1 : Nd1 - 1;
  const gamma = Nd1_prime / (S * v * Math.sqrt(T));
  const vega = S * Nd1_prime * Math.sqrt(T) / 100.0; // per 1% change in IV
  
  const thetaCall = (- (S * v * Nd1_prime) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * Nd2) / 365.0;
  const thetaPut = (- (S * v * Nd1_prime) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * N(-d2)) / 365.0;
  const theta = isCall ? thetaCall : thetaPut;
  
  return { delta, gamma, theta, vega };
}

/**
 * Parse a date string ensuring UTC consistency.
 * TradedTime is stored as ISO without 'Z' (e.g. "2026-06-04T03:47:00").
 * new Date() without 'Z' is parsed as local time in some browsers,
 * causing a timezone offset bug. This ensures UTC.
 */
function parseAsUTC(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  // If already ends with Z or has timezone offset, parse directly
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  // Append 'Z' to force UTC interpretation
  return new Date(dateStr + 'Z');
}

const RISK_FREE_RATE = 0.07; // 7% for Indian markets

/**
 * Helper: get IV as decimal for a position
 */
function getIV(p, optionChainData = null) {
  let iv = parseFloat(p.iv);
  
  if ((isNaN(iv) || iv <= 0) && optionChainData?.options) {
    const expiry = p.Expiry;
    const strike = p.Strike || p.strike;
    const isCall = p.InstrumentType === 1 || p.type === 'CE';
    if (optionChainData.options[expiry] && optionChainData.options[expiry][strike]) {
       const liveIv = isCall ? optionChainData.options[expiry][strike].call_iv : optionChainData.options[expiry][strike].put_iv;
       if (liveIv > 0) iv = liveIv;
    }
  }

  if (isNaN(iv) || iv <= 0) iv = 15;
  if (iv > 1) iv = iv / 100;
  return iv;
}

/**
 * Helper: Parse Expiry Date and set exactly to 15:30 IST (10:00 UTC)
 */
export function getExpiryDate(expiryStr) {
  const d = new Date(expiryStr);
  // Reset the date's UTC hours to 10:00:00 (which is exactly 15:30 IST)
  // This prevents negative or erroneous Time To Expiry calculations on 0DTE options.
  d.setUTCHours(10, 0, 0, 0);
  return d;
}

/**
 * Helper: get time to expiry in years
 */
function getTimeToExpiry(expiryDate, fromDate) {
  let days = (expiryDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0.001) days = 0.001; // Minimum 0DTE floor
  return days / 365.0;
}

/**
 * Calculate the exact T+0 MTM at the current spot price.
 * This avoids the grid interpolation error.
 */
export function calcExactMtm(positions, currentSpot, currentDate, optionChainData = null) {
  if (!positions || positions.length === 0 || !currentSpot) return 0;

  const safeDate = currentDate instanceof Date ? currentDate : new Date(currentDate);
  let totalMtm = 0;

  positions.forEach((pos) => {
    const p = pos.data || pos;
    const strike = parseFloat(p.Strike || p.strike);
    let entryPrice = parseFloat(p.TradedPrice || p.entryPrice);
    if (isNaN(entryPrice)) entryPrice = 0;
    const qty = parseInt(p.Quantity || p.qty, 10) || 1;
    const isCall = p.InstrumentType === 1 || p.type === 'CE';
    const isFut = p.InstrumentType === 'FUT' || p.InstrumentType === 0;
    const isBuy = p.Position === 1 || p.side === 'B';
    const iv = getIV(p, optionChainData);
    let entrySpot = parseFloat(p.entrySpot);
    if (isNaN(entrySpot)) entrySpot = currentSpot;

    const expiryDate = getExpiryDate(p.Expiry);
    const entryDate = parseAsUTC(p.TradedTime) || safeDate;

    // Time to expiry from NOW
    const T_now = getTimeToExpiry(expiryDate, safeDate);
    // Time to expiry at ENTRY
    const T_entry = getTimeToExpiry(expiryDate, entryDate);

    // Current theoretical value at current spot & current time
    let currentVal = isCall
      ? bsCall(currentSpot, strike, T_now, RISK_FREE_RATE, iv)
      : bsPut(currentSpot, strike, T_now, RISK_FREE_RATE, iv);

    // Theoretical value at ENTRY SPOT & ENTRY TIME
    let entryVal = isCall
      ? bsCall(entrySpot, strike, T_entry, RISK_FREE_RATE, iv)
      : bsPut(entrySpot, strike, T_entry, RISK_FREE_RATE, iv);

    // Offset to align theoretical with actual traded price
    const offset = entryPrice - entryVal;
    currentVal += offset;

    // PnL
    let pnl = 0;
    if (isFut) {
      let actualCurrentFuture = currentSpot;
      if (optionChainData) {
        const expiry = p.Expiry;
        if (optionChainData.futures && optionChainData.futures[expiry]) {
          actualCurrentFuture = optionChainData.futures[expiry].close;
        } else if (optionChainData.implied_futures && optionChainData.implied_futures[expiry]) {
          actualCurrentFuture = optionChainData.implied_futures[expiry];
        }
      }
      pnl = isBuy
        ? (actualCurrentFuture - entryPrice) * qty
        : (entryPrice - actualCurrentFuture) * qty;
    } else {
      let actualCurrentOptionVal = null;
      if (optionChainData?.options?.[p.Expiry]) {
        const expData = optionChainData.options[p.Expiry];
        if (expData && expData.strike) {
          const sIdx = expData.strike.indexOf(strike);
          if (sIdx !== -1) {
            const ltp = isCall ? expData.call_close?.[sIdx] : expData.put_close?.[sIdx];
            if (ltp != null && !isNaN(ltp)) {
              actualCurrentOptionVal = parseFloat(ltp);
            }
          }
        }
      }

      if (actualCurrentOptionVal !== null) {
        pnl = isBuy
          ? (actualCurrentOptionVal - entryPrice) * qty
          : (entryPrice - actualCurrentOptionVal) * qty;
      } else {
        pnl = isBuy
          ? (currentVal - entryPrice) * qty
          : (entryPrice - currentVal) * qty;
      }
    }

    totalMtm += pnl;
  });

  return totalMtm;
}

/**
 * Calculate POP using lognormal probability at breakeven points
 */
export function calcPOP(positions, currentSpot, currentDate, optionChainData = null) {
  if (!positions || positions.length === 0 || !currentSpot) return 0;

  const safeDate = currentDate instanceof Date ? currentDate : new Date(currentDate);

  // Get average IV and time to expiry from positions
  let totalIV = 0;
  let totalT = 0;
  let count = 0;
  positions.forEach((pos) => {
    const p = pos.data || pos;
    const iv = getIV(p, optionChainData);
    const expiryDate = getExpiryDate(p.Expiry);
    const T = getTimeToExpiry(expiryDate, safeDate);
    totalIV += iv;
    totalT += T;
    count++;
  });
  const avgIV = totalIV / count;
  const avgT = totalT / count;

  // Sample many spots using lognormal distribution and check payoff
  // More accurate than simple counting
  const numSamples = 2000;
  const sigmaT = avgIV * Math.sqrt(avgT);
  const drift = (RISK_FREE_RATE - 0.5 * avgIV * avgIV) * avgT;

  let profitCount = 0;
  for (let i = 0; i < numSamples; i++) {
    // Generate lognormal random spot using Box-Muller
    const u1 = (i + 0.5) / numSamples; // Uniform quantile (stratified)
    // Inverse normal CDF approximation
    const z = inverseNormal(u1);
    const futureSpot = currentSpot * Math.exp(drift + sigmaT * z);

    // Calculate expiry payoff at this spot
    let payoff = 0;
    positions.forEach((pos) => {
      const p = pos.data || pos;
      const strike = parseFloat(p.Strike || p.strike);
      let entryPrice = parseFloat(p.TradedPrice || p.entryPrice);
      if (isNaN(entryPrice)) entryPrice = 0;
      const qty = parseInt(p.Quantity || p.qty, 10) || 1;
      const isCall = p.InstrumentType === 1 || p.type === 'CE';
      const isFut = p.InstrumentType === 'FUT' || p.InstrumentType === 0;
      const isBuy = p.Position === 1 || p.side === 'B';
      let entrySpot = parseFloat(p.entrySpot);
      if (isNaN(entrySpot)) entrySpot = currentSpot;

      let pnl = 0;
      if (isFut) {
        pnl = isBuy
          ? (futureSpot - entryPrice) * qty
          : (entryPrice - futureSpot) * qty;
      } else {
        let valAtExpiry = isCall
          ? Math.max(0, futureSpot - strike)
          : Math.max(0, strike - futureSpot);

        pnl = isBuy
          ? (valAtExpiry - entryPrice) * qty
          : (entryPrice - valAtExpiry) * qty;
      }

      payoff += pnl;
    });

    if (payoff > 0) profitCount++;
  }

  return (profitCount / numSamples) * 100;
}

/**
 * Inverse normal CDF (rational approximation)
 */
function inverseNormal(p) {
  if (p <= 0) return -8;
  if (p >= 1) return 8;
  if (p < 0.5) return -inverseNormal(1 - p);

  const a = [-3.969683028665376e+1, 2.209460984245205e+2,
    -2.759285104469687e+2, 1.383577518672690e+2,
    -3.066479806614716e+1, 2.506628277459239e+0];
  const b = [-5.447609879822406e+1, 1.615858368580409e+2,
    -1.556989798598866e+2, 6.680131188771972e+1,
    -1.328068155288572e+1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e+0, -2.549732539343734e+0,
    4.374664141464968e+0, 2.938163982698783e+0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e+0, 3.754408661907416e+0];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/**
 * Generate payoff arrays for graphing
 * @param {Array} positions List of active positions
 * @param {number} currentSpot Current underlying spot price
 * @param {Date|string} currentDate Current playback date
 * @returns {Array} Array of data points { spot, expiryPayoff, tZeroPayoff }
 */
export function generatePayoffData(positions, currentSpot, currentDate, optionChainData = null) {
  if (!positions || positions.length === 0 || !currentSpot) return [];

  const safeDate = currentDate instanceof Date ? currentDate : new Date(currentDate);

  // ±5% range with 400 points for finer resolution (matches AlgoTest)
  const numPoints = 400;
  const spotRange = currentSpot * 0.05;
  const minSpot = Math.floor(currentSpot - spotRange);
  const maxSpot = Math.ceil(currentSpot + spotRange);
  const step = (maxSpot - minSpot) / numPoints;

  const data = [];

  // Pre-calculate offsets for each position to align BS with actual traded price
  const positionOffsets = positions.map((pos) => {
    const p = pos.data || pos;
    const strike = parseFloat(p.Strike || p.strike);
    let entryPrice = parseFloat(p.TradedPrice || p.entryPrice);
    if (isNaN(entryPrice)) entryPrice = 0;
    const isCall = p.InstrumentType === 1 || p.type === 'CE';
    const isFut = p.InstrumentType === 'FUT' || p.InstrumentType === 0;
    const iv = getIV(p, optionChainData);
    let entrySpot = parseFloat(p.entrySpot);
    if (isNaN(entrySpot)) entrySpot = currentSpot;

    const expiryDate = getExpiryDate(p.Expiry);
    const entryDate = parseAsUTC(p.TradedTime) || safeDate;
    const T_entry = getTimeToExpiry(expiryDate, entryDate);
    const T_now = getTimeToExpiry(expiryDate, safeDate);

    // Get exact current LTP if available
    let currentLTP = null;
    if (!isFut && optionChainData?.options && optionChainData.options[p.Expiry]) {
      const expData = optionChainData.options[p.Expiry];
      if (expData[strike]) {
        currentLTP = isCall ? expData[strike].call_close : expData[strike].put_close;
      }
    }

    if (currentLTP !== null && currentLTP > 0) {
      // Anchor curve perfectly to the live current price
      let theoreticalCurrentPrice = isCall
        ? bsCall(currentSpot, strike, T_now, RISK_FREE_RATE, iv)
        : bsPut(currentSpot, strike, T_now, RISK_FREE_RATE, iv);
      return currentLTP - theoreticalCurrentPrice;
    } else {
      // Fallback: anchor to entry price
      let theoreticalEntryPrice = isFut
        ? entrySpot 
        : (isCall
          ? bsCall(entrySpot, strike, T_entry, RISK_FREE_RATE, iv)
          : bsPut(entrySpot, strike, T_entry, RISK_FREE_RATE, iv));
      return entryPrice - theoreticalEntryPrice;
    }
  });

  for (let s = minSpot; s <= maxSpot; s += step) {
    const spot = Math.round(s);
    let expiryPayoff = 0;
    let tZeroPayoff = 0;

    positions.forEach((pos, idx) => {
      const p = pos.data || pos;
      const strike = parseFloat(p.Strike || p.strike);
      let entryPrice = parseFloat(p.TradedPrice || p.entryPrice);
      if (isNaN(entryPrice)) entryPrice = 0;
      
      const qty = parseInt(p.Quantity || p.qty, 10) || 1;
      const isCall = p.InstrumentType === 1 || p.type === 'CE';
      const isFut = p.InstrumentType === 'FUT' || p.InstrumentType === 0;
      const isBuy = p.Position === 1 || p.side === 'B';
      const iv = getIV(p, optionChainData);
      let entrySpot = parseFloat(p.entrySpot);
      if (isNaN(entrySpot)) entrySpot = currentSpot;

      // === Expiry Payoff (Intrinsic Value) ===
      if (isFut) {
        // Expiry payoff assumes basis = 0 (Spot = Future)
        let pnlExpiry = isBuy
          ? (spot - entryPrice) * qty
          : (entryPrice - spot) * qty;
        expiryPayoff += pnlExpiry;
        
        // T+0 payoff assumes current basis remains constant across spot movement
        // currentBasis = actualCurrentFuture - currentSpot
        let actualCurrentFuture = currentSpot;
        if (optionChainData) {
          const expiry = p.Expiry;
          if (optionChainData.futures && optionChainData.futures[expiry]) {
            actualCurrentFuture = optionChainData.futures[expiry].close;
          } else if (optionChainData.implied_futures && optionChainData.implied_futures[expiry]) {
            actualCurrentFuture = optionChainData.implied_futures[expiry];
          }
        }
        const currentBasis = actualCurrentFuture - currentSpot;
        const shiftedSpot = spot + currentBasis;
        
        let pnlTZero = isBuy
          ? (shiftedSpot - entryPrice) * qty
          : (entryPrice - shiftedSpot) * qty;
        tZeroPayoff += pnlTZero;
      } else {
        let valAtExpiry = isCall
          ? Math.max(0, spot - strike)
          : Math.max(0, strike - spot);

        let pnlAtExpiry = isBuy
          ? (valAtExpiry - entryPrice) * qty
          : (entryPrice - valAtExpiry) * qty;
        expiryPayoff += pnlAtExpiry;

        // === T+0 Payoff (Black-Scholes) ===
        const expiryDate = getExpiryDate(p.Expiry);
        const T_now = getTimeToExpiry(expiryDate, safeDate);

        let valAtTZero = isCall
          ? bsCall(spot, strike, T_now, RISK_FREE_RATE, iv) + positionOffsets[idx]
          : bsPut(spot, strike, T_now, RISK_FREE_RATE, iv) + positionOffsets[idx];

        // Option price can't go below 0
        if (valAtTZero < 0) valAtTZero = 0;

        let pnlAtTZero = isBuy
          ? (valAtTZero - entryPrice) * qty
          : (entryPrice - valAtTZero) * qty;
        tZeroPayoff += pnlAtTZero;
      }
    });

    data.push({ spot, expiryPayoff, tZeroPayoff });
  }

  return data;
}
