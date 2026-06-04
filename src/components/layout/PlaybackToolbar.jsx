import React, { useState } from 'react';
import { ChevronDown, Lock, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { CustomDateTimePicker } from '../ui/CustomDateTimePicker';

export function PlaybackToolbar({ currentTimestamp = new Date('2026-06-01T09:16:00'), setCurrentTimestamp, tradingDays = [] }) {
  const [hoverVal, setHoverVal] = useState(null);
  const [hoverX, setHoverX] = useState(0);

  const minMins = 9 * 60 + 16;
  const maxMins = 15 * 60 + 30;
  const currentMins = currentTimestamp.getHours() * 60 + currentTimestamp.getMinutes();

  const isTradingDay = (dateObj) => {
    if (tradingDays.length > 0) {
      const dStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      return tradingDays.includes(dStr);
    }
    return dateObj.getDay() !== 0 && dateObj.getDay() !== 6;
  };

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    const h = Math.floor(val / 60);
    const m = val % 60;
    const newTime = new Date(currentTimestamp);
    newTime.setHours(h, m, 0, 0);
    setCurrentTimestamp(newTime);
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left;
    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;
    const percentage = x / rect.width;
    const val = Math.round(minMins + percentage * (maxMins - minMins));
    setHoverVal(val);
    setHoverX(x);
  };

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTimeJump = (minutes) => {
    let newTime = new Date(currentTimestamp);
    newTime.setMinutes(newTime.getMinutes() + minutes);

    const timeInMins = newTime.getHours() * 60 + newTime.getMinutes();
    
    if (timeInMins > maxMins) {
      let nextDay = new Date(currentTimestamp);
      nextDay.setDate(nextDay.getDate() + 1);
      
      let found = false;
      let iterations = 0;
      while (iterations < 30) { // Limit search to 30 days
        if (isTradingDay(nextDay)) {
          found = true;
          break;
        }
        nextDay.setDate(nextDay.getDate() + 1);
        iterations++;
      }

      if (found) {
        newTime = nextDay;
        const overflowMins = timeInMins - maxMins;
        const nextDayMins = minMins + overflowMins - 1;
        newTime.setHours(Math.floor(nextDayMins / 60), nextDayMins % 60, 0, 0);
      } else {
        newTime = new Date(currentTimestamp);
        newTime.setHours(15, 30, 0, 0);
        showToast("No data available after this date");
      }
    } else if (timeInMins < minMins) {
      let prevDay = new Date(currentTimestamp);
      prevDay.setDate(prevDay.getDate() - 1);
      
      let found = false;
      let iterations = 0;
      while (iterations < 30) {
        if (isTradingDay(prevDay)) {
          found = true;
          break;
        }
        prevDay.setDate(prevDay.getDate() - 1);
        iterations++;
      }

      if (found) {
        newTime = prevDay;
        const underflowMins = minMins - timeInMins;
        const prevDayMins = maxMins - underflowMins + 1;
        newTime.setHours(Math.floor(prevDayMins / 60), prevDayMins % 60, 0, 0);
      } else {
        newTime = new Date(currentTimestamp);
        newTime.setHours(9, 16, 0, 0);
        showToast("No data available before this date");
      }
    }

    setCurrentTimestamp(newTime);
  };

  const setExactTime = (hours, mins) => {
     const newTime = new Date(currentTimestamp);
     newTime.setHours(hours, mins, 0, 0);
     setCurrentTimestamp(newTime);
  };

  const handleDayJump = (days) => {
    let newTime = new Date(currentTimestamp);
    newTime.setDate(newTime.getDate() + days);
    
    let found = false;
    let iterations = 0;
    while (iterations < 30) {
      if (isTradingDay(newTime)) {
        found = true;
        break;
      }
      newTime.setDate(newTime.getDate() + (days > 0 ? 1 : -1));
      iterations++;
    }
    
    if (found) {
      setCurrentTimestamp(newTime);
    } else {
      let fallbackTime = new Date(currentTimestamp);
      if (days > 0) {
        fallbackTime.setHours(15, 30, 0, 0);
        showToast("No data available after this date");
      } else {
        fallbackTime.setHours(9, 16, 0, 0);
        showToast("No data available before this date");
      }
      setCurrentTimestamp(fallbackTime);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 relative z-40">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-0 right-4 -translate-y-full mt-[-8px] bg-[#0082f4] text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 z-50 text-sm font-medium">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          {toastMessage}
        </div>
      )}

      {/* Top Slider Row */}
      <div className="flex items-center px-4 py-2 gap-4">
        <span className="text-xs font-medium text-slate-600">09:16</span>
        <div 
          className="flex-1 relative h-2 bg-slate-200 rounded-full flex items-center cursor-pointer group"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverVal(null)}
        >
          <input 
            type="range"
            min={minMins}
            max={maxMins}
            value={currentMins}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
          {/* Progress fill */}
          <div 
            className="absolute left-0 h-full bg-blue-500 rounded-l-full pointer-events-none"
            style={{ width: `${((currentMins - minMins) / (maxMins - minMins)) * 100}%` }}
          />
          {/* Thumb */}
          <div 
            className="absolute w-3 h-3 bg-blue-500 rounded-full shadow pointer-events-none z-10"
            style={{ left: `calc(${((currentMins - minMins) / (maxMins - minMins)) * 100}% - 6px)` }}
          />
          
          {/* Tooltip */}
          {hoverVal !== null && (
            <div 
              className="absolute bottom-full mb-2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-30"
              style={{ left: `${hoverX}px` }}
            >
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-black" />
              {String(Math.floor(hoverVal / 60)).padStart(2, '0')}:{String(hoverVal % 60).padStart(2, '0')}
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-slate-600">15:30</span>
      </div>

      {/* Bottom Controls Row */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 gap-4">
        {/* Left: Import/Export */}
        <div className="flex items-center gap-1 text-sm text-blue-600 font-medium cursor-pointer shrink-0">
          Import/Export <ChevronDown className="w-4 h-4" />
        </div>

        {/* Center: Playback Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-4 shrink-0 mx-auto">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <button className="hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
            <button className="hover:text-slate-800"><Lock className="w-3 h-3" /></button>
            <StepButton onClick={() => handleDayJump(-1)}>-1d</StepButton>
            <StepButton onClick={() => setExactTime(9, 16)}>SOD</StepButton>
            <StepButton onClick={() => handleTimeJump(-60)}>-1h</StepButton>
            <StepButton onClick={() => handleTimeJump(-30)}>-30m</StepButton>
            <StepButton onClick={() => handleTimeJump(-15)}>-15m</StepButton>
            <StepButton onClick={() => handleTimeJump(-5)}>-5m</StepButton>
            <StepButton onClick={() => handleTimeJump(-1)}>-1m</StepButton>
          </div>

          <CustomDateTimePicker currentTimestamp={currentTimestamp} setCurrentTimestamp={setCurrentTimestamp} tradingDays={tradingDays} />

          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <StepButton onClick={() => handleTimeJump(1)}>+1m</StepButton>
            <StepButton onClick={() => handleTimeJump(5)}>+5m</StepButton>
            <StepButton onClick={() => handleTimeJump(15)}>+15m</StepButton>
            <StepButton onClick={() => handleTimeJump(30)}>+30m</StepButton>
            <StepButton onClick={() => handleTimeJump(60)}>+1h</StepButton>
            <StepButton onClick={() => setExactTime(15, 30)}>EOD</StepButton>
            <StepButton onClick={() => handleDayJump(1)}>+1d</StepButton>
            <button className="hover:text-slate-800"><Lock className="w-3 h-3" /></button>
            <button className="hover:text-slate-800"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Right: Autoplay */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 font-medium">
            <Play className="w-4 h-4 fill-current" />
            Autoplay
          </button>
          <div className="flex items-center gap-1 text-sm text-slate-600 cursor-pointer">
            1m/1s <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepButton({ children, onClick }) {
  return (
    <button onClick={onClick} className="hover:text-slate-800 transition-colors">
      {children}
    </button>
  );
}
