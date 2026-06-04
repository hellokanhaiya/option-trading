import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { AssetSelector } from "./AssetSelector";
import { getDayContracts, getOptionChain } from "../../utils/simulatorUtils";

function formatDateForPill(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date
    .toLocaleString("default", { month: "short" })
    .toUpperCase();
  return `${day} ${month}`;
}

function getDaysToExpiry(dateStr, currentTimestamp) {
  if (!dateStr) return "";
  const expiry = new Date(dateStr);
  const diffTime = Math.abs(expiry - currentTimestamp);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays}d`;
}

export function OptionChainPanel({
  currentTimestamp = new Date("2026-06-01T09:16:00"),
  selectedAsset,
  setSelectedAsset,
}) {
  const [expiries, setExpiries] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState(null);

  const [optionChainData, setOptionChainData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derive date bounds from currentTimestamp using local time
  const year = currentTimestamp.getFullYear();
  const month = String(currentTimestamp.getMonth() + 1).padStart(2, '0');
  const day = String(currentTimestamp.getDate()).padStart(2, '0');
  const hours = String(currentTimestamp.getHours()).padStart(2, '0');
  const minutes = String(currentTimestamp.getMinutes()).padStart(2, '0');
  
  const dateStr = `${year}-${month}-${day}`;
  const startTs = `${dateStr}T09:16`;
  const endTs = `${dateStr}T15:30`;
  const candleTs = `${dateStr}T${hours}:${minutes}`;

  // 1. Fetch available expiries when asset or day changes
  useEffect(() => {
    if (!selectedAsset) return;

    async function fetchExpiries() {
      try {
        const data = await getDayContracts(
          selectedAsset.underlying,
          startTs,
          endTs,
        );
        if (data && data.strikes && Object.keys(data.strikes).length > 0) {
          const dates = Object.keys(data.strikes).sort(
            (a, b) => new Date(a) - new Date(b),
          );

          setExpiries(dates);

          // Select the nearest expiry if the current selection is invalid
          if (dates.length > 0 && !dates.includes(selectedExpiry)) {
            setSelectedExpiry(dates[0]);
          }
        } else {
          setExpiries([]);
          setSelectedExpiry(null);
        }
      } catch (err) {
        console.error("Failed to fetch day contracts", err);
        setExpiries([]);
      }
    }
    fetchExpiries();
  }, [selectedAsset, dateStr]);

  // 2. Fetch the actual option chain data when asset, expiry or EXACT time changes
  useEffect(() => {
    if (!selectedAsset || !selectedExpiry) return;

    async function loadOptionChain() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOptionChain(selectedAsset.underlying, candleTs);
        setOptionChainData(data);
      } catch (err) {
        console.error("Failed to fetch option chain", err);
        setError("Failed to load option chain data");
      } finally {
        setIsLoading(false);
      }
    }
    loadOptionChain();
  }, [selectedAsset, selectedExpiry, candleTs]);

  // Transform data for the selected expiry
  let tableRows = [];
  let currentFuturesPrice = null;

  if (
    optionChainData &&
    selectedExpiry &&
    optionChainData.options &&
    optionChainData.options[selectedExpiry]
  ) {
    const expiryData = optionChainData.options[selectedExpiry];
    const strikes = expiryData.strike || [];

    // Futures
    if (
      optionChainData.implied_futures &&
      optionChainData.implied_futures[selectedExpiry]
    ) {
      currentFuturesPrice = optionChainData.implied_futures[selectedExpiry];
    } else if (
      optionChainData.futures &&
      optionChainData.futures[selectedExpiry]
    ) {
      currentFuturesPrice = optionChainData.futures[selectedExpiry].close;
    }

    tableRows = strikes.map((strike, index) => {
      const isCallITM = currentFuturesPrice && strike < currentFuturesPrice;
      const isPutITM = currentFuturesPrice && strike > currentFuturesPrice;

      return {
        strike,
        callLtp:
          expiryData.call_close?.[index] !== null
            ? expiryData.call_close[index].toFixed(2)
            : "--",
        callDelta:
          expiryData.call_delta?.[index] !== null
            ? expiryData.call_delta[index].toFixed(2)
            : "--",
        putLtp:
          expiryData.put_close?.[index] !== null
            ? expiryData.put_close[index].toFixed(2)
            : "--",
        putDelta:
          expiryData.put_delta?.[index] !== null
            ? expiryData.put_delta[index].toFixed(2)
            : "--",
        iv:
          expiryData.call_implied_vol?.[index] !== null
            ? (expiryData.call_implied_vol[index] * 100).toFixed(1)
            : "--",
        // Optional: highlight ATM row based on implied futures
        highlight:
          currentFuturesPrice && Math.abs(strike - currentFuturesPrice) < 25,
        isCallITM,
        isPutITM,
      };
    });
  }

  // Formatting for UI
  const cashClose = optionChainData?.cash?.close?.toFixed(2) || "0.00";
  const displayFutures = currentFuturesPrice
    ? currentFuturesPrice.toFixed(2)
    : "--";

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 pt-2">
        <button className="px-6 py-2 border-b-2 border-blue-500 text-blue-600 font-medium text-sm">
          Option Chain
        </button>
        <button className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">
          Positions
        </button>
        <div className="ml-auto px-4 flex items-center gap-1 text-slate-400 text-sm">
          <AlertTriangle className="w-4 h-4" /> Add/Edit Alerts
        </div>
      </div>

      {/* Selectors Area */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex gap-8">
          <div>
            <AssetSelector
              selectedAsset={selectedAsset}
              onAssetSelect={setSelectedAsset}
            />
            <div className="text-sm font-bold mt-1">
              {cashClose}{" "}
              <span className="text-slate-400 text-xs font-medium ml-1">
                (Spot)
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-sm font-medium text-slate-700 cursor-pointer">
              FUT ({selectedExpiry ? formatDateForPill(selectedExpiry) : "--"}){" "}
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-bold mt-1">{displayFutures}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50">
            <Plus className="w-4 h-4" />
          </button>
          <button className="px-4 h-8 text-slate-400 text-sm rounded border border-transparent hover:bg-slate-50">
            Clear
          </button>
        </div>
      </div>

      {/* Expiry Tabs */}
      <div className="flex items-center px-2 py-3 border-b border-slate-100 gap-2">
        <button className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {expiries.length === 0 ? (
            <span className="text-xs text-slate-400 px-2 py-1">
              No expiries available
            </span>
          ) : (
            expiries.map((date) => (
              <ExpiryPill
                key={date}
                text={formatDateForPill(date)}
                days={getDaysToExpiry(date, currentTimestamp)}
                active={selectedExpiry === date}
                onClick={() => setSelectedExpiry(date)}
              />
            ))
          )}
        </div>
        <button className="text-slate-400 hover:text-slate-600">
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="ml-auto flex items-center gap-2 px-2 shrink-0">
          <div className="w-8 h-4 bg-slate-300 rounded-full relative">
            <div className="w-3 h-3 bg-white rounded-full absolute left-0.5 top-0.5"></div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            View positions
          </span>
          <Settings className="w-4 h-4 text-slate-500 ml-1 cursor-pointer" />
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr] px-2 py-1.5 text-[11px] font-medium text-slate-500 border-b border-slate-100">
        <div className="text-left">Delta</div>
        <div className="text-center">Call LTP</div>
        <div className="text-center">Lots</div>
        <div className="text-center">Strike</div>
        <div className="text-center">IV</div>
        <div className="text-center">Lots</div>
        <div className="text-center">Put LTP</div>
        <div className="text-right">Delta</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {tableRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No option chain data available for this expiry.
          </div>
        ) : (
          tableRows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr] text-[11px] items-stretch border-b border-slate-100 hover:opacity-90"
            >
              <div
                className={`flex items-center text-slate-500 font-bold px-2 py-1.5 ${row.isCallITM ? "bg-[#fef9e7]" : "bg-white"}`}
              >
                {row.callDelta}
              </div>
              <div
                className={`flex items-center justify-center font-bold text-slate-800 px-2 py-1.5 ${row.isCallITM ? "bg-[#fef9e7]" : "bg-white"}`}
              >
                {row.callLtp === "--" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600/70" />
                ) : (
                  row.callLtp
                )}
              </div>
              <div
                className={`flex items-center justify-center px-2 py-1.5 ${row.isCallITM ? "bg-[#fef9e7]" : "bg-white"}`}
              ></div>

              <div className="flex items-center justify-center relative bg-white py-1">
                <span
                  className="text-[12px] font-semibold text-[#808080] bg-slate-100 px-2 py-0.5 rounded"
                  style={{ fontVariationSettings: "normal" }}
                >
                  {row.strike}
                </span>
                {row.highlight && (
                  <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2 whitespace-nowrap bg-white border border-blue-500 text-blue-600 text-[10px] px-2 py-0.5 rounded z-10 shadow-sm cursor-pointer hover:bg-blue-50">
                    Go to ATM
                  </div>
                )}
              </div>

              <div
                className={`flex items-center justify-center text-slate-500 px-2 py-1.5 ${row.isPutITM ? "bg-[#fef9e7]" : "bg-white"}`}
              >
                {row.iv}
              </div>
              <div
                className={`flex items-center justify-center px-2 py-1.5 ${row.isPutITM ? "bg-[#fef9e7]" : "bg-white"}`}
              ></div>
              <div
                className={`flex items-center font-bold  justify-center text-slate-800 px-2 py-1.5 ${row.isPutITM ? "bg-[#fef9e7]" : "bg-white"}`}
              >
                {row.putLtp === "--" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600/70" />
                ) : (
                  row.putLtp
                )}
              </div>
              <div
                className={`flex items-center justify-end text-slate-500 px-2 py-1.5 ${row.isPutITM ? "bg-[#fef9e7]" : "bg-white"}`}
              >
                {row.putDelta}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExpiryPill({ text, days, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium shrink-0 border transition-colors ${active ? "bg-white text-blue-600 border-blue-500 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
    >
      <span className={active ? "font-bold" : ""}>{text}</span>
      <span
        className={`${active ? "text-blue-500" : "text-slate-400"} opacity-80 font-normal`}
      >
        ({days})
      </span>
    </button>
  );
}
