import { config as loadEnv } from "dotenv";

// Load apps/api/.env (vitest runs with cwd = package root), then force the test
// environment AFTER, so it wins over the .env value. `config` validates against
// the "test" NODE_ENV and the rate limiters disable themselves under it.
loadEnv();
process.env.NODE_ENV = "test";
