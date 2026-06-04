import React, { useState, useEffect } from 'react'
import { Header } from './components/layout/Header'
import { PlaybackToolbar } from './components/layout/PlaybackToolbar'
import { OptionChainPanel } from './components/trading/OptionChainPanel'
import { AnalysisPanel } from './components/trading/AnalysisPanel'
import { getTradingCalendar } from './utils/simulatorUtils'

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

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Header />
      <PlaybackToolbar currentTimestamp={currentTimestamp} setCurrentTimestamp={setCurrentTimestamp} tradingDays={tradingDays} />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[45%_55%] overflow-hidden">
        <OptionChainPanel currentTimestamp={currentTimestamp} selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} onDataLoaded={setGlobalOptionData} />
        <AnalysisPanel vixData={globalOptionData?.vix} />
      </div>
    </div>
  )
}

export default App
