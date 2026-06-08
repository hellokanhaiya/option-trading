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
          "X-CSRF-TOKEN-ACCESS": "a7fd6613-6294-4ec4-bf67-7748eb8f478e",
          Cookie:
            "_fbp=fb.1.1780360461687.611615819472955255; _gcl_au=1.1.508689937.1780360462; _gid=GA1.2.1973601546.1780501337; _clck=1rvn9ce%5E2%5Eg6m%5E0%5E2344; access_token_cookie=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc4MDU4MzM1MiwianRpIjoiMWI4YmI0NjgtZjU2NS00ZTFmLWEwMzUtYzUwZWQ1NDAwOTdiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjZhMWUyNTIzMGEwMjIzNTA2YWM3N2MzNCIsIm5iZiI6MTc4MDU4MzM1MiwiY3NyZiI6ImE3ZmQ2NjEzLTYyOTQtNGVjNC1iZjY3LTc3NDhlYjhmNDc4ZSIsImV4cCI6MTc4MDg0MjU1Mn0.1vGasNhXGKqaYOoyjoUkKt3CdisNyoc4NkE0O1clkFFhU4RVGo9_6Jj_VL8CMnuC-Bxu9DlhJCZp93JMm1RFvI2_OclHfWni7U7ujHC-_9oWcl0FIqSQ84rc6V34zMdo5FhOkjjM2Tku20lxn7lszxAobQ4jrhHIxNbuvFbQxHSIZw7PUqlPUBZddVCtfYoPkkKRULifp5ouoGqub2nHggV-BLIC4GSVU7txk6wdqcJ2fTual_v4mOuiSJGG7ywteAB5n9mxlB6YnJ4vBYxvKu0SXi9yF06Yqcpmc6E-OiXz08ZrC7fYpfnzQ59KRRO-bmKFo5w3otrGoIqUWObQV--baPE_A_kj_wFYo9xm9o3LOM585mCzqXl-nI0ZWxHXSROagslXSwx9mr5m982-Gi6wJJdkTxw1bRo5hlWvwkzCp1SZcMKUtQCbelG6TjgoVAXq6gTIpE_184q4D6nXxx6Bk589r-yqrQWgwqhD8WGX8_hW_Szjh_x6p_6ttOan; csrf_access_token=a7fd6613-6294-4ec4-bf67-7748eb8f478e; _ga_MS6Z4BR=GS2.1.s1780583343$o8$g1$t1780584065$j58$l0$h0; _ga=GA1.2.1773463973.1780360462; mp_f7c3d9535820295f2d256c66e7c13599_mixpanel=%7B%22distinct_id%22%3A%226a1e25230a0223506ac77c34%22%2C%22%24device_id%22%3A%22912c43d8-df8f-4330-b1a7-b1053fbb4980%22%2C%22%24initial_referrer%22%3A%22%24direct%22%2C%22%24initial_referring_domain%22%3A%22%24direct%22%2C%22__mps%22%3A%7B%7D%2C%22__mpso%22%3A%7B%7D%2C%22__mpus%22%3A%7B%7D%2C%22__mpa%22%3A%7B%7D%2C%22__mpu%22%3A%7B%7D%2C%22__mpr%22%3A%5B%5D%2C%22__mpap%22%3A%5B%5D%2C%22%24user_id%22%3A%226a1e25230a0223506ac77c34%22%7D; _uetsid=ccc9c7f05f6211f1b644df037312213e; _uetvid=ccdd04e05e1a11f199bee9c9264dbede; _ga_Y0EK98JRBT=GS2.1.s1780583344$o8$g1$t1780584125$j60$l0$h0",
        },
      },
      "/api/marginCalcAPI": {
        target: "https://api.algotest.in",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/marginCalcAPI/, "/marginCalcAPI"),
        headers: {
          "X-CSRF-TOKEN-ACCESS": "a7fd6613-6294-4ec4-bf67-7748eb8f478e",
          Cookie: "_fbp=fb.1.1780360461687.611615819472955255; _gcl_au=1.1.508689937.1780360462; _gid=GA1.2.1973601546.1780501337; access_token_cookie=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc4MDU4MzM1MiwianRpIjoiMWI4YmI0NjgtZjU2NS00ZTFmLWEwMzUtYzUwZWQ1NDAwOTdiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjZhMWUyNTIzMGEwMjIzNTA2YWM3N2MzNCIsIm5iZiI6MTc4MDU4MzM1MiwiY3NyZiI6ImE3ZmQ2NjEzLTYyOTQtNGVjNC1iZjY3LTc3NDhlYjhmNDc4ZSIsImV4cCI6MTc4MDg0MjU1Mn0.1vGasNhXGKqaYOoyjoUkKt3CdisNyoc4NkE0O1clkFFhU4RVGo9_6Jj_VL8CMnuC-Bxu9DlhJCZp93JMm1RFvI2_OclHfWni7U7ujHC-_9oWcl0FIqSQ84rc6V34zMdo5FhOkjjM2Tku20lxn7lszxAobQ4jrhHIxNbuvFbQxHSIZw7PUqlPUBZddVCtfYoPkkKRULifp5ouoGqub2nHggV-BLIC4GSVU7txk6wdqcJ2fTual_v4mOuiSJGG7ywteAB5n9mxlB6YnJ4vBYxvKu0SXi9yF06Yqcpmc6E-OiXz08ZrC7fYpfnzQ59KRRO-bmKFo5w3otrGoIqUWObQV--baPE_A_kj_wFYo9xm9o3LOM585mCzqXl-nI0ZWxHXSROagslXSwx9mr5m982-Gi6wJJdkTxw1bRo5hlWvwkzCp1SZcMKUtQCbelG6TjgoVAXq6gTIpE_184q4D6nXxx6Bk589r-yqrQWgwqhD8WGX8_hW_Szjh_x6p_6ttOan; csrf_access_token=a7fd6613-6294-4ec4-bf67-7748eb8f478e;",
        }
      },
    },
  },
});
