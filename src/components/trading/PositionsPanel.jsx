import React from "react";
import { Plus } from "lucide-react";

export function PositionsPanel({
  positions,
  setPositions,
  selectedAsset,
  currentTimestamp,
  optionChainData,
  selectedExpiry,
  currentLotSize,
  onSwitchToOptionChain
}) {

  const handleStrategyClick = (strategyName) => {
    if (!optionChainData || !optionChainData.options || !selectedExpiry) return;
    const expData = optionChainData.options[selectedExpiry];
    if (!expData || !expData.strike || expData.strike.length === 0) return;
    
    const strikes = expData.strike;
    const currentSpot = optionChainData.cash?.close || 0;
    if (currentSpot === 0) return;

    // Find ATM strike
    let atmStrike = strikes[0];
    let minDiff = Math.abs(currentSpot - atmStrike);
    let atmIdx = 0;
    for (let i = 1; i < strikes.length; i++) {
      const diff = Math.abs(currentSpot - strikes[i]);
      if (diff < minDiff) {
        minDiff = diff;
        atmStrike = strikes[i];
        atmIdx = i;
      }
    }

    const findStrikeIdx = (target) => {
      let closestIdx = 0;
      let mDiff = Math.abs(target - strikes[0]);
      for (let i = 1; i < strikes.length; i++) {
        const diff = Math.abs(target - strikes[i]);
        if (diff < mDiff) {
          mDiff = diff;
          closestIdx = i;
        }
      }
      return closestIdx;
    };

    const getOpt = (idx, type) => {
      const strike = strikes[idx];
      const ltp = type === "CE" ? expData.call_close?.[idx] : expData.put_close?.[idx];
      const iv = type === "CE" ? expData.call_iv?.[idx] : expData.put_iv?.[idx];
      return { strike, ltp, iv };
    };

    const createPos = (type, side, optData) => {
      const tsString = currentTimestamp.toISOString().split(".")[0];
      const entrySpot = currentSpot;
      return {
        type: "ADD",
        data: {
          _id: Math.random().toString(36).substr(2, 9),
          Position: side === "B" ? 1 : -1,
          TradedPrice: parseFloat(optData.ltp) || 0,
          InstrumentType: type === "CE" ? 1 : -1,
          Quantity: currentLotSize,
          Strike: optData.strike,
          Expiry: selectedExpiry,
          Ticker: selectedAsset.underlying,
          TradedTime: tsString,
          entrySpot: entrySpot,
          iv: parseFloat(optData.iv) || 15,
        },
        time: tsString,
      };
    };

    const newPositions = [];
    const atmCE = getOpt(atmIdx, "CE");
    const atmPE = getOpt(atmIdx, "PE");
    const otmCE200 = getOpt(findStrikeIdx(atmStrike + 200), "CE");
    const otmPE200 = getOpt(findStrikeIdx(atmStrike - 200), "PE");
    const otmCE400 = getOpt(findStrikeIdx(atmStrike + 400), "CE");
    const otmPE400 = getOpt(findStrikeIdx(atmStrike - 400), "PE");

    if (strategyName === "Straddle") {
      newPositions.push(createPos("CE", "S", atmCE));
      newPositions.push(createPos("PE", "S", atmPE));
    } else if (strategyName === "Strangle") {
      newPositions.push(createPos("CE", "S", otmCE200));
      newPositions.push(createPos("PE", "S", otmPE200));
    } else if (strategyName === "Bull Call Spread") {
      newPositions.push(createPos("CE", "B", atmCE));
      newPositions.push(createPos("CE", "S", otmCE200));
    } else if (strategyName === "Bear Put Spread") {
      newPositions.push(createPos("PE", "B", atmPE));
      newPositions.push(createPos("PE", "S", otmPE200));
    } else if (strategyName === "Iron Fly") {
      newPositions.push(createPos("CE", "S", atmCE));
      newPositions.push(createPos("PE", "S", atmPE));
      newPositions.push(createPos("CE", "B", otmCE200));
      newPositions.push(createPos("PE", "B", otmPE200));
    } else if (strategyName === "Iron Condor") {
      newPositions.push(createPos("CE", "S", otmCE200));
      newPositions.push(createPos("PE", "S", otmPE200));
      newPositions.push(createPos("CE", "B", otmCE400));
      newPositions.push(createPos("PE", "B", otmPE400));
    }

    if (newPositions.length > 0) {
      setPositions((prev) => [...(prev || []), ...newPositions]);
    }
  };

  if (!positions || positions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center pt-10 text-slate-600 bg-white overflow-y-auto">
        <h3 className="text-lg font-medium text-slate-800 mb-1">No Position Found</h3>
        <p className="text-sm text-slate-500 mb-6">Select trades from Option Chain or use a Prebuilt strategy</p>
        
        <div className="flex flex-col flex-1 w-full px-6 max-w-2xl">
          <p className="text-xs font-semibold text-slate-500 mb-3 text-left w-full uppercase tracking-wider">Prebuilt Strategies</p>
          <div className="grid grid-cols-4 gap-3 w-full">
            {[
              { name: "Straddle", img: "https://algotest.in/charts/straddle.svg" },
              { name: "Strangle", img: "https://algotest.in/charts/strangle.svg" },
              { name: "Bull Call Spread", img: "https://algotest.in/charts/bullcallspread.svg" },
              { name: "Bear Put Spread", img: "https://algotest.in/charts/bearputspread.svg" },
              { name: "Iron Fly", img: "https://algotest.in/charts/ironfly.svg" },
              { name: "Iron Condor", img: "https://algotest.in/charts/ironcondor.svg" },
            ].map((strategy) => (
              <button
                key={strategy.name}
                onClick={() => handleStrategyClick(strategy.name)}
                className="flex flex-col items-start justify-center border border-slate-200 rounded-md p-3 hover:border-blue-400 hover:shadow-sm bg-white gap-2"
              >
                <img src={strategy.img} alt={strategy.name} className="h-8 object-contain" />
                <span className="text-xs text-slate-600 font-medium">{strategy.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-4 mt-auto w-full pb-6 pt-10">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Import from Strategy Builder
            </button>
            <button 
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50"
              onClick={onSwitchToOptionChain}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Build using Option Chain
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate rows and MTM
  const rows = positions.map((pos) => {
    const p = pos.data || pos;
    const isBuy = p.Position === 1;
    const qty = parseInt(p.Quantity || 0, 10);
    const entryPrice = parseFloat(p.TradedPrice || 0);
    const strike = p.Strike;
    const isCall = p.InstrumentType === 1 || p.type === 'CE';
    const isFut = p.InstrumentType === 'FUT' || p.InstrumentType === 0;
    
    let ltp = entryPrice;

    // Compute LTP from optionChainData if available
    if (optionChainData) {
      if (isFut) {
        const futPriceObj = optionChainData.futures?.[p.Expiry]?.close || optionChainData.implied_futures?.[p.Expiry];
        if (futPriceObj) ltp = parseFloat(futPriceObj);
      } else if (optionChainData.options?.[p.Expiry]) {
        const expiryData = optionChainData.options[p.Expiry];
        const strikeIdx = expiryData.strike?.indexOf(strike);
        if (strikeIdx !== -1) {
          const closePrice = isCall ? expiryData.call_close?.[strikeIdx] : expiryData.put_close?.[strikeIdx];
          if (closePrice !== undefined && closePrice !== null) ltp = parseFloat(closePrice);
        }
      }
    }

    const mtm = isBuy ? (ltp - entryPrice) * qty : (entryPrice - ltp) * qty;

    // Format Date
    let identifier = "";
    if (p.Expiry) {
      const expDate = new Date(p.Expiry);
      const expDay = expDate.getDate().toString().padStart(2, "0");
      const expMonth = expDate.toLocaleString("default", { month: "short" });
      const optType = isFut ? "FUT" : (isCall ? "CE" : "PE");
      identifier = isFut ? `${expDay} ${expMonth} FUT` : `${expDay} ${expMonth} ${strike} ${optType}`;
    }

    return {
      p,
      isBuy,
      qty,
      entryPrice,
      ltp,
      mtm,
      identifier
    };
  });

  const totalMTM = rows.reduce((acc, row) => acc + row.mtm, 0);
  
  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="grid grid-cols-5 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
        <div className="col-span-2">Identifier</div>
        <div className="text-right">Entry</div>
        <div className="text-right">LTP</div>
        <div className="text-right">MTM</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rows.map((row, idx) => (
          <div key={idx} className="flex flex-col border-b border-slate-100 hover:bg-slate-50">
            <div className="grid grid-cols-5 px-4 py-3 text-xs items-center">
              <div className="col-span-2 flex items-center gap-2 font-medium text-slate-700">
                <div className={`w-8 h-4 rounded-[3px] flex items-center justify-center text-[9px] text-white font-bold ${row.isBuy ? 'bg-green-500' : 'bg-red-500'}`}>
                  {row.isBuy ? 'B' : 'S'}
                </div>
                {row.identifier} x {row.qty}
              </div>
              <div className="text-right text-slate-600">{row.entryPrice.toFixed(2)}</div>
              <div className="text-right text-slate-600">{row.ltp.toFixed(2)}</div>
              <div className={`text-right font-semibold ${row.mtm >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {row.mtm >= 0 ? `+${row.mtm.toFixed(2)}` : row.mtm.toFixed(2)}
              </div>
            </div>
            
            {(row.p.target || row.p.stopLoss) && (
              <div className="px-4 pb-2 flex gap-12 text-[11px] text-slate-600 pl-14">
                {row.p.target && <span>Target {row.p.target}</span>}
                {row.p.stopLoss && <span>Stop Loss {row.p.stopLoss}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-slate-200">
        <div className="px-4 py-2 flex justify-between items-center text-[10px] text-blue-500 border-b border-slate-100 hover:bg-blue-50 cursor-pointer">
          <span>Overall Target, Stop Loss, Delta & Underlying Alerts</span>
          <span>Add / Edit</span>
        </div>
        <div className="grid grid-cols-2 px-4 py-3 bg-slate-50 text-xs font-semibold">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between w-1/2">
              <span className="text-slate-500">Realised</span>
              <span className="text-slate-700">0.00</span>
            </div>
            <div className="flex justify-between w-1/2">
              <span className="text-slate-500">Unrealised</span>
              <span className={totalMTM >= 0 ? "text-green-500" : "text-red-500"}>{totalMTM.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-end justify-end">
            <span className="text-slate-500 mr-2">Total</span>
            <span className={totalMTM >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
              {totalMTM.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
