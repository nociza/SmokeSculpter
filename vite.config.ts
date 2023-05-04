import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  root: "src",
  base: "",
  build: {
    emptyOutDir: true,
    outDir: "../docs/demo",
  },
  server: {
    host: "localhost",
    port: 3000,
  },
  plugins: [
    glsl({
      include: ["**/*.vert", "**/*.frag", "**/*.comp"],
    }),
  ],
});
