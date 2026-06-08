import React, { useState, useEffect } from 'react'
import { Header } from './components/layout/Header'
import { PlaybackToolbar } from './components/layout/PlaybackToolbar'
import { OptionChainPanel } from './components/trading/OptionChainPanel'
import { AnalysisPanel } from './components/trading/AnalysisPanel'
import { getTradingCalendar } from './utils/simulatorUtils'
import { ExpiryAlertModal } from './components/trading/ExpiryAlertModal'
import { AlertsModal } from './components/trading/AlertsModal'
import { ToastContainer, toast } from './components/ui/Toast'
import { calcExactMtm } from './utils/blackScholes'
const getDefaultTimestamp = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  let targetDate = new Date(now);
  
  // If it's before 3:30 PM, use the previous day
  if (hours < 15 || (hours === 15 && minutes < 30)) {
    targetDate.setDate(targetDate.getDate() - 1);
  }

  // Adjust for weekends (0 = Sunday, 6 = Saturday)
  if (targetDate.getDay() === 0) {
    targetDate.setDate(targetDate.getDate() - 2); // Go back to Friday
  } else if (targetDate.getDay() === 6) {
    targetDate.setDate(targetDate.getDate() - 1); // Go back to Friday
  }

  // Set time to 09:16:00
  targetDate.setHours(9, 16, 0, 0);
  return targetDate;
};

const getInitialTimestamp = () => {
  const cached = localStorage.getItem('simulator_timestamp');
  if (cached) {
    const d = new Date(cached);
    if (!isNaN(d.getTime())) return d;
  }
  return getDefaultTimestamp();
};

