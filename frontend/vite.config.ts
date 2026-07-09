import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import istanbul from "vite-plugin-istanbul";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    istanbul({
      cypress: true,
      requireEnv: false,
      nycOutput: ".nyc_output",
      exclude: ["node_modules", "test", "coverage", ".nyc_output"],
    }),
  ],
});
