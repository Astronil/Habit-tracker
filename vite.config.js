import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Resolve the current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // Alias for src folder (for config files)
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"), // Main entry point
        login: path.resolve(__dirname, "login.html"), // Additional entry point
      },
      output: {
        entryFileNames: "assets/[name].js", // JS files in assets folder
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]", // CSS and other assets
      },
    },
    outDir: "dist", // Ensure all built files go to 'dist'
  },
});
