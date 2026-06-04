import React from 'react';
import { ChevronDown, HelpCircle, Layers } from 'lucide-react';

export function AnalysisPanel() {
  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 p-1">
          <button className="px-4 py-1 bg-blue-100 text-blue-600 rounded text-sm font-medium">Payoff</button>
          <button className="px-4 py-1 text-slate-500 hover:text-slate-700 text-sm font-medium">Greeks</button>
          <button className="px-4 py-1 text-slate-500 hover:text-slate-700 text-sm font-medium">Activity</button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-xs">
            <span className="text-slate-500 font-medium">INDIAVIX</span>
            <span className="font-bold ml-2">15.66</span>
            <span className="text-red-500 ml-2">-0.71 (-4.34%)</span>
          </div>
          <button className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 font-medium">
            <HelpCircle className="w-4 h-4" /> Help Center <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 mb-6 text-blue-500 flex items-center justify-center">
          {/* Custom icon matching the image */}
          <svg viewBox="0 0 100 100" className="w-full h-full fill-current" preserveAspectRatio="xMidYMid meet">
            <rect x="20" y="20" width="25" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
            <rect x="55" y="20" width="25" height="25" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
            <rect x="55" y="55" width="25" height="25" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Analysis shows Payoff Graph, Statistics and more...
        </h2>
        <p className="text-slate-500 max-w-sm">
          Select trades from Option Chain or use a <br/>
          Prebuilt strategy from Positions tab to see analysis
        </p>
      </div>
    </div>
  );
}
