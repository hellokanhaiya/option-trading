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
import { PositionsPanel } from "./PositionsPanel";
import {
  getDayContracts,
  getOptionChain,
  fetchLTP,
  getLotSizes,
} from "../../utils/simulatorUtils";

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

import { Combobox, Portal } from "@headlessui/react";
import { BriefcaseIcon } from "./BriefcaseIcon";

const LotsDropdown = ({ lots, onChange }) => {
  const [query, setQuery] = React.useState("");
  const [val, setVal] = React.useState(lots);

  React.useEffect(() => {
    setVal(lots);
  }, [lots]);

  const filteredOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].filter((n) =>
    n.toString().includes(query),
  );

  return (
    <div className="relative z-[999]">
      <Combobox
        value={val}
        onChange={(newVal) => {
          setVal(newVal);
          onChange(newVal);
        }}
      >
        {({ open }) => (
          <div className="relative">
            <div className="relative w-[50px] bg-white border border-slate-300 rounded shadow-sm">
              <Combobox.Input
                className="w-full pl-2 pr-4 py-0.5 text-left text-[10px] text-slate-800 font-bold focus:outline-none"
                displayValue={(n) => n}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVal(event.target.value);
                }}
                onClick={(e) => {
                  if (!open && e.target.nextElementSibling) {
                    e.target.nextElementSibling.click();
                  }
                }}
                onBlur={() => {
                  const num = parseInt(val, 10);
                  if (isNaN(num) || num <= 0) setVal(lots);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const num = parseInt(e.target.value, 10);
                    if (!isNaN(num) && num > 0) {
                      setVal(num);
                      onChange(num);
                    }
                  }
                }}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-0.5 hover:bg-slate-100 cursor-pointer rounded-r">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="h-3 w-3 text-slate-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </Combobox.Button>
            </div>
            {open && (
              <Combobox.Options className="absolute mt-0.5 max-h-40 w-[50px] overflow-auto rounded bg-white py-1 text-[10px] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999] no-scrollbar top-full right-0">
                {filteredOptions.length === 0 && query !== "" ? (
                  <div className="relative cursor-default select-none py-1 px-2 text-gray-700">
                    Nothing found.
                  </div>
                ) : (
                  (filteredOptions.length > 0
                    ? filteredOptions
                    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20]
                  ).map((n) => (
                    <Combobox.Option
                      key={n}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-1 px-2 ${
                          active ? "bg-blue-50 text-blue-600" : "text-slate-700"
                        }`
                      }
                      value={n}
                    >
                      {({ selected }) => (
                        <span
                          className={`block truncate ${selected ? "font-medium text-blue-600" : "font-normal"}`}
                        >
                          {n}
                        </span>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            )}
          </div>
        )}
      </Combobox>
    </div>
  );
};

export function OptionChainPanel({
  currentTimestamp = new Date("2026-06-01T09:16:00"),
  selectedAsset,
  setSelectedAsset,
  onDataLoaded,
  positions,
  setPositions,
  onOpenAlerts,
}) {
  const [activeLeftTab, setActiveLeftTab] = useState("optionChain");
  const [showOnlyPositions, setShowOnlyPositions] = useState(false);
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
  const [lotSizeData, setLotSizeData] = useState({});

  // Fetch lot sizes once on mount
  useEffect(() => {
    getLotSizes().then((data) => {
      if (data && typeof data === "object") setLotSizeData(data);
    });
  }, []);

  // Compute current lot size from API data
  const currentLotSize = React.useMemo(() => {
    if (!selectedAsset || !selectedExpiry || !lotSizeData) return 1;
    const underlying = selectedAsset.underlying;
    const assetData = lotSizeData[underlying];
    if (!assetData) return 1;
    // Try exact expiry match first
    if (assetData[selectedExpiry]) return assetData[selectedExpiry][0];
    // Fallback: find any expiry's lot size for this underlying
    const firstKey = Object.keys(assetData)[0];
    if (firstKey && assetData[firstKey]) return assetData[firstKey][0];
    return 1;
  }, [selectedAsset, selectedExpiry, lotSizeData]);

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
      contractType,
    );

    if (icon) icon.classList.remove("animate-spin");

    if (
      res &&
      res.symbols &&
      res.symbols.length > 0 &&
      res.symbols[0].close !== undefined &&
      res.symbols[0].close !== null
    ) {
      setOptionChainData((prev) => {
        if (!prev) return prev;
        const newData = JSON.parse(JSON.stringify(prev)); // Deep clone
        if (newData?.options?.[selectedExpiry]) {
          const targetKey = type === "call" ? "call_close" : "put_close";
          const deltaKey = type === "call" ? "call_delta" : "put_delta";

          if (!newData.options[selectedExpiry][targetKey]) {
            newData.options[selectedExpiry][targetKey] = [];
          }
          newData.options[selectedExpiry][targetKey][index] =
            res.symbols[0].close;

          if (
            res.symbols[0].delta !== undefined &&
            res.symbols[0].delta !== null
          ) {
            if (!newData.options[selectedExpiry][deltaKey]) {
              newData.options[selectedExpiry][deltaKey] = [];
            }
            newData.options[selectedExpiry][deltaKey][index] =
              res.symbols[0].delta;
          }
        }
        return newData;
      });
    }
  };

  const handleTrade = (e, type, side, strike, iv, ltp) => {
    e.stopPropagation();
    if (ltp === "--" || ltp == null) return;

    const lotSize = currentLotSize;

    const tsString = currentTimestamp.toISOString().split(".")[0];
    const entrySpot = optionChainData?.cash?.close || 0;

    const newPos = {
      type: "ADD",
      data: {
        _id: Math.random().toString(36).substr(2, 9),
        Position: side === "B" ? 1 : -1,
        TradedPrice: parseFloat(ltp),
        InstrumentType: type === "call" ? 1 : -1,
        Quantity: lotSize,
        Strike: strike,
        Expiry: selectedExpiry,
        Ticker: selectedAsset.underlying,
        TradedTime: tsString,
        entrySpot: entrySpot,
        iv: parseFloat(iv) || 15,
      },
      time: tsString,
    };

    setPositions((prev) => [...(prev || []), newPos]);
  };

  const handleFutureTrade = (e, side) => {
    e.stopPropagation();
    if (displayFutures === "--" || displayFutures == null) return;
    handleFutureTradeSpecific(e, side, selectedFutureExpiry, displayFutures);
  };

  const handleFutureTradeSpecific = (e, side, expiry, price) => {
    e.stopPropagation();
    if (price === "--" || price == null) return;

    const lotSize = currentLotSize;
    const tsString = currentTimestamp.toISOString().split(".")[0];
    const entrySpot = optionChainData?.cash?.close || 0;

    const newPos = {
      type: "ADD",
      data: {
        _id: Math.random().toString(36).substr(2, 9),
        Position: side === "B" ? 1 : -1,
        TradedPrice: parseFloat(price),
        InstrumentType: "FUT",
        Quantity: lotSize,
        Strike: 0,
        Expiry: expiry,
        Ticker: selectedAsset.underlying,
        TradedTime: tsString,
        entrySpot: entrySpot,
        iv: 0,
      },
      time: tsString,
    };

    setPositions((prev) => [...(prev || []), newPos]);
    setIsFutureDropdownOpen(false);
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
        topBarFuturesPrice =
          optionChainData.futures[selectedFutureExpiry].close;
      } else if (optionChainData?.implied_futures?.[selectedFutureExpiry]) {
        topBarFuturesPrice =
          optionChainData.implied_futures[selectedFutureExpiry];
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

    if (showOnlyPositions && positions && positions.length > 0) {
      let groupedRows = [];
      const expiriesWithPositions = [
        ...new Set(positions.map((p) => (p.data || p).Expiry)),
      ]
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b));

      expiriesWithPositions.forEach((exp) => {
        // Add header
        groupedRows.push({ isHeader: true, expiry: exp });

        // Find strikes for this expiry
        if (
          optionChainData &&
          optionChainData.options &&
          optionChainData.options[exp]
        ) {
          const expData = optionChainData.options[exp];
          const strikes = expData.strike || [];

          // Get positions for this expiry
          const posForExp = positions.filter((pos) => {
            const p = pos.data || pos;
            return p.Expiry === exp && p.InstrumentType !== "FUT";
          });
          const strikesWithPos = [
            ...new Set(posForExp.map((pos) => (pos.data || pos).Strike)),
          ].filter((s) => s !== 0);

          // Same logic to build row
          let synFutPrice =
            optionChainData?.implied_futures?.[exp] ||
            optionChainData?.cash?.close;
          let atmS = null;
          if (synFutPrice) {
            let mDiff = Infinity;
            strikes.forEach((s) => {
              const diff = Math.abs(s - synFutPrice);
              if (diff < mDiff) {
                mDiff = diff;
                atmS = s;
              }
            });
          }

          // We want to retain the original ascending order of strikes
          const sortedStrikesWithPos = strikesWithPos.sort((a, b) => a - b);

          sortedStrikesWithPos.forEach((strike) => {
            const index = strikes.indexOf(strike);
            if (index === -1) return;

            const isCallITM = synFutPrice && strike < synFutPrice;
            const isPutITM = synFutPrice && strike > synFutPrice;
            const callIv = expData.call_implied_vol?.[index];
            const putIv = expData.put_implied_vol?.[index];
            let ivVal = null;
            if (isCallITM)
              ivVal = putIv !== null && putIv !== undefined ? putIv : callIv;
            else
              ivVal = callIv !== null && callIv !== undefined ? callIv : putIv;

            const callCloseVal = expData.call_close?.[index];
            const callDeltaVal = expData.call_delta?.[index];
            const putCloseVal = expData.put_close?.[index];
            const putDeltaVal = expData.put_delta?.[index];

            groupedRows.push({
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
              highlight: strike === atmS,
              isCallITM,
              isPutITM,
            });
          });
        }
      });
      tableRows = groupedRows;
    }
  }

  // Formatting for UI
  const cashClose = optionChainData?.cash?.close?.toFixed(2) || "0.00";
  const displayFutures = topBarFuturesPrice
    ? topBarFuturesPrice.toFixed(2)
    : "--";

  const calcChange = (data) => {
    if (!data) return { val: 0, pct: 0 };
    if (data.change != null && data.change_percent != null) {
      return { val: data.change, pct: data.change_percent };
    }
    if (data.close != null && data.prev_close != null && data.prev_close > 0) {
      const diff = data.close - data.prev_close;
      return { val: diff, pct: (diff / data.prev_close) * 100 };
    }
    return { val: 0, pct: 0 };
  };

  const cashStats = calcChange(optionChainData?.cash);
  const changePercent = cashStats.pct;
  const changeValue = cashStats.val;
  const isPositive = changeValue >= 0;
  const changeStr = `${isPositive ? "+" : ""}${changeValue.toFixed(2)} (${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)`;

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden relative">
      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 pt-2 shrink-0">
        <button
          onClick={() => setActiveLeftTab("optionChain")}
          className={`px-6 py-2 font-medium text-sm transition-colors ${activeLeftTab === "optionChain" ? "border-b-2 border-blue-500 text-blue-600" : "text-slate-600 hover:text-slate-800"}`}
        >
          Option Chain
        </button>
        <button
          onClick={() => setActiveLeftTab("positions")}
          className={`px-6 py-2 font-medium text-sm transition-colors ${activeLeftTab === "positions" ? "border-b-2 border-blue-500 text-blue-600" : "text-slate-600 hover:text-slate-800"}`}
        >
          Positions
        </button>
        <div 
          className={`ml-auto px-4 flex items-center gap-1 text-[11px] font-medium transition-opacity ${!positions || positions.length === 0 ? "text-slate-400 cursor-not-allowed opacity-50" : "text-blue-500 cursor-pointer hover:underline"}`}
          onClick={() => {
            if (positions && positions.length > 0 && onOpenAlerts) {
              onOpenAlerts();
            }
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-3.5 h-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>{" "}
          Add/Edit Alerts
        </div>
      </div>

      {/* Selectors Area (Global for both tabs) */}
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
          className="p-3 pl-4 flex-1 flex justify-between items-center relative group"
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
            <div className="text-[12px] font-bold text-slate-900">
              {displayFutures}
            </div>
          </div>

          {/* Hover Actions (Buy/Sell/Clear) */}
          <div className="hidden group-hover:flex items-center gap-2 pr-2">
            <button 
              onClick={(e) => handleFutureTrade(e, "B")}
              className="w-5 h-5 flex items-center justify-center rounded border border-green-500 text-green-500 hover:bg-green-50 text-[10px] font-bold"
            >
              B
            </button>
            <button 
              onClick={(e) => handleFutureTrade(e, "S")}
              className="w-5 h-5 flex items-center justify-center rounded border border-red-500 text-red-500 hover:bg-red-50 text-[10px] font-bold"
            >
              S
            </button>
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
                    className="grid grid-cols-[30px_190px_80px_50px] px-3 py-3 items-center hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 relative group"
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
                    <div className="flex items-center">
                      <div className="absolute right-4 hidden group-hover:flex items-center gap-2 bg-white px-2 py-1 z-10">
                        <button 
                          onClick={(e) => handleFutureTradeSpecific(e, "B", exp, priceObj)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-green-500 text-green-500 hover:bg-green-50 text-[10px] font-bold"
                        >
                          B
                        </button>
                        <button 
                          onClick={(e) => handleFutureTradeSpecific(e, "S", exp, priceObj)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-red-500 text-red-500 hover:bg-red-50 text-[10px] font-bold"
                        >
                          S
                        </button>
                      </div>
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
        <div className="w-px bg-slate-100"></div>
        <div className="flex items-center w-20">
          <div className="flex items-center w-full gap-4 pl-2 pr-1">
            <button
              onClick={() => setPositions([])}
              disabled={!positions || positions.length === 0}
              className={`w-full font-medium text-[13px] ${
                !positions || positions.length === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-red-500 hover:underline"
              }`}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {activeLeftTab === "positions" ? (
        <PositionsPanel
          positions={positions}
          setPositions={setPositions}
          selectedAsset={selectedAsset}
          currentTimestamp={currentTimestamp}
          optionChainData={optionChainData}
          selectedExpiry={selectedExpiry}
          currentLotSize={currentLotSize}
          onSwitchToOptionChain={() => setActiveLeftTab("optionChain")}
        />
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
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
                    disabled={showOnlyPositions}
                    onClick={() => {
                      if (!showOnlyPositions) setSelectedExpiry(date);
                    }}
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

            <div
              className={`ml-auto flex items-center gap-2 px-2 shrink-0 ${!positions || positions.length === 0 ? "opacity-50 pointer-events-none" : ""}`}
            >
              <div
                className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${showOnlyPositions ? "bg-blue-500" : "bg-slate-300"}`}
                onClick={() => setShowOnlyPositions(!showOnlyPositions)}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${showOnlyPositions ? "left-4" : "left-0.5"}`}
                ></div>
              </div>
              <span
                className={`text-xs font-medium cursor-pointer ${showOnlyPositions ? "text-slate-800" : "text-slate-500"}`}
                onClick={() => setShowOnlyPositions(!showOnlyPositions)}
              >
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
                if (row.isHeader) {
                  return (
                    <div
                      key={`header-${row.expiry}`}
                      className="flex justify-center items-center py-2 relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:h-px before:bg-slate-200 before:z-0"
                    >
                      <span className="bg-white border border-slate-200 text-slate-500 text-[11px] font-medium px-3 py-0.5 rounded-full z-10 relative">
                        {formatFutureExpiry(row.expiry)}
                      </span>
                    </div>
                  );
                }

                const isAtm = row.highlight;
                const callBg = isAtm
                  ? "bg-[#e6f4ff]"
                  : row.isCallITM && !showOnlyPositions
                    ? "bg-[#fef9e7]"
                    : "bg-white";
                const putBg = isAtm
                  ? "bg-[#e6f4ff]"
                  : row.isPutITM && !showOnlyPositions
                    ? "bg-[#fef9e7]"
                    : "bg-white";
                const centerBg = isAtm ? "bg-[#e6f4ff]" : "bg-white";

                return (
                  <div
                    key={i}
                    id={isAtm ? "atm-row" : undefined}
                    ref={isAtm ? setAtmNode : null}
                    className={`group grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr] text-[11px] items-stretch border-b hover:opacity-90 relative hover:z-[50] focus-within:z-[50] ${isAtm ? "border-[#0082f4] z-10" : "border-slate-100 z-0"}`}
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
                          <AlertTriangle
                            className="w-[15px] h-[15px] text-amber-500/80"
                            strokeWidth={2}
                          />
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
                      className={`flex items-center justify-center px-2 py-1.5 min-w-[75px] ${callBg}`}
                    >
                      {(() => {
                        const activePosList = positions?.filter(
                          (p) =>
                            p.data?.Strike === row.strike &&
                            p.data?.InstrumentType === 1,
                        );
                        const activePos =
                          activePosList && activePosList.length > 0
                            ? activePosList[activePosList.length - 1]
                            : null;
                        const tsString = currentTimestamp
                          .toISOString()
                          .split(".")[0];
                        const lotSize = currentLotSize;

                        if (activePos) {
                          const p = activePos.data;
                          const lots = Math.max(
                            1,
                            Math.round(p.Quantity / lotSize),
                          );
                          if (activePos.time === tsString) {
                            return (
                              <div className="flex flex-col items-end gap-1 relative z-20 w-[72px]">
                                <div className="flex items-center gap-1">
                                  <button
                                    className={`w-5 h-5 flex items-center justify-center rounded-[3px] text-[10px] font-medium transition-colors border ${
                                      p.Position === 1
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "bg-white border-blue-800 text-blue-800 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-500"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (p.Position === 1) {
                                        setPositions((prev) =>
                                          prev.filter(
                                            (pos) => pos.data._id !== p._id,
                                          ),
                                        );
                                      } else {
                                        setPositions((prev) =>
                                          prev.map((pos) =>
                                            pos.data._id === p._id
                                              ? {
                                                  ...pos,
                                                  data: {
                                                    ...pos.data,
                                                    Position: 1,
                                                  },
                                                }
                                              : pos,
                                          ),
                                        );
                                      }
                                    }}
                                  >
                                    B
                                  </button>
                                  <button
                                    className={`w-5 h-5 flex items-center justify-center rounded-[3px] text-[10px] font-medium transition-colors border ${
                                      p.Position === -1
                                        ? "bg-red-500 border-red-500 text-white"
                                        : "bg-white border-blue-800 text-blue-800 hover:bg-red-50 hover:text-red-500 hover:border-red-500"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (p.Position === -1) {
                                        setPositions((prev) =>
                                          prev.filter(
                                            (pos) => pos.data._id !== p._id,
                                          ),
                                        );
                                      } else {
                                        setPositions((prev) =>
                                          prev.map((pos) =>
                                            pos.data._id === p._id
                                              ? {
                                                  ...pos,
                                                  data: {
                                                    ...pos.data,
                                                    Position: -1,
                                                  },
                                                }
                                              : pos,
                                          ),
                                        );
                                      }
                                    }}
                                  >
                                    S
                                  </button>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                  <span>Lots</span>
                                  <LotsDropdown
                                    lots={lots}
                                    onChange={(newLots) => {
                                      const newQty = newLots * lotSize;
                                      setPositions((prev) =>
                                        prev.map((pos) =>
                                          pos.data._id === p._id
                                            ? {
                                                ...pos,
                                                data: {
                                                  ...pos.data,
                                                  Quantity: newQty,
                                                },
                                              }
                                            : pos,
                                        ),
                                      );
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex items-center gap-1 font-bold text-slate-500 text-[11px]">
                                <BriefcaseIcon className="w-3.5 h-3.5" />{" "}
                                {p.Position === 1 ? "" : "-"}
                                {lots}
                              </div>
                            );
                          }
                        }

                        return row.callLtp === "--" ? (
                          <div
                            className="hidden group-hover:flex relative items-center justify-center cursor-pointer [&>.tooltip]:hover:block"
                            onClick={(e) =>
                              handleFetchSpecificLTP(e, "call", row.strike, i)
                            }
                          >
                            <RefreshCw
                              className="w-[15px] h-[15px] text-[#0082f4]"
                              strokeWidth={2.5}
                            />
                            <div className="tooltip absolute bottom-full mb-1 hidden bg-[#222] text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 font-normal">
                              Fetch instrument's LTP
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#222]"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="hidden group-hover:flex flex-col items-end gap-1 w-[72px]">
                            <div className="flex items-center gap-1">
                              <button
                                className="w-5 h-5 flex items-center justify-center bg-white border border-blue-800 text-blue-800 rounded-[3px] text-[10px] font-medium hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-500 transition-colors"
                                onClick={(e) =>
                                  handleTrade(
                                    e,
                                    "call",
                                    "B",
                                    row.strike,
                                    row.iv,
                                    row.callLtp,
                                  )
                                }
                              >
                                B
                              </button>
                              <button
                                className="w-5 h-5 flex items-center justify-center bg-white border border-blue-800 text-blue-800 rounded-[3px] text-[10px] font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-500 transition-colors"
                                onClick={(e) =>
                                  handleTrade(
                                    e,
                                    "call",
                                    "S",
                                    row.strike,
                                    row.iv,
                                    row.callLtp,
                                  )
                                }
                              >
                                S
                              </button>
                            </div>
                          </div>
                        );
                      })()}
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
                      className={`flex items-center justify-center px-2 py-1.5 min-w-[75px] ${putBg}`}
                    >
                      {(() => {
                        const activePosList = positions?.filter(
                          (p) =>
                            p.data?.Strike === row.strike &&
                            p.data?.InstrumentType === -1,
                        );
                        const activePos =
                          activePosList && activePosList.length > 0
                            ? activePosList[activePosList.length - 1]
                            : null;
                        const tsString = currentTimestamp
                          .toISOString()
                          .split(".")[0];
                        const lotSize = currentLotSize;

                        if (activePos) {
                          const p = activePos.data;
                          const lots = Math.max(
                            1,
                            Math.round(p.Quantity / lotSize),
                          );
                          if (activePos.time === tsString) {
                            return (
                              <div className="flex flex-col items-end gap-1 relative z-20 w-[72px]">
                                <div className="flex items-center gap-1">
                                  <button
                                    className={`w-5 h-5 flex items-center justify-center rounded-[3px] text-[10px] font-medium transition-colors border ${
                                      p.Position === 1
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "bg-white border-blue-800 text-blue-800 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-500"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (p.Position === 1) {
                                        setPositions((prev) =>
                                          prev.filter(
                                            (pos) => pos.data._id !== p._id,
                                          ),
                                        );
                                      } else {
                                        setPositions((prev) =>
                                          prev.map((pos) =>
                                            pos.data._id === p._id
                                              ? {
                                                  ...pos,
                                                  data: {
                                                    ...pos.data,
                                                    Position: 1,
                                                  },
                                                }
                                              : pos,
                                          ),
                                        );
                                      }
                                    }}
                                  >
                                    B
                                  </button>
                                  <button
                                    className={`w-5 h-5 flex items-center justify-center rounded-[3px] text-[10px] font-medium transition-colors border ${
                                      p.Position === -1
                                        ? "bg-red-500 border-red-500 text-white"
                                        : "bg-white border-blue-800 text-blue-800 hover:bg-red-50 hover:text-red-500 hover:border-red-500"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (p.Position === -1) {
                                        setPositions((prev) =>
                                          prev.filter(
                                            (pos) => pos.data._id !== p._id,
                                          ),
                                        );
                                      } else {
                                        setPositions((prev) =>
                                          prev.map((pos) =>
                                            pos.data._id === p._id
                                              ? {
                                                  ...pos,
                                                  data: {
                                                    ...pos.data,
                                                    Position: -1,
                                                  },
                                                }
                                              : pos,
                                          ),
                                        );
                                      }
                                    }}
                                  >
                                    S
                                  </button>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                  <span>Lots</span>
                                  <LotsDropdown
                                    lots={lots}
                                    onChange={(newLots) => {
                                      const newQty = newLots * lotSize;
                                      setPositions((prev) =>
                                        prev.map((pos) =>
                                          pos.data._id === p._id
                                            ? {
                                                ...pos,
                                                data: {
                                                  ...pos.data,
                                                  Quantity: newQty,
                                                },
                                              }
                                            : pos,
                                        ),
                                      );
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex items-center gap-1 font-bold text-slate-500 text-[11px]">
                                <BriefcaseIcon className="w-3.5 h-3.5" />{" "}
                                {p.Position === 1 ? "" : "-"}
                                {lots}
                              </div>
                            );
                          }
                        }

                        return row.putLtp === "--" ? (
                          <div
                            className="hidden group-hover:flex relative items-center justify-center cursor-pointer [&>.tooltip]:hover:block"
                            onClick={(e) =>
                              handleFetchSpecificLTP(e, "put", row.strike, i)
                            }
                          >
                            <RefreshCw
                              className="w-[15px] h-[15px] text-[#0082f4]"
                              strokeWidth={2.5}
                            />
                            <div className="tooltip absolute bottom-full mb-1 hidden bg-[#222] text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 font-normal">
                              Fetch instrument's LTP
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#222]"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="hidden group-hover:flex flex-col items-end gap-1 w-[72px]">
                            <div className="flex items-center gap-1">
                              <button
                                className="w-5 h-5 flex items-center justify-center bg-white border border-blue-800 text-blue-800 rounded-[3px] text-[10px] font-medium hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-500 transition-colors"
                                onClick={(e) =>
                                  handleTrade(
                                    e,
                                    "put",
                                    "B",
                                    row.strike,
                                    row.iv,
                                    row.putLtp,
                                  )
                                }
                              >
                                B
                              </button>
                              <button
                                className="w-5 h-5 flex items-center justify-center bg-white border border-blue-800 text-blue-800 rounded-[3px] text-[10px] font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-500 transition-colors"
                                onClick={(e) =>
                                  handleTrade(
                                    e,
                                    "put",
                                    "S",
                                    row.strike,
                                    row.iv,
                                    row.putLtp,
                                  )
                                }
                              >
                                S
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div
                      className={`flex items-center font-bold  justify-center text-slate-800 px-2 py-1.5 ${putBg}`}
                    >
                      {row.putLtp === "--" ? (
                        <div className="relative flex items-center justify-center cursor-pointer [&>.tooltip]:hover:block">
                          <AlertTriangle
                            className="w-[15px] h-[15px] text-amber-500/80"
                            strokeWidth={2}
                          />
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
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100]">
              <button
                className=" absolute bottom-4 !z-[51] flex w-full  justify-end px-3  md:sticky md:bottom-0 md:top-20 md:items-center md:justify-center pointer-events-auto"
                onClick={() => {
                  const atmNode = document.getElementById("atm-row");
                  if (atmNode) {
                    atmNode.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }
                }}
              >
                <span className="rounded-full border border-blue-500 bg-white px-3 py-1.5 text-xs font-bold text-blue-500 shadow-md transition-colors hover:bg-blue-50 cursor-pointer whitespace-nowrap">
                  Go to ATM
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExpiryPill({ text, days, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium shrink-0 border transition-colors ${
        disabled
          ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
          : active
            ? "bg-white text-blue-600 border-blue-500 shadow-sm"
            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className={active && !disabled ? "font-bold" : ""}>{text}</span>
      <span
        className={`${active && !disabled ? "text-blue-500" : "text-slate-400"} opacity-80 font-normal`}
      >
        ({days})
      </span>
    </button>
  );
}
