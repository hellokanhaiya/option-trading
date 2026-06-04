import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export function CustomDateTimePicker({ currentTimestamp, setCurrentTimestamp, tradingDays = [] }) {
  const [activePopover, setActivePopover] = useState(null); // 'date' | 'time' | null
  const [view, setView] = useState('days'); // 'years' | 'months' | 'days'

  const ts = currentTimestamp || new Date('2026-06-01T09:16:00');
  
  const [stagedTs, setStagedTs] = useState(ts);
  const [viewMonth, setViewMonth] = useState(ts.getMonth());
  const [viewYear, setViewYear] = useState(ts.getFullYear());
  
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActivePopover(null);
      }
    };
    
    if (activePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activePopover]);

  useEffect(() => {
    if (activePopover === 'date' || activePopover === 'time') {
      setStagedTs(ts);
      if (activePopover === 'date') {
        setViewMonth(ts.getMonth());
        setViewYear(ts.getFullYear());
      }
    }
  }, [activePopover, ts]);

  const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const displayDate = `${daysArr[ts.getDay()]} ${String(ts.getDate()).padStart(2, '0')} ${monthsArr[ts.getMonth()]} ${ts.getFullYear().toString().substring(2)}`;
  const displayTime = `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`;

  const handlePrev = () => {
    if (view === 'days') {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
      else { setViewMonth(viewMonth - 1); }
    } else if (view === 'months') {
      setViewYear(viewYear - 1);
    } else if (view === 'years') {
      setViewYear(viewYear - 12);
    }
  };

  const handleNext = () => {
    if (view === 'days') {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
      else { setViewMonth(viewMonth + 1); }
    } else if (view === 'months') {
      setViewYear(viewYear + 1);
    } else if (view === 'years') {
      setViewYear(viewYear + 12);
    }
  };

  const setYear = (y) => {
    setViewYear(y);
    setView('months');
  };

  const setMonth = (mIdx) => {
    setViewMonth(mIdx);
    setView('days');
  };

  const setDate = (d) => {
    const newTs = new Date(stagedTs);
    newTs.setFullYear(viewYear);
    newTs.setMonth(viewMonth);
    newTs.setDate(d);
    setStagedTs(newTs);
  };

  const handleConfirmDate = () => {
    setCurrentTimestamp(stagedTs);
    setActivePopover(null);
  };

  const setHour = (h) => {
    const newTs = new Date(stagedTs);
    newTs.setHours(h);
    // Cap minutes based on market hours
    if (h === 9 && newTs.getMinutes() < 16) {
      newTs.setMinutes(16);
    } else if (h === 15 && newTs.getMinutes() > 30) {
      newTs.setMinutes(30);
    }
    setStagedTs(newTs);
  };

  const setMinute = (m) => {
    const newTs = new Date(stagedTs);
    newTs.setMinutes(m);
    setStagedTs(newTs);
  };

  const handleConfirmTime = () => {
    setCurrentTimestamp(stagedTs);
    setActivePopover(null);
  };

  const getValidMinutes = (hour) => {
    let start = 0;
    let end = 59;
    if (hour === 9) start = 16;
    if (hour === 15) end = 30;
    return Array.from({length: end - start + 1}, (_, i) => i + start);
  };

  return (
    <div ref={containerRef} className="relative flex items-center bg-slate-50 border border-slate-200 rounded-md">
      {/* Date Button - removed bg-slate-800 to fix black bg issue, kept width consistent to avoid shift */}
      <button 
        onClick={() => { setActivePopover(activePopover === 'date' ? null : 'date'); setView('days'); }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-normal ${activePopover === 'date' ? 'bg-slate-100 text-slate-800 rounded-l-md' : 'text-slate-700 hover:bg-slate-100 rounded-l-md'}`}
      >
        {displayDate} <ChevronDown className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-slate-300"></div>

      {/* Time Button */}
      <button 
        onClick={() => { setActivePopover(activePopover === 'time' ? null : 'time'); }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-normal ${activePopover === 'time' ? 'bg-slate-100 text-slate-800 rounded-r-md' : 'text-slate-700 hover:bg-slate-100 rounded-r-md'}`}
      >
        {displayTime} <ChevronDown className="w-4 h-4" />
      </button>

      {/* Popovers */}
      {activePopover === 'date' && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <button 
              className="text-lg font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1"
              onClick={() => {
                if (view === 'days') setView('months');
                else if (view === 'months') setView('years');
              }}
            >
              {view === 'days' && <span className={stagedTs.getMonth() === viewMonth && stagedTs.getFullYear() === viewYear ? "text-blue-500" : ""}>{stagedTs.getDate()}</span>}
              <span>{monthsArr[viewMonth].toUpperCase()}</span> 
              <span>{viewYear}</span>
            </button>
            <div className="flex gap-1">
              <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded font-bold text-slate-800"><ChevronLeft className="w-5 h-5" strokeWidth={3} /></button>
              <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded font-bold text-slate-800"><ChevronRight className="w-5 h-5" strokeWidth={3} /></button>
            </div>
          </div>

          {view === 'years' && <YearSelector currentYear={viewYear} onSelect={setYear} />}
          {view === 'months' && <MonthSelector currentMonth={viewMonth} onSelect={setMonth} />}
          {view === 'days' && <DaySelector currentMonth={viewMonth} currentDate={stagedTs.getMonth() === viewMonth && stagedTs.getFullYear() === viewYear ? stagedTs.getDate() : null} currentYear={viewYear} onSelect={setDate} onConfirm={handleConfirmDate} tradingDays={tradingDays} />}
        </div>
      )}

      {activePopover === 'time' && (
        <div className="absolute top-full mt-2 right-0 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-3">
          <div className="flex justify-center items-center gap-2 text-[15px] font-bold mb-3 text-slate-800">
            <div className="flex flex-col items-center w-12">
              <span>{String(stagedTs.getHours()).padStart(2, '0')}</span>
              <div className="w-full h-px bg-slate-200 mt-1"></div>
            </div>
            <span className="mb-2">:</span>
            <div className="flex flex-col items-center w-12">
              <span>{String(stagedTs.getMinutes()).padStart(2, '0')}</span>
              <div className="w-full h-px bg-slate-200 mt-1"></div>
            </div>
          </div>
          <div className="flex justify-center gap-3 h-[240px] mb-3">
            {/* Hours */}
            <div className="flex flex-col gap-1 w-12 shrink-0">
              {[9, 10, 11, 12, 13, 14, 15].map(h => (
                <div 
                  key={h} 
                  onClick={() => setHour(h)}
                  className={`py-1 text-center text-[15px] cursor-pointer rounded border ${stagedTs.getHours() === h ? 'text-[#0082f4] bg-[#f0f7ff] border-[#0082f4] font-medium' : 'text-slate-700 border-transparent hover:bg-slate-100'}`}
                >
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>
            {/* Minutes */}
            <div className="flex flex-col gap-1 w-12 shrink-0 overflow-y-auto no-scrollbar">
              {getValidMinutes(stagedTs.getHours()).map(m => (
                <div 
                  key={m} 
                  onClick={() => setMinute(m)}
                  className={`py-1 text-center text-[15px] cursor-pointer rounded border shrink-0 ${stagedTs.getMinutes() === m ? 'text-[#0082f4] bg-[#f0f7ff] border-[#0082f4] font-medium' : 'text-slate-700 border-transparent hover:bg-slate-100'}`}
                >
                  {String(m).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
          <button 
            className="w-full bg-[#0082f4] hover:bg-blue-600 text-white rounded py-2 text-sm font-medium"
            onClick={handleConfirmTime}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function YearSelector({ currentYear, onSelect }) {
  const years = Array.from({length: 12}, (_, i) => 2020 + i);
  return (
    <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center">
      {years.map(y => (
        <button 
          key={y} 
          onClick={() => onSelect(y)}
          className={`py-2 rounded text-sm ${y === currentYear ? 'bg-blue-100 text-blue-600 border border-blue-300' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

function MonthSelector({ currentMonth, onSelect }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center">
      {months.map((m, idx) => (
        <button 
          key={m} 
          onClick={() => onSelect(idx)}
          className={`py-2 rounded text-sm ${idx === currentMonth ? 'bg-blue-50 text-blue-500 border border-blue-400' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function DaySelector({ currentMonth, currentYear, currentDate, onSelect, onConfirm, tradingDays }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  
  const dates = Array.from({length: daysInMonth}, (_, i) => i + 1);
  const blanks = Array.from({length: firstDay}, (_, i) => i);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {days.map(d => <div key={d} className="text-xs text-slate-800">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-4">
        {blanks.map(b => <div key={`blank-${b}`} />)}
        {dates.map(d => {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          let isValid = true;
          
          if (tradingDays && tradingDays.length > 0) {
            isValid = tradingDays.includes(dateStr);
          } else {
            const isWeekend = new Date(currentYear, currentMonth, d).getDay() === 0 || new Date(currentYear, currentMonth, d).getDay() === 6;
            isValid = !isWeekend;
          }

          return (
            <button 
              key={d} 
              onClick={() => { if (isValid) onSelect(d); }}
              className={`w-8 h-8 mx-auto rounded flex items-center justify-center text-sm ${d === currentDate ? 'bg-blue-50 text-blue-600 border border-blue-400 font-medium' : !isValid ? 'text-slate-300 cursor-not-allowed bg-transparent' : 'text-slate-600 hover:bg-slate-100'}`}
              disabled={!isValid}
            >
              {d}
            </button>
          );
        })}
      </div>
      <button 
        className="w-full bg-[#0082f4] hover:bg-blue-600 text-white rounded py-2 text-sm font-medium"
        onClick={onConfirm}
      >
        Confirm
      </button>
    </div>
  );
}
