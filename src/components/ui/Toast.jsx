import React, { useState, useEffect } from "react";

export const toast = {
  notify: (message, type = "info") => {
    const event = new CustomEvent("toast-message", { detail: { message, type } });
    window.dispatchEvent(event);
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { message, type } = e.detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000); // 5 seconds duration
    };

    window.addEventListener("toast-message", handleToast);
    return () => window.removeEventListener("toast-message", handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="bg-white border border-slate-200 shadow-xl rounded-md p-4 w-80 relative flex gap-3 shadow-slate-200/50">
          <button 
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex-1 text-sm text-slate-800 font-medium pt-1">
            {t.type === "stopLoss" && <div className="text-xs font-bold text-slate-900 mb-1">StopLoss alert</div>}
            {t.type === "target" && <div className="text-xs font-bold text-slate-900 mb-1">Target alert</div>}
            {t.type === "global" && <div className="text-xs font-bold text-slate-900 mb-1">Global alert</div>}
            
            {/* If it's a position alert, render the message which we pass as an object or just plain text */}
            {typeof t.message === "string" ? (
              <span className="text-slate-600">{t.message}</span>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className={`w-4 h-4 flex items-center justify-center rounded text-[8px] font-bold text-white ${t.message.isBuy ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {t.message.isBuy ? 'B' : 'S'}
                </div>
                <span className="font-semibold text-slate-700">{t.message.identifier}</span>
                <span className="text-slate-600 text-xs">price reached ₹ {t.message.value}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
