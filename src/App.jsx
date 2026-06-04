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

function App() {
  const [currentTimestamp, setCurrentTimestamp] = useState(getDefaultTimestamp());
  const [selectedAsset, setSelectedAsset] = useState({
    id: "BANKNIFTY",
    name: "BANKNIFTY",
    underlying: "BANKNIFTY",
  });
  const [tradingDays, setTradingDays] = useState([]);

  useEffect(() => {
    async function fetchCalendar() {
      if (!selectedAsset) return;
      const days = await getTradingCalendar(selectedAsset.underlying);
      setTradingDays(days);
    }
    fetchCalendar();
  }, [selectedAsset]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Header />
      <PlaybackToolbar currentTimestamp={currentTimestamp} setCurrentTimestamp={setCurrentTimestamp} tradingDays={tradingDays} />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[45%_55%] overflow-hidden">
        <OptionChainPanel currentTimestamp={currentTimestamp} selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} />
        <AnalysisPanel />
      </div>
    </div>
  )
}

export default App
