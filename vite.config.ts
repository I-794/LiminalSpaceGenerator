import { defineConfig } from "vite";
import { resolve } from "node:path";

// Multi-page build: `/` serves the marketing landing page (index.html),
// `/app` serves the generator (app.html). See vercel.json for the clean-URL rewrite.
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app.html"),
      },
    },
  },
});
