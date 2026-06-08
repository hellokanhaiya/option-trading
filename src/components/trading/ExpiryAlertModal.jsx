import React, { useState } from 'react';
import { X } from 'lucide-react';

export function ExpiryAlertModal({ expiringPositions, onJumpBack, onAutoExpire, onClose, optionChainData }) {
  if (!expiringPositions || expiringPositions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[450px] max-w-[90vw] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">Expiry alert</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-2">
          <p className="text-sm text-slate-600 mb-4">Some of your positions are expiring</p>
          
          <div className="flex justify-between items-center text-xs font-medium text-slate-400 border-b border-slate-100 pb-2 mb-2 px-1">
            <span>Position</span>
            <span>Exit Price</span>
          </div>

          <div className="max-h-[200px] overflow-y-auto no-scrollbar space-y-3 px-1 pb-4">
            {expiringPositions.map((pos, idx) => {
              const p = pos.data || pos;
              const isCall = p.InstrumentType === 1 || p.type === 'CE';
              const typeLabel = isCall ? "CE" : "PE";
              const dateObj = new Date(p.Expiry);
              const dateStr = `${String(dateObj.getDate()).padStart(2, '0')} ${dateObj.toLocaleString('en-US', { month: 'short' })}`;
              
              const posName = `${dateStr} ${p.Strike} ${typeLabel} x${Math.abs(p.Quantity)}`;
              
              // Get LTP if available
              let ltp = p.TradedPrice || 0;
              if (optionChainData && optionChainData.options && optionChainData.options[p.Expiry]) {
                const strikeData = optionChainData.options[p.Expiry].strike.indexOf(p.Strike);
                if (strikeData !== -1) {
                   ltp = isCall ? optionChainData.options[p.Expiry].call_close[strikeData] : optionChainData.options[p.Expiry].put_close[strikeData];
                }
              }

              return (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-slate-700">{posName}</span>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                    <button className="text-slate-400 hover:text-slate-600 w-4 h-4 flex items-center justify-center cursor-not-allowed opacity-50">-</button>
                    <span className="font-medium text-slate-800 w-12 text-center">{ltp?.toFixed(1) || "0.0"}</span>
                    <button className="text-slate-400 hover:text-slate-600 w-4 h-4 flex items-center justify-center cursor-not-allowed opacity-50">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 bg-white flex flex-col gap-4">
          <div className="flex justify-between items-center gap-4">
            <button 
              onClick={onJumpBack}
              className="flex-1 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded"
            >
              Jump Back to Expiry
            </button>
            <button 
              onClick={onAutoExpire}
              className="flex-1 py-2 text-sm font-medium text-white bg-[#0082f4] hover:bg-blue-600 rounded shadow-sm"
            >
              Auto Expire
            </button>
          </div>
          
          <div className="flex gap-2 items-center text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-md border border-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p>Auto expire will square off positions at expiry LTP</p>
          </div>
        </div>
      </div>
    </div>
  );
}
