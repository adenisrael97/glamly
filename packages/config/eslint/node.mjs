import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Shared ESLint preset for Node/TypeScript packages (apps/api, future workers).
export default tseslint.config(
  { ignores: ["dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