function App() {
  const [selectedAsset, setSelectedAsset] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedAsset");
      return saved ? JSON.parse(saved) : { name: 'NIFTY 50', underlying: 'NIFTY', exchange: 'NSE' };
    } catch {
      return { name: 'NIFTY 50', underlying: 'NIFTY', exchange: 'NSE' };
    }
  });
  
  const [currentTimestamp, setCurrentTimestamp] = useState(getInitialTimestamp);

  useEffect(() => {
    localStorage.setItem("selectedAsset", JSON.stringify(selectedAsset));
  }, [selectedAsset]);

  useEffect(() => {
    if (currentTimestamp) {
      localStorage.setItem("simulator_timestamp", currentTimestamp.toISOString());
    }
  }, [currentTimestamp]);

  const [tradingDays, setTradingDays] = useState([]);

  useEffect(() => {
    async function fetchCalendar() {
      if (!selectedAsset) return;
      const days = await getTradingCalendar(selectedAsset.underlying);
      setTradingDays(days);
    }
    fetchCalendar();
  }, [selectedAsset]);

  const [globalOptionData, setGlobalOptionData] = useState(null);
  
  const [positions, setPositions] = useState(() => {
    try {
      const saved = localStorage.getItem("simulator_positions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("simulator_positions", JSON.stringify(positions));
  }, [positions]);

  const [pendingTimestamp, setPendingTimestamp] = useState(null);
  const [expiringPositions, setExpiringPositions] = useState([]);
  
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [globalAlerts, setGlobalAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem("simulator_alerts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  useEffect(() => {
    localStorage.setItem("simulator_alerts", JSON.stringify(globalAlerts));
  }, [globalAlerts]);

  const [triggeredAlerts, setTriggeredAlerts] = useState(new Set());

  // Check for alerts
  useEffect(() => {
    if (!positions || positions.length === 0 || !globalOptionData) return;
    
    const currentSpot = globalOptionData?.cash?.close;
    if (!currentSpot) return;

    let totalMTM = 0;
    
    // Check position alerts & calculate MTM
    positions.forEach((pos, idx) => {
      const p = pos.data || pos;
      const isBuy = p.Position === 1;
      const isCall = p.InstrumentType === 1 || p.type === 'CE';
      const isFut = p.InstrumentType === 'FUT' || p.InstrumentType === 0;
      const qty = parseInt(p.Quantity || 0, 10);
      const entryPrice = parseFloat(p.TradedPrice || 0);
      const strike = p.Strike;
      
      let ltp = entryPrice;
      if (isFut) {
        const futPriceObj = globalOptionData.futures?.[p.Expiry]?.close || globalOptionData.implied_futures?.[p.Expiry];
        if (futPriceObj) ltp = parseFloat(futPriceObj);
      } else if (globalOptionData.options?.[p.Expiry]) {
        const expiryData = globalOptionData.options[p.Expiry];
        const strikeIdx = expiryData.strike?.indexOf(strike);
        if (strikeIdx !== -1) {
          const closePrice = isCall ? expiryData.call_close?.[strikeIdx] : expiryData.put_close?.[strikeIdx];
          if (closePrice !== undefined && closePrice !== null) ltp = parseFloat(closePrice);
        }
      }

      const mtm = isBuy ? (ltp - entryPrice) * qty : (entryPrice - ltp) * qty;
      totalMTM += mtm;

      // Check Target
      if (p.target) {
        const alertId = `target-${idx}-${p.target}`;
        const hitTarget = isBuy ? (ltp >= p.target) : (ltp <= p.target);
        if (hitTarget && !triggeredAlerts.has(alertId)) {
          let identifier = "";
          if (p.Expiry) {
            const expDate = new Date(p.Expiry);
            identifier = `${expDate.getDate().toString().padStart(2, "0")} ${expDate.toLocaleString("default", { month: "short" })} ${isFut ? "FUT" : strike + " " + (isCall ? "CE" : "PE")}`;
          }
          toast.notify({ identifier, isBuy, value: ltp.toFixed(2) }, "target");
          setTriggeredAlerts(prev => new Set(prev).add(alertId));
        }
      }

      // Check Stop Loss
      if (p.stopLoss) {
        const alertId = `stopLoss-${idx}-${p.stopLoss}`;
        const hitSl = isBuy ? (ltp <= p.stopLoss) : (ltp >= p.stopLoss);
        if (hitSl && !triggeredAlerts.has(alertId)) {
          let identifier = "";
          if (p.Expiry) {
            const expDate = new Date(p.Expiry);
            identifier = `${expDate.getDate().toString().padStart(2, "0")} ${expDate.toLocaleString("default", { month: "short" })} ${isFut ? "FUT" : strike + " " + (isCall ? "CE" : "PE")}`;
          }
          toast.notify({ identifier, isBuy, value: ltp.toFixed(2) }, "stopLoss");
          setTriggeredAlerts(prev => new Set(prev).add(alertId));
        }
      }
    });

    // Check Global Alerts
    if (globalAlerts.targetEnabled && globalAlerts.targetValue !== null) {
      const alertId = `global-target-${globalAlerts.targetValue}`;
      if (totalMTM >= globalAlerts.targetValue && !triggeredAlerts.has(alertId)) {
        toast.notify(`Overall Target of ₹${globalAlerts.targetValue} reached`, "global");
        setTriggeredAlerts(prev => new Set(prev).add(alertId));
      }
    }

    if (globalAlerts.stopLossEnabled && globalAlerts.stopLossValue !== null) {
      const alertId = `global-stoploss-${globalAlerts.stopLossValue}`;
      if (totalMTM <= globalAlerts.stopLossValue && !triggeredAlerts.has(alertId)) {
        toast.notify(`Overall Stop Loss of ₹${globalAlerts.stopLossValue} reached`, "global");
        setTriggeredAlerts(prev => new Set(prev).add(alertId));
      }
    }

    if (globalAlerts.underlyingEnabled && globalAlerts.underlyingValue !== null) {
      const alertId = `global-underlying-${globalAlerts.underlyingType}-${globalAlerts.underlyingValue}`;
      const hit = globalAlerts.underlyingType === 'LessThan' 
        ? currentSpot <= globalAlerts.underlyingValue 
        : currentSpot >= globalAlerts.underlyingValue;
      
      if (hit && !triggeredAlerts.has(alertId)) {
        toast.notify(`Underlying is ${globalAlerts.underlyingType === 'LessThan' ? '<' : '>'} ${globalAlerts.underlyingValue}`, "global");
        setTriggeredAlerts(prev => new Set(prev).add(alertId));
      }
    }

  }, [currentTimestamp, globalOptionData, positions, globalAlerts, triggeredAlerts]);

  const handleTimestampChange = (newTime) => {
    if (!positions || positions.length === 0 || !newTime || !currentTimestamp) {
      setCurrentTimestamp(newTime);
      return;
    }

    if (newTime.getTime() > currentTimestamp.getTime()) {
      let crossedExpiries = [];

      for (const pos of positions) {
        const p = pos.data || pos;
        if (!p.Expiry) continue;
        
        const expDate = new Date(p.Expiry);
        expDate.setHours(15, 30, 0, 0);

        if (currentTimestamp.getTime() <= expDate.getTime() && newTime.getTime() >= expDate.getTime()) {
          crossedExpiries.push({ pos, expTime: expDate.getTime(), expDateStr: p.Expiry });
        }
      }

      if (crossedExpiries.length > 0) {
        crossedExpiries.sort((a, b) => a.expTime - b.expTime);
        const earliestExpiryStr = crossedExpiries[0].expDateStr;
        const expiring = crossedExpiries.filter(ce => ce.expDateStr === earliestExpiryStr).map(ce => ce.pos);
        
        setExpiringPositions(expiring);
        setPendingTimestamp(newTime);
        return;
      }
    }
    
    setCurrentTimestamp(newTime);
  };

  const handleJumpBack = () => {
    if (expiringPositions.length > 0) {
      const p = expiringPositions[0].data || expiringPositions[0];
      const expDate = new Date(p.Expiry);
      expDate.setHours(15, 30, 0, 0);
      setCurrentTimestamp(expDate);
    }
    setExpiringPositions([]);
    setPendingTimestamp(null);
  };

  const handleAutoExpire = () => {
    const remainingPositions = positions.filter(pos => !expiringPositions.includes(pos));
    setPositions(remainingPositions);
    
    const nextTime = pendingTimestamp;
    setExpiringPositions([]);
    setPendingTimestamp(null);
    
    if (nextTime) {
      // Re-trigger the handler to catch any subsequent expiries before nextTime
      setTimeout(() => handleTimestampChange(nextTime), 0);
    }
  };

  const handleCloseAlert = () => {
    setExpiringPositions([]);
    setPendingTimestamp(null);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Header />
      <PlaybackToolbar currentTimestamp={currentTimestamp} setCurrentTimestamp={handleTimestampChange} tradingDays={tradingDays} hasPositions={positions && positions.length > 0} />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[45%_55%] overflow-hidden">
        <OptionChainPanel 
          currentTimestamp={currentTimestamp} 
          selectedAsset={selectedAsset} 
          setSelectedAsset={setSelectedAsset} 
          onDataLoaded={setGlobalOptionData} 
          positions={positions}
          setPositions={setPositions}
          onOpenAlerts={() => setIsAlertsOpen(true)}
        />
        <AnalysisPanel 
          vixData={globalOptionData?.vix} 
          positions={positions} 
          setPositions={setPositions} 
          currentTimestamp={currentTimestamp}
          spotPrice={globalOptionData?.cash?.close}
          optionChainData={globalOptionData}
        />
      </div>
      <ExpiryAlertModal 
        expiringPositions={expiringPositions}
        onJumpBack={handleJumpBack}
        onAutoExpire={handleAutoExpire}
        onClose={handleCloseAlert}
        optionChainData={globalOptionData}
      />
      
      {isAlertsOpen && (
        <AlertsModal 
          positions={positions}
          setPositions={setPositions}
          globalAlerts={globalAlerts}
          setGlobalAlerts={setGlobalAlerts}
          onClose={() => setIsAlertsOpen(false)}
          currentSpot={globalOptionData?.cash?.close}
          totalMTM={positions && positions.length > 0 && globalOptionData ? calcExactMtm(positions, globalOptionData?.cash?.close, currentTimestamp, globalOptionData) : 0}
          totalDelta={0}
        />
      )}
      
      <ToastContainer />
    </div>
  )
}

export default App
