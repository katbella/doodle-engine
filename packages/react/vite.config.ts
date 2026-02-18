import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: "react",
    },
    rollupOptions: {
      external: ["react", "react-dom", "@doodle-engine/core"],
    },
  },
  plugins: [
    react(),
    {
      name: "copy-css",
      closeBundle() {
        mkdirSync("dist", { recursive: true });
        copyFileSync("src/styles/shell.css", "dist/shell.css");
      },
    },
  ],
});
