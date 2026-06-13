import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    fileParallelism: false, // tests share the test DB; run sequentially
    testTimeout: 20000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@crewstats/shared/fixtures": new URL("./packages/shared/fixtures/index.ts", import.meta.url).pathname,
      "@crewstats/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
      "@crewstats/stats": new URL("./packages/stats/src/index.ts", import.meta.url).pathname,
    },
  },
});
