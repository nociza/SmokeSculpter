import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  build: {
    emptyOutDir: true,
    outDir: "../docs/dist",
  },
  server: {
    host: "localhost",
    port: 3000,
  },
});
