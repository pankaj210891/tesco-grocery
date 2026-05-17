import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/*
 * Vite config — used exclusively by Cypress component testing.
 * The Next.js application itself continues to use Turbopack/Webpack.
 *
 * Switching from `framework: "next" + bundler: "webpack"` to
 * `framework: "react" + bundler: "vite"` because Cypress 13's bundled
 * @cypress/webpack-dev-server calls webpackModule.init() which was
 * removed in Next.js 16's internal webpack module.
 *
 * All component tests (ThemeToggle, Button, Badge) are plain React
 * components with no Next.js-specific imports, so this is a clean swap.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      /* Mirror the @/* path alias from tsconfig.json */
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
