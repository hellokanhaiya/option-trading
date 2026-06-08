import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function TokenPage() {
  const [csrfToken, setCsrfToken] = useState(localStorage.getItem('algotest_csrf') || '');
  const [cookieString, setCookieString] = useState(localStorage.getItem('algotest_cookie') || '');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('algotest_csrf', csrfToken);
    localStorage.setItem('algotest_cookie', cookieString);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Update API Credentials</h1>
          <p className="text-slate-500">Provide your AlgoTest session tokens to enable live data fetching via the proxy.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              CSRF Token (X-CSRF-TOKEN-ACCESS)
            </label>
            <input
              type="text"
              required
              value={csrfToken}
              onChange={(e) => setCsrfToken(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="e.g. 8484f619-d760-45f2-b32d-f1b04790c436"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Cookie String
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Open your browser's Developer Tools (F12) &gt; Network Tab. Inspect any request going to algotest.in, and copy the entire value of the "Cookie" header from the Request Headers section.
            </p>
            <textarea
              required
              rows={6}
              value={cookieString}
              onChange={(e) => setCookieString(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
              placeholder="Example: _fbp=fb.1.178...; _gcl_au=1.1.5...; access_token_cookie=eyJhbGci...; csrf_access_token=8484f...;"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-[#0082f4] hover:bg-blue-600 text-white font-medium shadow-sm transition-colors"
            >
              Save Credentials & Proceed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
