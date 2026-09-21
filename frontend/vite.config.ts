import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En local : http://localhost:4000. Dans Docker : surchargé par BACKEND_URL
// (voir docker-compose.yml) pour pointer vers le conteneur "backend".
const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // nécessaire pour être accessible depuis l'extérieur du conteneur Docker
    port: 5173,
    proxy: {
      "/api": backendUrl,
    },
  },
});
