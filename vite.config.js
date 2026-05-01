import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },

      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    chunkSizeWarningLimit: 900,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router-dom")
          ) {
            return "vendor-react";
          }

          // Styled components
          if (id.includes("node_modules/styled-components")) {
            return "vendor-styled";
          }

          // Animation library
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }

          // Charts / analytics
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3")
          ) {
            return "vendor-charts";
          }

          // Axios
          if (id.includes("node_modules/axios")) {
            return "vendor-axios";
          }

          // Everything else from node_modules
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});