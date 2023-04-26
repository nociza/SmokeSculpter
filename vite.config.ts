import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../docs/dist",
  },
  server: {
    host: "localhost",
    port: 3000,
  },
});
