import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { ChevronDown, HelpCircle, Plus, RotateCcw } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  generatePayoffData,
  calcExactMtm,
  calcPOP,
} from "../../utils/blackScholes";
import { calculateMargin } from "../../utils/simulatorUtils";
import { GreeksTab } from "./GreeksTab";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  annotationPlugin,
  zoomPlugin,
);

export function AnalysisPanel({
  vixData,
  positions,
  setPositions,
  currentTimestamp,
  spotPrice,
  optionChainData,
}) {
  const [activeRightTab, setActiveRightTab] = useState("payoff");
  const [marginApprox, setMarginApprox] = useState("₹ 0");
  const [marginRaw, setMarginRaw] = useState(0);
  const chartRef = useRef(null);
  const tooltipRef = useRef(null);

  // VIX display
  const vixClose = vixData?.close?.toFixed(2) || "--";
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

  const vixStats = calcChange(vixData);
  const vixChange = vixStats.val;
  const vixPercent = vixStats.pct;
  const isVixPositive = vixChange >= 0;
  const vixChangeStr = vixData
    ? `${isVixPositive ? "+" : ""}${vixChange.toFixed(2)} (${isVixPositive ? "+" : ""}${vixPercent.toFixed(2)}%)`
    : "--";
  const vixColor = isVixPositive ? "text-emerald-500" : "text-red-500";

  const currentSpot = spotPrice || 23924.4;

  // Margin Calculation
  useEffect(() => {
    if (positions && positions.length > 0) {
      setMarginApprox("Calculating...");
      calculateMargin(positions)
        .then((data) => {
          const marginVal = data?.margin || 0;
          let finalMargin = marginVal;
          if (finalMargin <= 0) {
            finalMargin = 0;
            positions.forEach((pos) => {
              const p = pos.data || pos;
              const isBuy = p.Position === 1;
              const qty = parseInt(p.Quantity || 0, 10);
              if (isBuy) {
                finalMargin += parseFloat(p.TradedPrice || 0) * qty;
              } else {
                // Approximate sell margin: ~10% of underlying contract value
                finalMargin += currentSpot * 0.1 * qty;
              }
            });
          }
          setMarginRaw(finalMargin);
          setMarginApprox(
            `₹ ${Math.round(finalMargin).toLocaleString("en-IN")}`,
          );
        })
        .catch(() => {
          // Fallback: use premium paid or approx sell margin
          let finalMargin = 0;
          positions.forEach((pos) => {
            const p = pos.data || pos;
            const isBuy = p.Position === 1;
            const qty = parseInt(p.Quantity || 0, 10);
            if (isBuy) {
              finalMargin += parseFloat(p.TradedPrice || 0) * qty;
            } else {
              finalMargin += currentSpot * 0.1 * qty;
            }
          });
          setMarginRaw(finalMargin);
          setMarginApprox(
            finalMargin > 0
              ? `₹ ${Math.round(finalMargin).toLocaleString("en-IN")}`
              : "₹ 0",
          );
        });
    } else {
      setMarginApprox("₹ 0");
      setMarginRaw(0);
    }
  }, [positions]);

  // Payoff data generation
  const payoffData = useMemo(() => {
    return generatePayoffData(positions, currentSpot, currentTimestamp, optionChainData);
  }, [positions, currentSpot, currentTimestamp, optionChainData]);

  // Metrics calculation
  const metrics = useMemo(() => {
    if (!payoffData || payoffData.length === 0) return null;

    let maxP = -Infinity;
    let maxL = Infinity;
    let breakevens = [];

    for (let i = 0; i < payoffData.length; i++) {
      const p = payoffData[i].expiryPayoff;
      if (p > maxP) maxP = p;
      if (p < maxL) maxL = p;

      // Breakeven: linear interpolation at zero crossings
      if (i > 0) {
        const prev = payoffData[i - 1].expiryPayoff;
        const curr = p;
        if ((prev < 0 && curr >= 0) || (prev >= 0 && curr < 0)) {
          const prevSpot = payoffData[i - 1].spot;
          const currSpot = payoffData[i].spot;
          const ratio = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
          const beSpot = Math.round(prevSpot + ratio * (currSpot - prevSpot));
          breakevens.push(beSpot);
        }
      }
    }

    // Calculate exact MTM at current spot (not from grid)
    const totalMtm = calcExactMtm(positions, currentSpot, currentTimestamp, optionChainData);

    // Calculate POP using lognormal distribution
    const popVal = calcPOP(positions, currentSpot, currentTimestamp, optionChainData);

    // Check if profit/loss is bounded by looking at edge behavior
    const firstPayoff = payoffData[0].expiryPayoff;
    const lastPayoff = payoffData[payoffData.length - 1].expiryPayoff;
    const secondLast = payoffData[payoffData.length - 2].expiryPayoff;
    const secondFirst = payoffData[1].expiryPayoff;

    const isLeftEdgeIncreasing = firstPayoff > secondFirst + 100;
    const isRightEdgeIncreasing = lastPayoff > secondLast + 100;
    const maxProfitUnlimited = isLeftEdgeIncreasing || isRightEdgeIncreasing;

    const isLeftEdgeDecreasing = firstPayoff < secondFirst - 100;
    const isRightEdgeDecreasing = lastPayoff < secondLast - 100;
    const maxLossUnlimited = isLeftEdgeDecreasing || isRightEdgeDecreasing;

    // Format metric values
    const formatValue = (val, isUnlimited) => {
      if (isUnlimited) return { text: "Unlimited", isPositive: val >= 0 };
      const pct = marginRaw > 0 ? ((val / marginRaw) * 100).toFixed(1) : null;
      const pctStr = pct !== null ? ` (${pct > 0 ? "+" : ""}${pct}%)` : "";
      return {
        text: `₹ ${val.toLocaleString("en-IN", { maximumFractionDigits: 1 })}${pctStr}`,
        isPositive: val >= 0,
      };
    };

    const maxProfitFormatted = formatValue(maxP, maxProfitUnlimited);
    const maxLossFormatted = formatValue(maxL, maxLossUnlimited);

    const mtmPct =
      marginRaw > 0 ? ((totalMtm / marginRaw) * 100).toFixed(1) : "0";
    const mtmPctStr =
      marginRaw > 0 ? ` (${totalMtm >= 0 ? "+" : ""}${mtmPct}%)` : " (0%)";
    const totalMtmFormatted = `₹ ${Math.round(totalMtm).toLocaleString("en-IN")}${mtmPctStr}`;
    const totalMtmIsPositive = totalMtm >= 0;

    // Risk/Reward
    let riskReward = "NA";
    if (!maxProfitUnlimited && !maxLossUnlimited && maxL !== 0 && maxP !== 0) {
      riskReward = `1 : ${Math.abs(maxL / maxP).toFixed(2)}`;
    }

    // Breakeven formatting
    const formatBreakeven = (spots) => {
      if (spots.length === 0) return "NA";
      return spots
        .map((s) => {
          const diffPct = ((s - currentSpot) / currentSpot) * 100;
          return `${s} (${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%)`;
        })
        .join(" | ");
    };

    return {
      maxProfit: maxProfitFormatted,
      maxLoss: maxLossFormatted,
      breakevens: formatBreakeven(breakevens),
      pop: `${popVal.toFixed(1)}%`,
      riskReward,
      totalMtmText: totalMtmFormatted,
      totalMtmIsPositive,
    };
  }, [payoffData, marginRaw, currentSpot, positions, currentTimestamp, optionChainData]);

  // Custom tooltip handler
  const customTooltip = useCallback(
    (context) => {
      let tooltipEl = document.getElementById("chartjs-custom-tooltip");
      if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.id = "chartjs-custom-tooltip";
        Object.assign(tooltipEl.style, {
          position: "absolute",
          background: "#333",
          color: "#fff",
          borderRadius: "4px",
          padding: "8px 12px",
          pointerEvents: "none",
          transform: "translate(-50%, -100%)",
          transition: "opacity .15s ease",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          zIndex: "50",
          minWidth: "160px",
          fontSize: "12px",
        });
        document.body.appendChild(tooltipEl);
      }

      const tooltipModel = context.tooltip;
      if (tooltipModel.opacity === 0) {
        tooltipEl.style.opacity = "0";
        return;
      }
      tooltipEl.style.opacity = "1";

      if (tooltipModel.body) {
        let spotVal = 0;
        let tZeroVal = 0;
        let expiryVal = 0;

        tooltipModel.dataPoints.forEach((dp) => {
          const yVal = typeof dp.raw === "object" ? dp.raw.y : dp.raw;
          const xVal = typeof dp.raw === "object" ? dp.raw.x : dp.label;
          spotVal = xVal;
          if (dp.dataset.label === "T+0 P&L") tZeroVal = yVal;
          if (dp.dataset.label === "Expiry P&L") expiryVal = yVal;
        });

        const diffPct = (((spotVal - currentSpot) / currentSpot) * 100).toFixed(
          2,
        );
        const diffColor = diffPct >= 0 ? "#10b981" : "#ef4444";
        const diffSign = diffPct >= 0 ? "+" : "";

        const tZeroColor = tZeroVal >= 0 ? "#10b981" : "#ef4444";
        const expiryColor = expiryVal >= 0 ? "#10b981" : "#ef4444";

        tooltipEl.innerHTML = `
        <div style="font-size: 10px; font-weight: 600; color: #a1a1aa; margin-bottom: 2px;">When Price is at</div>
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 6px;">
          ${Math.round(spotVal)} <span style="color: ${diffColor}; font-size: 11px;">${diffSign}${diffPct}%</span>
        </div>
        <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 4px;">Expect P&L</div>
        <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
          <span style="font-weight: bold;">Today</span>
          <span style="color: ${tZeroColor}; font-weight: bold;">${tZeroVal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px;">
          <span style="font-weight: bold;">Expiry</span>
          <span style="color: ${expiryColor}; font-weight: bold;">${expiryVal.toFixed(2)}</span>
        </div>
      `;
      }

      const canvasRect = context.chart.canvas.getBoundingClientRect();
      tooltipEl.style.left =
        canvasRect.left + window.scrollX + tooltipModel.caretX + "px";
      tooltipEl.style.top =
        canvasRect.top + window.scrollY + tooltipModel.caretY - 12 + "px";
    },
    [currentSpot],
  );

  // Chart Data
  const chartData = useMemo(() => {
    if (!payoffData || payoffData.length === 0) return null;
    return {
      datasets: [
        {
          label: "Expiry P&L",
          data: payoffData.map((d) => ({ x: d.spot, y: d.expiryPayoff })),
          segment: {
            borderColor: (ctx) => (ctx.p1.parsed.y < 0 ? "#f29696" : "#9addb6"),
          },
          fill: {
            target: "origin",
            above: "rgba(16, 185, 129, 0.12)",
            below: "rgba(239, 68, 68, 0.12)",
          },
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#6b7280",
          tension: 0,
          order: 2,
        },
        {
          label: "T+0 P&L",
          data: payoffData.map((d) => ({ x: d.spot, y: d.tZeroPayoff })),
          segment: {
            borderColor: "#707afa",
          },
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#6b7280",
          tension: 0.3,
          order: 1,
        },
      ],
    };
  }, [payoffData]);

  // Chart Options
  const handleZoomIn = useCallback(() => {
    if (chartRef.current) chartRef.current.zoom(1.2);
  }, []);

  const handleResetZoom = useCallback(() => {
    if (chartRef.current) chartRef.current.resetZoom();
  }, []);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { left: 0, right: 0, top: 20, bottom: 0 },
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: customTooltip,
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "xy",
            modifierKey: "shift",
          },
          zoom: {
            wheel: {
              enabled: true,
              modifierKey: "ctrl",
            },
            drag: {
              enabled: true,
              modifierKey: "alt",
            },
            pinch: { enabled: true },
            mode: "xy",
          },
        },
        annotation: {
          clip: false,
          annotations: {
            ...(currentSpot
              ? {
                  spotLine: {
                    type: "line",
                    xMin: currentSpot,
                    xMax: currentSpot,
                    borderColor: "#e4ad43",
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    label: {
                      content: `MTM: ${metrics?.totalMtmText || "₹ 0"}  |  Spot: ₹ ${currentSpot.toLocaleString("en-IN")}`,
                      display: true,
                      position: "end",
                      backgroundColor: "transparent",
                      color: "#e9bc66",
                      font: { size: 11, weight: "bold" },
                      yAdjust: -30,
                    },
                  },
                }
              : {}),
            zeroLine: {
              type: "line",
              yMin: 0,
              yMax: 0,
              borderColor: "#808080",
              borderWidth: 1.5,
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          bounds: "data",
          grid: { color: "#f1f5f9" },
          ticks: {
            maxTicksLimit: 12,
            color: "#94a3b8",
            font: { size: 10 },
            callback: (value) => value.toLocaleString("en-IN"),
          },
        },
        y: {
          grid: { color: "#f1f5f9" },
          ticks: {
            color: "#94a3b8",
            font: { size: 10 },
            callback: (value) => `₹ ${value.toLocaleString("en-IN")}`,
          },
        },
      },
    }),
    [currentSpot, customTooltip, metrics],
  );

  // Cleanup tooltip on unmount
  useEffect(() => {
    return () => {
      const el = document.getElementById("chartjs-custom-tooltip");
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white relative border-l border-slate-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 p-1">
          <button 
            onClick={() => setActiveRightTab("payoff")}
            className={`px-4 py-1 rounded text-[13px] font-medium transition-colors ${activeRightTab === "payoff" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
          >
            Payoff
          </button>
          <button 
            onClick={() => setActiveRightTab("greeks")}
            className={`px-4 py-1 rounded text-[13px] font-medium transition-colors ${activeRightTab === "greeks" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
          >
            Greeks
          </button>
          <button 
            onClick={() => setActiveRightTab("activity")}
            className={`px-4 py-1 rounded text-[13px] font-medium transition-colors ${activeRightTab === "activity" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
          >
            Activity
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-[11px]">
            <span className="text-slate-500 font-medium">INDIAVIX</span>
            <span className="font-bold ml-2 text-slate-700">{vixClose}</span>
            <span className={`${vixColor} ml-2 font-medium`}>
              {vixChangeStr}
            </span>
          </div>
          <button className="flex items-center gap-1 text-[13px] text-blue-600 hover:text-blue-700 font-medium">
            <HelpCircle className="w-4 h-4" /> Help Center{" "}
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {positions && positions.length > 0 ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Metrics Header */}
          {activeRightTab !== "greeks" && (
            <div className="grid grid-cols-4 gap-4 p-5 pb-3 border-b border-slate-100 bg-white">
            <div>
              <div className="text-[11px] text-slate-500 mb-1 font-medium">
                Total MTM
              </div>
              <div
                className={`text-[13px] font-bold ${metrics?.totalMtmIsPositive !== false ? "text-emerald-600" : "text-red-600"}`}
              >
                {metrics?.totalMtmText || "₹ 0 (0%)"}
              </div>
              <div className="text-[11px] text-slate-500 mt-3 font-medium">
                POP
              </div>
              <div className="text-[13px] font-bold text-slate-800">
                {metrics?.pop}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1 font-medium">
                Max Profit
              </div>
              <div
                className={`text-[13px] font-bold ${metrics?.maxProfit?.isPositive !== false ? "text-emerald-600" : "text-red-600"}`}
              >
                {metrics?.maxProfit?.text}
              </div>
              <div className="text-[11px] text-slate-500 mt-3 font-medium">
                Risk/Reward
              </div>
              <div className="text-[13px] font-bold text-slate-800">
                {metrics?.riskReward}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1 font-medium">
                Max Loss
              </div>
              <div
                className={`text-[13px] font-bold ${metrics?.maxLoss?.isPositive ? "text-emerald-600" : "text-red-600"}`}
              >
                {metrics?.maxLoss?.text}
              </div>
              <div className="text-[11px] text-slate-500 mt-3 font-medium">
                Breakeven
              </div>
              <div className="text-[13px] font-bold text-slate-800">
                {metrics?.breakevens}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1 font-medium">
                Margin Approx
              </div>
              <div className="text-[13px] font-bold text-slate-800">
                {marginApprox}
              </div>
            </div>
          </div>
          )}

          {/* Tab Content Area */}
          {activeRightTab === "greeks" ? (
            <GreeksTab positions={positions} optionChainData={optionChainData} />
          ) : activeRightTab === "activity" ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <p>Activity logs will appear here</p>
            </div>
          ) : (
            <div className="flex-1 min-h-[380px] flex flex-col relative">
              {/* MTM + Spot label above chart */}
            <div className="flex items-center justify-between px-4 pt-2 pb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleZoomIn}
                  className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
                  title="Zoom In"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 px-2 pb-4 min-h-0">
              {chartData && (
                <Line 
                  key={`${currentSpot}-${currentTimestamp?.getTime()}-${positions?.length}`}
                  ref={chartRef} 
                  data={chartData} 
                  options={chartOptions} 
                />
              )}
            </div>
          </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <svg
            width="90"
            height="90"
            viewBox="0 0 90 90"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-6"
          >
            <rect
              x="18"
              y="15"
              width="22"
              height="60"
              rx="5"
              stroke="#0284c7"
              strokeWidth="5"
            />
            <rect
              x="50"
              y="15"
              width="22"
              height="28"
              rx="5"
              stroke="#0284c7"
              strokeWidth="5"
            />
            <rect
              x="50"
              y="52"
              width="22"
              height="23"
              rx="5"
              stroke="#0284c7"
              strokeWidth="5"
            />
          </svg>
          <div className="text-[17px] font-bold text-[#1e293b] mb-3">
            Analysis shows Payoff Graph, Statistics and more...
          </div>
          <div className="text-[15px] text-[#475569] text-center leading-[1.6]">
            Select trades from Option Chain or use a<br />
            Prebuilt strategy from Positions tab to see analysis
          </div>
        </div>
      )}
    </div>
  );
}
