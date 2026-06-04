import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/algotest": {
        target: "https://prices.algotest.in",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/algotest/, ""),
        headers: {
          "X-CSRF-TOKEN-ACCESS": "48e269a7-bedb-400d-b8a3-ea3ba049d998",
          Cookie:
            "_fbp=fb.1.1780360461687.611615819472955255; _gcl_au=1.1.508689937.1780360462; _gid=GA1.2.1003987078.1780360462; _clck=1rvn9ce%5E2%5Eg6k%5E0%5E2344; access_token_cookie=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc4MDQxNDA1MSwianRpIjoiMmQ5NGNlZGItZTg4OS00NjExLThjOGYtMTBjYzZhNDhiNDNjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjZhMWUyNTIzMGEwMjIzNTA2YWM3N2MzNCIsIm5iZiI6MTc4MDQxNDA1MSwiY3NyZiI6IjQ4ZTI2OWE3LWJlZGItNDAwZC1iOGEzLWVhM2JhMDQ5ZDk5OCIsImV4cCI6MTc4MDY3MzI1MX0.PnKAOQmoSf4_CZhsKIi111YFKxgI6OUVutNPpD77OtXfGF-Gx7KOHj6HS59X2Bdotzk0R5bL0n0xyUwgbZDuCrT-tWsaNP4dlCicEvXUvB0zfajq42S43IJUkjhj3dTEgToWEyHJ85BgPcI24rpOpR_SWFXNt5oAzZwlV59L3KiTkbF3NnFV2KxHr4cpvPpaY2QUvaeO6RvJyccY1b9iAzSs-Tk2cnnglurbUDQQP3XFVL_F5wbN4dDgw7syyJncw6pdKBMH3EYpofWtI9Jw6cY1I3Icvpo_qjnl1V1IjXH6TZikksiwFkFvRAKeTY4l4EtJdO6DEDchmlQytiGtVZh_gEd3qmLGGJqr5fbz6Yzv97-0j9-OQ773AjvSNrwGmckNKe2r19dsLTLN0PQyeEpjK3wt88lom8T1giwVmfyrQt7ILLAdpDN_kpWlZatrfa0tm0ewc24ruDLL4zsdT255HvwVw7YmEAiGgegdVjQDh4FFQdNHmWbGzbLr0GiG; csrf_access_token=48e269a7-bedb-400d-b8a3-ea3ba049d998;",
        },
      },
    },
  },
});
