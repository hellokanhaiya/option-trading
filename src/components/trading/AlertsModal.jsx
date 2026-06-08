import React, { useState, useEffect } from "react";

export function AlertsModal({
  positions,
  setPositions,
  globalAlerts,
  setGlobalAlerts,
  onClose,
  currentSpot,
  totalMTM,
  totalDelta,
  optionChainData,
}) {
  // Local state for edits so we can cancel if needed
  const [localPositions, setLocalPositions] = useState(JSON.parse(JSON.stringify(positions)));
  const [localGlobal, setLocalGlobal] = useState(globalAlerts || {});

  const handlePositionTargetChange = (idx, val) => {
    const updated = [...localPositions];
    if (val === "" || val === null) {
      delete updated[idx].data.target;
    } else {
      updated[idx].data.target = parseFloat(val);
    }
    setLocalPositions(updated);
  };

  const handlePositionStopLossChange = (idx, val) => {
    const updated = [...localPositions];
    if (val === "" || val === null) {
      delete updated[idx].data.stopLoss;
    } else {
      updated[idx].data.stopLoss = parseFloat(val);
    }
    setLocalPositions(updated);
  };

  const handleGlobalAlertToggle = (key) => {
    setLocalGlobal(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGlobalAlertValueChange = (key, val) => {
    setLocalGlobal(prev => ({ ...prev, [`${key}Value`]: val === "" ? null : parseFloat(val) }));
  };

  const handleClearAll = () => {
    const clearedPositions = localPositions.map(p => {
      const p2 = { ...p, data: { ...p.data } };
      delete p2.data.target;
      delete p2.data.stopLoss;
      return p2;
    });
    setLocalPositions(clearedPositions);
    setLocalGlobal({});
  };

  const handleDone = () => {
    setPositions(localPositions);
    setGlobalAlerts(localGlobal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Add Alerts</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex justify-between px-6 py-3 border-b border-slate-100 text-sm font-medium text-slate-500">
          <div>MTM <span className="text-slate-800">{totalMTM?.toFixed(2) || "0.00"}</span></div>
          <div>Underlying <span className="text-slate-800">{currentSpot?.toFixed(2) || "0.00"}</span></div>
          <div>Delta <span className="text-slate-800">{totalDelta?.toFixed(2) || "0.00"}</span></div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-8">
          
          {/* Position Alerts */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              Position Alerts
            </h3>
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] text-xs font-normal text-slate-500 mb-3 gap-4">
              <div>Identifier</div>
              <div>LTP</div>
              <div>Target (Price in ₹)</div>
              <div>Stop Loss (Price in ₹)</div>
            </div>
            
            <div className="flex flex-col gap-3">
              {localPositions.map((pos, idx) => {
                const p = pos.data;
                const isBuy = p.Position === 1;
                const isCall = p.InstrumentType === 1 || p.type === 'CE';
                const isFut = p.InstrumentType === 'FUT' || p.InstrumentType === 0;
                
                let identifier = "";
                if (p.Expiry) {
                  const expDate = new Date(p.Expiry);
                  const expDay = expDate.getDate().toString().padStart(2, "0");
                  const expMonth = expDate.toLocaleString("default", { month: "short" });
                  const optType = isFut ? "FUT" : (isCall ? "CE" : "PE");
                  identifier = isFut ? `${expDay} ${expMonth} FUT` : `${expDay} ${expMonth} ${p.Strike} ${optType}`;
                }

                let ltp = parseFloat(p.TradedPrice || 0);
                if (optionChainData) {
                  if (isFut) {
                    const futPriceObj = optionChainData.futures?.[p.Expiry]?.close || optionChainData.implied_futures?.[p.Expiry];
                    if (futPriceObj) ltp = parseFloat(futPriceObj);
                  } else if (optionChainData.options?.[p.Expiry]) {
                    const expiryData = optionChainData.options[p.Expiry];
                    const strikeIdx = expiryData.strike?.indexOf(p.Strike);
                    if (strikeIdx !== -1) {
                      const closePrice = isCall ? expiryData.call_close?.[strikeIdx] : expiryData.put_close?.[strikeIdx];
                      if (closePrice !== undefined && closePrice !== null) ltp = parseFloat(closePrice);
                    }
                  }
                }

                return (
                  <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center text-xs gap-4">
                    <div className="flex items-center gap-2 text-slate-700 font-normal">
                      <div className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${isBuy ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isBuy ? 'B' : 'S'}
                      </div>
                      <span className="truncate">{identifier} x {parseInt(p.Quantity || 0, 10)}</span>
                    </div>
                    <div className="text-slate-600">{ltp.toFixed(2)}</div>
                    <div>
                      <input 
                        type="number" 
                        placeholder="Enter Value"
                        value={p.target || ""}
                        onChange={(e) => handlePositionTargetChange(idx, e.target.value)}
                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-slate-700 placeholder:text-slate-300" 
                      />
                    </div>
                    <div>
                      <input 
                        type="number" 
                        placeholder="Enter Value"
                        value={p.stopLoss || ""}
                        onChange={(e) => handlePositionStopLossChange(idx, e.target.value)}
                        className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-slate-700 placeholder:text-slate-300" 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Alerts */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              Overall Alerts
            </h3>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {/* Overall Target */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-normal text-slate-700">Overall Target</span>
                  <button 
                    onClick={() => handleGlobalAlertToggle('targetEnabled')}
                    className={`w-8 h-4 rounded-full relative transition-colors ${localGlobal.targetEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${localGlobal.targetEnabled ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className={`flex rounded border overflow-hidden transition-colors ${localGlobal.targetEnabled ? 'border-slate-200 focus-within:border-blue-500' : 'border-slate-100 bg-slate-50'}`}>
                  <div className={`flex items-center px-3 border-r text-sm font-medium ${localGlobal.targetEnabled ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-100 text-slate-300'}`}>MTM</div>
                  <input 
                    type="number"
                    disabled={!localGlobal.targetEnabled}
                    value={localGlobal.targetValue || ""}
                    onChange={(e) => handleGlobalAlertValueChange('target', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm focus:outline-none text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Alert when Underlying is */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-normal text-slate-700">Alert when Underlying is</span>
                  <button 
                    onClick={() => handleGlobalAlertToggle('underlyingEnabled')}
                    className={`w-8 h-4 rounded-full relative transition-colors ${localGlobal.underlyingEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${localGlobal.underlyingEnabled ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className={`flex rounded border overflow-hidden transition-colors ${localGlobal.underlyingEnabled ? 'border-slate-200 focus-within:border-blue-500' : 'border-slate-100 bg-slate-50'}`}>
                  <select 
                    disabled={!localGlobal.underlyingEnabled}
                    value={localGlobal.underlyingType || "LessThan"}
                    onChange={(e) => setLocalGlobal(prev => ({...prev, underlyingType: e.target.value}))}
                    className="border-r border-slate-200 px-3 py-1.5 text-sm focus:outline-none text-slate-500 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 appearance-none bg-transparent pr-8"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                  >
                    <option value="LessThan">Less Than</option>
                    <option value="GreaterThan">Greater Than</option>
                  </select>
                  <input 
                    type="number"
                    disabled={!localGlobal.underlyingEnabled}
                    value={localGlobal.underlyingValue || ""}
                    onChange={(e) => handleGlobalAlertValueChange('underlying', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm focus:outline-none text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Overall Stop Loss */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-normal text-slate-700">Overall Stop Loss</span>
                  <button 
                    onClick={() => handleGlobalAlertToggle('stopLossEnabled')}
                    className={`w-8 h-4 rounded-full relative transition-colors ${localGlobal.stopLossEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${localGlobal.stopLossEnabled ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className={`flex rounded border overflow-hidden transition-colors ${localGlobal.stopLossEnabled ? 'border-slate-200 focus-within:border-blue-500' : 'border-slate-100 bg-slate-50'}`}>
                  <div className={`flex items-center px-3 border-r text-sm font-medium ${localGlobal.stopLossEnabled ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-100 text-slate-300'}`}>MTM</div>
                  <input 
                    type="number"
                    disabled={!localGlobal.stopLossEnabled}
                    value={localGlobal.stopLossValue || ""}
                    onChange={(e) => handleGlobalAlertValueChange('stopLoss', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm focus:outline-none text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Alert when Delta is */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-normal text-slate-700">Alert when Delta is</span>
                  <button 
                    onClick={() => handleGlobalAlertToggle('deltaEnabled')}
                    className={`w-8 h-4 rounded-full relative transition-colors ${localGlobal.deltaEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${localGlobal.deltaEnabled ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className={`flex rounded border overflow-hidden transition-colors mb-1 ${localGlobal.deltaEnabled ? 'border-slate-200 focus-within:border-blue-500' : 'border-slate-100 bg-slate-50'}`}>
                  <select 
                    disabled={!localGlobal.deltaEnabled}
                    value={localGlobal.deltaType || "LessThan"}
                    onChange={(e) => setLocalGlobal(prev => ({...prev, deltaType: e.target.value}))}
                    className="border-r border-slate-200 px-3 py-1.5 text-sm focus:outline-none text-slate-500 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 appearance-none bg-transparent pr-8"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                  >
                    <option value="LessThan">Less Than</option>
                    <option value="GreaterThan">Greater Than</option>
                  </select>
                  <input 
                    type="number"
                    disabled={!localGlobal.deltaEnabled}
                    value={localGlobal.deltaValue || ""}
                    onChange={(e) => handleGlobalAlertValueChange('delta', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm focus:outline-none text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div className="text-xs text-slate-500">
                  Delta in ₹ is {localGlobal.deltaType === 'GreaterThan' ? 'Greater Than' : 'Less Than'} {((localGlobal.deltaValue || 0) * (currentSpot || 0)).toFixed(3)}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-4 border-t border-slate-200">
          <button onClick={handleClearAll} className="text-red-600 text-sm font-medium hover:underline">
            Clear all alerts
          </button>
          <div className="flex gap-4">
            <button onClick={onClose} className="text-blue-600 font-medium text-sm hover:underline">
              Cancel
            </button>
            <button onClick={handleDone} className="bg-[#1e619b] hover:bg-blue-800 text-white px-8 py-2 rounded font-medium text-sm">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
