import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
  },
  server: {
    host: "localhost",
    port: 3000,
  },
});
