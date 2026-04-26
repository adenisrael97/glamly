import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.js"],
    // NODE_ENV must be 'development' (not 'production') so that react-dom
    // and react-dom/test-utils route to their .development.js builds where
    // React.act is defined. Vitest defaults to 'test' but react-dom checks
    // explicitly for 'production' and falls back to the production bundle.
    env: {
      NODE_ENV: "development",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
