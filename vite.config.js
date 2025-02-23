import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Resolve the current directory using import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vite config example
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // Using the corrected __dirname
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"), // Entry point for index.html
        login: path.resolve(__dirname, "login.html"), // Entry point for login.html
      },
    },
  },
});
