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
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            const customCookie = req.headers["x-algotest-cookie"];
            const customCsrf = req.headers["x-algotest-csrf"];

            if (customCookie) {
              proxyReq.setHeader("Cookie", customCookie);
            } else {
              // Fallback to default if not provided (optional, for backwards compat)
              proxyReq.setHeader(
                "Cookie",
                "_fbp=fb.1.1780360461687.611615819472955255; _gcl_au=1.1.508689937.1780360462; _gid=GA1.2.1850912166.1780933350; _clck=1rvn9ce%5E2%5Eg6q%5E0%5E2344; access_token_cookie=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc4MDkzMzM2NCwianRpIjoiYzE2MTQyMTgtMTIyMS00OTU4LWEzMDctMTJmYmMxYzM3N2QxIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjZhMWUyNTIzMGEwMjIzNTA2YWM3N2MzNCIsIm5iZiI6MTc4MDkzMzM2NCwiY3NyZiI6Ijg0ODRmNjE5LWQ3NjAtNDVmMi1iMzJkLWYxYjA0NzkwYzQzNiIsImV4cCI6MTc4MTE5MjU2NH0.uo8zjbEupcMebpWeoSIWDd1CpWiF4QEnP09zTSLpbRt2qUjiMnHJHsI3Vhj0LXhPyzW2jkb-aATvMo6oSyXPUzzAcBnR5etOme8LP8F0TsR8528h9FCX11HEI2xtV2xfr79_NqEs2d2xrjUjIwOFi4N81zI9BF8uQPK6Sv7GWTfVg1SqbJhm4hszfWknveNG8iEPn1c4km1ZCbkL1RNIznKNLUJmp9oXc6xaVkHD-9Mz-Ia2Ymp-nNh5_zG5CUfd0hHjyhrkrs_BWISbvWtMSJM0JYhdmhB65SgGd0JP_kQM2sNnE2DZsZ_HlaFGrULyqdO8JRYwwjSlgZCxwFbtveYQqsg5ZX0EHJopTIdWYQ4KTB2UjwDHJFpnHhOFtVyN5adEu04McujmbmOdBvgw6xNiDiZuM3lNabFt7nrTpk3xUv_k9pHT3RpU0r8ui47_Pt7x0AJ9BtAbzQeYKP6248D5SN02mfpo6hH3eRiU5Ld4gNNLh5QUh1XvjcFBWfvx; csrf_access_token=8484f619-d760-45f2-b32d-f1b04790c436; mp_f7c3d9535820295f2d256c66e7c13599_mixpanel=%7B%22distinct_id%22%3A%226a1e25230a0223506ac77c34%22%2C%22%24device_id%22%3A%22912c43d8-df8f-4330-b1a7-b1053fbb4980%22%2C%22%24initial_referrer%22%3A%22%24direct%22%2C%22%24initial_referring_domain%22%3A%22%24direct%22%2C%22__mps%22%3A%7B%7D%2C%22__mpso%22%3A%7B%7D%2C%22__mpus%22%3A%7B%7D%2C%22__mpa%22%3A%7B%7D%2C%22__mpu%22%3A%7B%7D%2C%22__mpr%22%3A%5B%5D%2C%22__mpap%22%3A%5B%5D%2C%22%24user_id%22%3A%226a1e25230a0223506ac77c34%22%7D; _ga_MS6Z4BR=GS2.1.s1780933349$o17$g1$t1780934386$j59$l0$h0; _gat_UA-217422508-1=1; _uetsid=a8d7ee60635011f1a82c5b038591ca4b; _uetvid=ccdd04e05e1a11f199bee9c9264dbede; _ga=GA1.1.1773463973.1780360462; _clsk=10l2cnk%5E1780934388128%5E4%5E1%5Eq.clarity.ms%2Fcollect; _ga_Y0EK98JRBT=GS2.1.s1780933350$o18$g1$t1780934392$j53$l0$h0",
              );
            }

            if (customCsrf) {
              proxyReq.setHeader("X-CSRF-TOKEN-ACCESS", customCsrf);
            } else {
              proxyReq.setHeader(
                "X-CSRF-TOKEN-ACCESS",
                "8484f619-d760-45f2-b32d-f1b04790c436",
              );
            }
          });
        },
      },
      "/api/marginCalcAPI": {
        target: "https://api.algotest.in",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/marginCalcAPI/, "/marginCalcAPI"),
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            const customCookie = req.headers["x-algotest-cookie"];
            const customCsrf = req.headers["x-algotest-csrf"];

            if (customCookie) {
              proxyReq.setHeader("Cookie", customCookie);
            } else {
              proxyReq.setHeader(
                "Cookie",
                "_fbp=fb.1.1780360461687.611615819472955255; _gcl_au=1.1.508689937.1780360462; _gid=GA1.2.1973601546.1780501337; access_token_cookie=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc4MDU4MzM1MiwianRpIjoiMWI4YmI0NjgtZjU2NS00ZTFmLWEwMzUtYzUwZWQ1NDAwOTdiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjZhMWUyNTIzMGEwMjIzNTA2YWM3N2MzNCIsIm5iZiI6MTc4MDU4MzM1MiwiY3NyZiI6ImE3ZmQ2NjEzLTYyOTQtNGVjNC1iZjY3LTc3NDhlYjhmNDc4ZSIsImV4cCI6MTc4MDg0MjU1Mn0.1vGasNhXGKqaYOoyjoUkKt3CdisNyoc4NkE0O1clkFFhU4RVGo9_6Jj_VL8CMnuC-Bxu9DlhJCZp93JMm1RFvI2_OclHfWni7U7ujHC-_9oWcl0FIqSQ84rc6V34zMdo5FhOkjjM2Tku20lxn7lszxAobQ4jrhHIxNbuvFbQxHSIZw7PUqlPUBZddVCtfYoPkkKRULifp5ouoGqub2nHggV-BLIC4GSVU7txk6wdqcJ2fTual_v4mOuiSJGG7ywteAB5n9mxlB6YnJ4vBYxvKu0SXi9yF06Yqcpmc6E-OiXz08ZrC7fYpfnzQ59KRRO-bmKFo5w3otrGoIqUWObQV--baPE_A_kj_wFYo9xm9o3LOM585mCzqXl-nI0ZWxHXSROagslXSwx9mr5m982-Gi6wJJdkTxw1bRo5hlWvwkzCp1SZcMKUtQCbelG6TjgoVAXq6gTIpE_184q4D6nXxx6Bk589r-yqrQWgwqhD8WGX8_hW_Szjh_x6p_6ttOan; csrf_access_token=a7fd6613-6294-4ec4-bf67-7748eb8f478e;",
              );
            }

            if (customCsrf) {
              proxyReq.setHeader("X-CSRF-TOKEN-ACCESS", customCsrf);
            } else {
              proxyReq.setHeader(
                "X-CSRF-TOKEN-ACCESS",
                "a7fd6613-6294-4ec4-bf67-7748eb8f478e",
              );
            }
          });
        },
      },
    },
  },
});
