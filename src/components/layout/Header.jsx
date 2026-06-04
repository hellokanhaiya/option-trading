import React from 'react';
import { ChevronDown, HelpCircle, Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[#2a2b2d] text-white text-sm h-12">
      {/* Logo Area */}
      <div className="flex items-center gap-2">
        <div className="bg-blue-500 rounded-full p-1">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">AlgoTest</span>
      </div>

      {/* Main Nav */}
      <nav className="hidden md:flex items-center gap-6">
        <NavItem text="Backtest" hasDropdown />
        <NavItem text="Algo Trade" hasDropdown />
        <NavItem text="Signals" hasDropdown />
        <NavItem text="Marketplace" hasDropdown />
        <NavItem text="ClickTrade" hasDropdown />
        <NavItem text="Webinars" hasDropdown />
      </nav>

      {/* Right User Nav */}
      <div className="flex items-center gap-4">
        <a href="#" className="hover:text-blue-400 transition-colors">Pricing</a>
        <a href="#" className="hover:text-blue-400 transition-colors">Broker Setup</a>
        
        <div className="flex items-center gap-2 border border-slate-600 rounded-full py-1 px-3 bg-[#1e1f21]">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            KA
          </div>
          <span className="text-xs text-slate-300">Credits:0</span>
        </div>
      </div>
    </header>
  );
}

function NavItem({ text, hasDropdown }) {
  return (
    <a href="#" className="flex items-center gap-1 hover:text-blue-400 transition-colors">
      {text}
      {hasDropdown && <ChevronDown className="w-4 h-4 text-slate-400" />}
    </a>
  );
}
