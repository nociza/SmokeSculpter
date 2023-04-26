import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: '',
  build: {
    emptyOutDir: true,
    outDir: "../docs/dist",
  },
  server: {
    host: "localhost",
    port: 3000,
  },
});
