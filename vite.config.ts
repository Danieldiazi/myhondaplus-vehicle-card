import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  define: {
    __CARD_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "MyHondaPlusVehicleCard",
      formats: ["es"],
      fileName: () => "myhondaplus-vehicle-card.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: "oxc",
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
});
