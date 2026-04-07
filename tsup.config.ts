import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    banner: {
      js: '#!/usr/bin/env -S node --disable-warning=DEP0040',
    },
  },
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
  },
]);
