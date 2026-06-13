import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load monorepo-root .env and force the test database for all suites.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, ".env") });
process.env.NODE_ENV = "test";
process.env.VITEST = "true";
