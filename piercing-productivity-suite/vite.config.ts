import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    cors: true, // needed for local development
    port: 8585,
    strictPort: true,
    hmr: {
      clientPort: 8585,
    },
  },
});
