import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { AssetSelector } from "./AssetSelector";
import { getDayContracts, getOptionChain, fetchLTP } from "../../utils/simulatorUtils";

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
  const diffTime = expiry.getTime() - currentTimestamp.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays > 0 ? diffDays : 0}d`;
}

function getDaysToExpiryFull(dateStr, currentTimestamp) {
  if (!dateStr) return "";
  const expiry = new Date(dateStr);
  const diffTime = expiry.getTime() - currentTimestamp.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays > 0 ? diffDays : 0} days`;
}

function formatFutureExpiry(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear().toString().substring(2);
  return `${day} ${month} ${year}`;
}

export function OptionChainPanel({
  currentTimestamp = new Date("2026-06-01T09:16:00"),
  selectedAsset,
  setSelectedAsset,
  onDataLoaded,
}) {
  const [expiries, setExpiries] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState(() => {
    return localStorage.getItem("selectedExpiry") || null;
  });

  useEffect(() => {
    if (selectedExpiry) {
      localStorage.setItem("selectedExpiry", selectedExpiry);
    }
  }, [selectedExpiry]);

  const [optionChainData, setOptionChainData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedFutureExpiry, setSelectedFutureExpiry] = useState(null);
  const [isFutureDropdownOpen, setIsFutureDropdownOpen] = useState(false);
  const futureDropdownRef = React.useRef(null);
  const scrollContainerRef = React.useRef(null);

  const tableContainerRef = React.useRef(null);
  const [isAtmInView, setIsAtmInView] = useState(true);
  const [atmNode, setAtmNode] = useState(null);

  useEffect(() => {
    if (!atmNode || !tableContainerRef.current) {
      // If there is no ATM node (e.g. no data), just assume it's in view so button hides
      setIsAtmInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtmInView(entry.isIntersecting);
      },
      {
        root: tableContainerRef.current,
        threshold: 0,
      },
    );
    observer.observe(atmNode);

    return () => observer.disconnect();
  }, [atmNode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        futureDropdownRef.current &&
        !futureDropdownRef.current.contains(event.target)
      ) {
        setIsFutureDropdownOpen(false);
      }
    };
    if (isFutureDropdownOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFutureDropdownOpen]);

  // Derive date bounds from currentTimestamp using local time
  const year = currentTimestamp.getFullYear();
  const month = String(currentTimestamp.getMonth() + 1).padStart(2, "0");
  const day = String(currentTimestamp.getDate()).padStart(2, "0");
  const hours = String(currentTimestamp.getHours()).padStart(2, "0");
  const minutes = String(currentTimestamp.getMinutes()).padStart(2, "0");

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
          if (dates.length > 0) {
            const savedExpiry = localStorage.getItem("selectedExpiry");
            if (savedExpiry && dates.includes(savedExpiry)) {
              setSelectedExpiry(savedExpiry);
            } else if (!dates.includes(selectedExpiry)) {
              setSelectedExpiry(dates[0]);
            }
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
        if (onDataLoaded) onDataLoaded(data);
      } catch (err) {
        console.error("Failed to fetch option chain", err);
        setError("Failed to load option chain data");
      } finally {
        setIsLoading(false);
      }
    }
    loadOptionChain();
  }, [selectedAsset, selectedExpiry, candleTs]);

  const handleFetchSpecificLTP = async (e, type, strike, index) => {
    e.stopPropagation();
    const icon = e.currentTarget.querySelector("svg");
    if (icon) icon.classList.add("animate-spin");

    const contractType = type === "call" ? "CE" : "PE";
    const res = await fetchLTP(
      candleTs,
      selectedAsset.underlying,
      selectedExpiry,
      strike,
      contractType
    );

    if (icon) icon.classList.remove("animate-spin");

    if (res && res.symbols && res.symbols.length > 0 && res.symbols[0].close !== undefined && res.symbols[0].close !== null) {
      setOptionChainData((prev) => {
        if (!prev) return prev;
        const newData = JSON.parse(JSON.stringify(prev)); // Deep clone
        if (newData?.options?.[selectedExpiry]) {
          const targetKey = type === "call" ? "call_close" : "put_close";
          const deltaKey = type === "call" ? "call_delta" : "put_delta";
          
          if (!newData.options[selectedExpiry][targetKey]) {
            newData.options[selectedExpiry][targetKey] = [];
          }
          newData.options[selectedExpiry][targetKey][index] = res.symbols[0].close;

          if (res.symbols[0].delta !== undefined && res.symbols[0].delta !== null) {
            if (!newData.options[selectedExpiry][deltaKey]) {
              newData.options[selectedExpiry][deltaKey] = [];
            }
            newData.options[selectedExpiry][deltaKey][index] = res.symbols[0].delta;
          }
        }
        return newData;
      });
    }
  };

  const futureExpiries = React.useMemo(() => {
    if (optionChainData?.futures)
      return Object.keys(optionChainData.futures).sort(
        (a, b) => new Date(a) - new Date(b),
      );
    if (optionChainData?.implied_futures)
      return Object.keys(optionChainData.implied_futures).sort(
        (a, b) => new Date(a) - new Date(b),
      );
    return [];
  }, [optionChainData]);

  useEffect(() => {
    if (
      futureExpiries.length > 0 &&
      (!selectedFutureExpiry || !futureExpiries.includes(selectedFutureExpiry))
    ) {
      setSelectedFutureExpiry(futureExpiries[0]);
    }
  }, [futureExpiries, selectedFutureExpiry]);

  // Transform data for the selected expiry
  let tableRows = [];
  let syntheticFuturesPrice = null;
  let topBarFuturesPrice = null;

  if (
    optionChainData &&
    selectedExpiry &&
    optionChainData.options &&
    optionChainData.options[selectedExpiry]
  ) {
    const expiryData = optionChainData.options[selectedExpiry];
    const strikes = expiryData.strike || [];

    // 1. Top Bar Futures Price (based on selectedFutureExpiry dropdown)
    if (selectedFutureExpiry) {
      if (optionChainData?.futures?.[selectedFutureExpiry]) {
        topBarFuturesPrice = optionChainData.futures[selectedFutureExpiry].close;
      } else if (optionChainData?.implied_futures?.[selectedFutureExpiry]) {
        topBarFuturesPrice = optionChainData.implied_futures[selectedFutureExpiry];
      }
    }

    // 2. Synthetic Futures Price (based on Option Chain selectedExpiry)
    if (optionChainData?.implied_futures?.[selectedExpiry]) {
      syntheticFuturesPrice = optionChainData.implied_futures[selectedExpiry];
    } else if (optionChainData?.cash?.close) {
      // Fallback to spot price if implied futures for this expiry is missing
      syntheticFuturesPrice = optionChainData.cash.close;
    }

    // Find precise ATM strike
    let atmStrike = null;
    if (syntheticFuturesPrice) {
      let minDiff = Infinity;
      strikes.forEach((s) => {
        const diff = Math.abs(s - syntheticFuturesPrice);
        if (diff < minDiff) {
          minDiff = diff;
          atmStrike = s;
        }
      });
    }

    tableRows = strikes.map((strike, index) => {
      const isCallITM = syntheticFuturesPrice && strike < syntheticFuturesPrice;
      const isPutITM = syntheticFuturesPrice && strike > syntheticFuturesPrice;

      const callIv = expiryData.call_implied_vol?.[index];
      const putIv = expiryData.put_implied_vol?.[index];

      let ivVal = null;
      if (isCallITM) {
        // Strike < Futures Price -> Put is OTM, use Put IV preferably
        ivVal = putIv !== null && putIv !== undefined ? putIv : callIv;
      } else {
        // Strike >= Futures Price -> Call is OTM, use Call IV preferably
        ivVal = callIv !== null && callIv !== undefined ? callIv : putIv;
      }

      const callCloseVal = expiryData.call_close?.[index];
      const callDeltaVal = expiryData.call_delta?.[index];
      const putCloseVal = expiryData.put_close?.[index];
      const putDeltaVal = expiryData.put_delta?.[index];

      return {
        strike,
        callLtp:
          callCloseVal != null && !isNaN(callCloseVal)
            ? Number(callCloseVal).toFixed(2)
            : "--",
        callDelta:
          callDeltaVal != null && !isNaN(callDeltaVal)
            ? Number(callDeltaVal).toFixed(2)
            : "--",
        putLtp:
          putCloseVal != null && !isNaN(putCloseVal)
            ? Number(putCloseVal).toFixed(2)
            : "--",
        putDelta:
          putDeltaVal != null && !isNaN(putDeltaVal)
            ? Number(putDeltaVal).toFixed(2)
            : "--",
        iv:
          ivVal != null && !isNaN(ivVal)
            ? (Number(ivVal) * 100).toFixed(1)
            : "--",
        highlight: strike === atmStrike,
        isCallITM,
        isPutITM,
      };
    });
  }

  // Formatting for UI
  const cashClose = optionChainData?.cash?.close?.toFixed(2) || "0.00";
  const displayFutures = topBarFuturesPrice
    ? topBarFuturesPrice.toFixed(2)
    : "--";

  const changePercent = optionChainData?.cash?.change_percent ?? 0.62;
  const changeValue =
    optionChainData?.cash?.change ??
    (parseFloat(cashClose) * changePercent) / 100;
  const isPositive = changeValue >= 0;
  const changeStr = `${isPositive ? "+" : ""}${changeValue.toFixed(2)} (${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)`;

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden relative">
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
      <div className="flex border-b border-slate-100 items-stretch">
        {/* Spot Area */}
        <div className="p-3 pl-4 flex-1">
          <div className="text-[13px] text-slate-600 mb-0.5">
            <AssetSelector
              selectedAsset={selectedAsset}
              onAssetSelect={setSelectedAsset}
            />
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[12px] font-bold text-slate-900">
              {cashClose}
            </span>
            <span
              className={`text-[12px] ${isPositive ? "text-emerald-500" : "text-red-500"}`}
            >
              {changeStr}
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-px bg-slate-100"></div>

        {/* Future Area */}
        <div
          className="p-3 pl-4 flex-1 flex justify-between items-center relative"
          ref={futureDropdownRef}
        >
          <div>
            <div
              className="flex items-center gap-1 text-[13px] text-slate-600 cursor-pointer mb-0.5"
              onClick={() => setIsFutureDropdownOpen(!isFutureDropdownOpen)}
            >
              FUT (
              {selectedFutureExpiry
                ? formatFutureExpiry(selectedFutureExpiry)
                : "--"}
              ) <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-[12px] font-bold text-slate-900 mt-0.5">
              {displayFutures}
            </div>

            {/* Future Dropdown */}
            {isFutureDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-[380px] bg-white border border-slate-200 rounded shadow-lg z-50 overflow-hidden text-[13px]">
                <div className="grid grid-cols-[30px_190px_80px_50px] px-3 py-2 bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                  <div></div>
                  <div>Expiry</div>
                  <div>LTP</div>
                  <div>Lots</div>
                </div>
                {futureExpiries.map((exp, idx) => {
                  const priceObj =
                    optionChainData?.futures?.[exp]?.close ||
                    optionChainData?.implied_futures?.[exp];
                  const price = priceObj ? priceObj.toFixed(2) : "--";
                  return (
                    <div
                      key={exp}
                      className="grid grid-cols-[30px_190px_80px_50px] px-3 py-3 items-center hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                      onClick={() => {
                        setSelectedFutureExpiry(exp);
                        setIsFutureDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${selectedFutureExpiry === exp ? "border-blue-500" : "border-slate-300"}`}
                        >
                          {selectedFutureExpiry === exp && (
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-700 whitespace-nowrap">
                        {formatFutureExpiry(exp)} (
                        {getDaysToExpiryFull(exp, currentTimestamp)})
                      </div>
                      <div className="text-slate-700">{price}</div>
                      <div className="text-slate-400 flex items-center">
                        {idx > 0 && price === "--" && (
                          <AlertTriangle className="w-4 h-4 text-amber-600/70" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 mr-2">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Clear Button Area */}
        <div className="w-px bg-slate-100"></div>
        <div className="px-4 py-3 flex items-center justify-center bg-[#fafafa]">
          <button className="text-slate-400 text-[13px] hover:text-slate-600 px-2 py-1">
            Clear
          </button>
        </div>
      </div>

      {/* Expiry Tabs */}
      <div className="flex items-center px-2 py-3 border-b border-slate-100 gap-2">
        <button
          className="text-slate-400 hover:text-slate-600"
          onClick={() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollBy({
                left: -200,
                behavior: "smooth",
              });
            }
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div
          className="flex gap-2 overflow-x-auto no-scrollbar"
          ref={scrollContainerRef}
        >
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
        <button
          className="text-slate-400 hover:text-slate-600"
          onClick={() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollBy({
                left: 200,
                behavior: "smooth",
              });
            }
          }}
        >
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
      <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr] py-1.5 text-[11px] font-medium text-slate-500 border-b border-slate-100">
        <div className="text-left pl-6">Delta</div>
        <div className="text-center">Call LTP</div>
        <div className="text-center">Lots</div>
        <div className="text-center">Strike</div>
        <div className="text-center">IV</div>
        <div className="text-center">Lots</div>
        <div className="text-center">Put LTP</div>
        <div className="text-right pr-6">Delta</div>
      </div>

      {/* Table Body */}
      <div
        className="flex-1 overflow-y-auto no-scrollbar relative"
        ref={tableContainerRef}
      >
        {tableRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No option chain data available for this expiry.
          </div>
        ) : (
          tableRows.map((row, i) => {
            const isAtm = row.highlight;
            const callBg = isAtm
              ? "bg-[#e6f4ff]"
              : row.isCallITM
                ? "bg-[#fef9e7]"
                : "bg-white";
            const putBg = isAtm
              ? "bg-[#e6f4ff]"
              : row.isPutITM
                ? "bg-[#fef9e7]"
                : "bg-white";
            const centerBg = isAtm ? "bg-[#e6f4ff]" : "bg-white";

            return (
              <div
                key={i}
                id={isAtm ? "atm-row" : undefined}
                ref={isAtm ? setAtmNode : null}
                className={`group grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr] text-[11px]  items-stretch border-b hover:opacity-90 relative ${isAtm ? "border-[#0082f4] z-10" : "border-slate-100"}`}
              >
                <div
                  className={`flex items-center text-slate-500 font-bold pl-6 pr-2 py-[12px] ${callBg}`}
                >
                  {row.callDelta}
                </div>
                <div
                  className={`flex items-center justify-center font-bold text-slate-800 px-2 py-1.5 ${callBg}`}
                >
                  {row.callLtp === "--" ? (
                    <div className="relative flex items-center justify-center cursor-pointer [&>.tooltip]:hover:block">
                      <AlertTriangle className="w-[15px] h-[15px] text-amber-500/80" strokeWidth={2} />
                      <div className="tooltip absolute bottom-full mb-1 hidden bg-[#222] text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-50 font-normal shadow-sm">
                        Illiquid Option
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#222]"></div>
                      </div>
                    </div>
                  ) : (
                    row.callLtp
                  )}
                </div>
                <div
                  className={`flex items-center justify-center px-2 py-1.5 ${callBg}`}
                >
                  {row.callLtp === "--" ? (
                    <div className="hidden group-hover:flex relative items-center justify-center cursor-pointer [&>.tooltip]:hover:block"
                         onClick={(e) => handleFetchSpecificLTP(e, 'call', row.strike, i)}>
                      <RefreshCw className="w-[15px] h-[15px] text-[#0082f4]" strokeWidth={2.5} />
                      <div className="tooltip absolute bottom-full mb-1 hidden bg-[#222] text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 font-normal">
                        Fetch instrument's LTP
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#222]"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden group-hover:flex items-center justify-center gap-1">
                      <button className="w-[22px] h-[22px] flex items-center justify-center bg-white border border-[#94a3b8] text-[#1e3a5f] rounded-[4px] text-[10px] font-medium hover:bg-green-50 hover:text-green-500 hover:border-green-500 transition-colors">
                        B
                      </button>
                      <button className="w-[22px] h-[22px] flex items-center justify-center bg-white border border-[#94a3b8] text-[#1e3a5f] rounded-[4px] text-[10px] font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-500 transition-colors">
                        S
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`flex items-center justify-center relative py-1 ${centerBg}`}
                >
                  <span
                    className="text-[12px] font-bold text-[#808080] bg-slate-100 px-2 py-0.5 rounded"
                    style={{ fontVariationSettings: "normal" }}
                  >
                    {row.strike}
                  </span>

                  {isAtm && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full -translate-y-1/2 z-20 bg-white border border-[#0082f4] text-[#0082f4] text-[10px] font-medium px-3 py-[2px] rounded-full whitespace-nowrap shadow-sm">
                      Synthetic FUT{" "}
                      {syntheticFuturesPrice
                        ? syntheticFuturesPrice.toFixed(2)
                        : "--"}
                    </div>
                  )}
                </div>

                <div
                  className={`flex items-center justify-center text-slate-500 px-2 py-1.5 ${putBg}`}
                >
                  {row.iv}
                </div>
                <div
                  className={`flex items-center justify-center px-2 py-1.5 ${putBg}`}
                >
                  {row.putLtp === "--" ? (
                    <div className="hidden group-hover:flex relative items-center justify-center cursor-pointer [&>.tooltip]:hover:block"
                         onClick={(e) => handleFetchSpecificLTP(e, 'put', row.strike, i)}>
                      <RefreshCw className="w-[15px] h-[15px] text-[#0082f4]" strokeWidth={2.5} />
                      <div className="tooltip absolute bottom-full mb-1 hidden bg-[#222] text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 font-normal">
                        Fetch instrument's LTP
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#222]"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden group-hover:flex items-center justify-center gap-1">
                      <button className="w-[22px] h-[22px] flex items-center justify-center bg-white border border-[#94a3b8] text-[#1e3a5f] rounded-[4px] text-[10px] font-medium hover:bg-green-50 hover:text-green-500 hover:border-green-500 transition-colors">
                        B
                      </button>
                      <button className="w-[22px] h-[22px] flex items-center justify-center bg-white border border-[#94a3b8] text-[#1e3a5f] rounded-[4px] text-[10px] font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-500 transition-colors">
                        S
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className={`flex items-center font-bold  justify-center text-slate-800 px-2 py-1.5 ${putBg}`}
                >
                  {row.putLtp === "--" ? (
                    <div className="relative flex items-center justify-center cursor-pointer [&>.tooltip]:hover:block">
                      <AlertTriangle className="w-[15px] h-[15px] text-amber-500/80" strokeWidth={2} />
                      <div className="tooltip absolute bottom-full mb-1 hidden bg-[#222] text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-50 font-normal shadow-sm">
                        Illiquid Option
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#222]"></div>
                      </div>
                    </div>
                  ) : (
                    row.putLtp
                  )}
                </div>
                <div
                  className={`flex items-center justify-end text-slate-500 pl-2 pr-6 py-1.5 ${putBg}`}
                >
                  {row.putDelta}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Go to ATM Button */}
      {!isAtmInView && tableRows.some((r) => r.highlight) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            className="bg-white text-blue-600 border border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.15)] px-4 py-2 rounded-full text-[13px] font-medium hover:bg-blue-50 transition-all flex items-center gap-1.5"
            onClick={() => {
              const atmNode = document.getElementById("atm-row");
              if (atmNode) {
                atmNode.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
          >
            Go to ATM
          </button>
        </div>
      )}
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
