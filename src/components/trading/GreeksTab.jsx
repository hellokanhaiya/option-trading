import React, { useState } from "react";
import { calcGreeks } from "../../utils/blackScholes";

export function GreeksTab({ positions, optionChainData }) {
  const [multiplyByLotSize, setMultiplyByLotSize] = useState(false);

  if (!positions || positions.length === 0) return null;

  const rows = positions.map((pos) => {
    const p = pos.data || pos;
    const isCall = p.InstrumentType === 1 || p.type === "CE";
    const isFut = p.InstrumentType === "FUT" || p.InstrumentType === 0;
    const isBuy = p.Position === 1;
    const qty = parseInt(p.Quantity || 0, 10);
    const sign = isBuy ? 1 : -1;
    const strike = p.Strike || 0;

    let iv = 15;
    let delta = 0;
    let gamma = 0;
    let theta = 0;
    let vega = 0;

    if (!isFut && optionChainData && p.Expiry) {
      const expData = optionChainData.options?.[p.Expiry];
      if (expData && expData.strike) {
        const index = expData.strike.indexOf(strike);
        if (index !== -1) {
          const callIv = expData.call_implied_vol?.[index];
          const putIv = expData.put_implied_vol?.[index];
          const ivRaw = isCall ? callIv : putIv;
          if (ivRaw != null && !isNaN(ivRaw)) {
            iv = ivRaw * 100;
          }

          // Use underlying spot for this expiry
          const spot = optionChainData.implied_futures?.[p.Expiry] || optionChainData.cash?.close || 0;
          if (spot > 0) {
            // Time to expiry in years
            const T = Math.max(0.001, (new Date(p.Expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24 * 365));
            const greeks = calcGreeks(spot, strike, T, 0.07, iv / 100, isCall);
            
            // Delta & Gamma are multiplied by lot size ONLY if toggle is ON.
            // But actually wait, the user's screenshot had Theta & Vega always multiplied by lot size (65), 
            // and Delta/Gamma only when toggle is ON.
            // Let's implement that behavior:
            
            // Per unit
            const unitDelta = greeks.delta;
            const unitGamma = greeks.gamma;
            const unitTheta = greeks.theta;
            const unitVega = greeks.vega;
            
            const lotMultiplier = multiplyByLotSize ? Math.abs(qty) : Math.abs(qty) / 65;
            
            // Theta/Vega are always total? Let's just follow the typical logic:
            // multiply by actual qty if toggle ON, else by lots.
            // If qty = 65, and lot size = 65, lots = 1.
            
            delta = unitDelta * sign * lotMultiplier;
            gamma = unitGamma * sign * lotMultiplier;
            
            // To match screenshot (Theta = 1185, Vega = -658 when toggle OFF for 1 lot)
            // It seems Theta/Vega are ALWAYS total for the entire qty
            theta = unitTheta * sign * Math.abs(qty);
            vega = unitVega * sign * Math.abs(qty);
          }
        }
      }
    } else if (isFut) {
       delta = sign * (multiplyByLotSize ? Math.abs(qty) : Math.abs(qty) / 65);
    }

    let identifier = "";
    if (p.Expiry) {
      const expDate = new Date(p.Expiry);
      const expDay = expDate.getDate().toString().padStart(2, "0");
      const expMonth = expDate.toLocaleString("default", { month: "short" });
      const optType = isFut ? "FUT" : isCall ? "CE" : "PE";
      identifier = isFut
        ? `${expDay} ${expMonth} FUT x ${Math.abs(qty) / 65}`
        : `${expDay} ${expMonth} ${strike} ${optType} x ${Math.abs(qty) / 65}`;
    }

    return {
      identifier,
      isBuy,
      ivVal: iv,
      deltaVal: delta,
      gammaVal: gamma,
      thetaVal: theta,
      vegaVal: vega,
      iv: isFut ? "--" : iv.toFixed(2),
      delta: delta.toFixed(2),
      gamma: gamma.toFixed(4),
      theta: Math.round(theta),
      vega: Math.round(vega),
    };
  });

  const totalDelta = rows.reduce((acc, r) => acc + r.deltaVal, 0);
  const totalGamma = rows.reduce((acc, r) => acc + r.gammaVal, 0);
  const totalTheta = rows.reduce((acc, r) => acc + r.thetaVal, 0);
  const totalVega = rows.reduce((acc, r) => acc + r.vegaVal, 0);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Greeks Header / Totals */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-6 py-3 border-b border-slate-200 text-xs text-slate-500 font-medium">
        <div>Identifier</div>
        <div className="text-right">IV</div>
        <div className="text-right">Delta</div>
        <div className="text-right">Gamma</div>
        <div className="text-right">Theta</div>
        <div className="text-right">Vega</div>
      </div>

      {/* Total Row */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-6 py-4 border-b border-slate-100 text-[13px] font-bold text-slate-800 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span>Total</span>
          <div 
            className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-200/50 rounded-full text-[10px] text-slate-500 font-medium cursor-pointer select-none"
            onClick={() => setMultiplyByLotSize(!multiplyByLotSize)}
          >
            <div className={`w-6 h-3 rounded-full relative transition-colors ${multiplyByLotSize ? "bg-blue-500" : "bg-slate-400"}`}>
              <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-transform ${multiplyByLotSize ? "translate-x-3 left-0.5" : "left-0.5"}`}></div>
            </div>
            Multiply by Lot Size
          </div>
        </div>
        <div className="text-right"></div>
        <div className="text-right">{totalDelta.toFixed(2)}</div>
        <div className="text-right">{totalGamma.toFixed(4)}</div>
        <div className="text-right">{Math.round(totalTheta)}</div>
        <div className="text-right">{Math.round(totalVega)}</div>
      </div>

      {/* Position Rows */}
      <div className="flex-1 overflow-y-auto">
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-6 py-4 border-b border-slate-100 text-[13px] hover:bg-slate-50 items-center text-slate-600"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  r.isBuy
                    ? "text-[#008537] bg-[#e6f3eb]"
                    : "text-[#b12020] bg-[#fbf3f3]"
                }`}
              >
                {r.isBuy ? "B" : "S"}
              </div>
              <span className="font-medium text-slate-700">{r.identifier}</span>
            </div>
            <div className="text-right">{r.iv}</div>
            <div className="text-right">{r.delta}</div>
            <div className="text-right">{r.gamma}</div>
            <div className="text-right">{r.theta}</div>
            <div className="text-right">{r.vega}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
