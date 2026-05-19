import { defineConfig } from "cypress";
import dotenv from "dotenv";
import path from "path";

// Load .env.local so MONGODB_URI is available in Cypress node tasks
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

export default defineConfig({
  /* ── E2E ──────────────────────────────────────────────────────── */
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    /*
     * Test isolation: each test gets a fresh browser context (cookies, localStorage, etc.).
     * Set to false if you intentionally chain state across tests in a describe block.
     */
    testIsolation: true,
    env: {
      /*
       * Override via cypress.env.json (git-ignored) or CLI --env flag.
       * These are only used for the programmatic-login custom command —
       * never put real credentials in version control.
       */
      TEST_USER_EMAIL: "customer@example.com",
      TEST_USER_PASSWORD: "TestPassword1",
      TEST_ADMIN_EMAIL: "admin@example.com",
      TEST_ADMIN_PASSWORD: "AdminPassword1",
    },
    setupNodeEvents(on) {
      on("before:browser:launch", (browser, launchOptions) => {
        // --no-sandbox / --disable-dev-shm-usage are Linux CI flags and crash
        // macOS ARM64 Electron. Only apply them on non-macOS platforms for
        // Chromium browsers (never Electron, which is Cypress's own shell).
        if (process.platform !== "darwin" && browser.family === "chromium" && browser.name !== "electron") {
          launchOptions.args.push("--no-sandbox");
          launchOptions.args.push("--disable-dev-shm-usage");
        }
        return launchOptions;
      });

      on("task", {
        /*
         * Upserts a test product directly in MongoDB by slug.
         * Used by tests that visit server-rendered product detail pages,
         * which fetch from the DB server-side (not via interceptable API calls).
         */
        async seedTestProduct(product: {
          slug: string; name: string; description: string; price: number;
          originalPrice?: number; images: string[]; category: string;
          brand: string; unit: string; inStock: boolean; rating: number;
          reviewCount: number;
        }) {
          const uri = process.env.MONGODB_URI;
          if (!uri) throw new Error("MONGODB_URI is not set — check .env.local");

          const mongoose = await import("mongoose");
          if (mongoose.default.connection.readyState === 0) {
            await mongoose.default.connect(uri);
          }

          const ProductModel =
            mongoose.default.models.Product ||
            mongoose.default.model(
              "Product",
              new mongoose.default.Schema({
                name:          { type: String, required: true },
                slug:          { type: String, required: true, unique: true, lowercase: true },
                description:   { type: String, required: true },
                price:         { type: Number, required: true },
                originalPrice: { type: Number },
                images:        [String],
                category:      { type: String, required: true },
                brand:         { type: String, required: true },
                unit:          { type: String, required: true },
                inStock:       { type: Boolean, default: true },
                rating:        { type: Number, default: 0 },
                reviewCount:   { type: Number, default: 0 },
                tags:          [String],
                badge:         { type: String, default: null },
                deliveryOptions: [String],
                vendorId:      { type: mongoose.default.Schema.Types.ObjectId, default: null },
                vendorName:    { type: String, default: null },
                status:        { type: String, default: "approved" },
                attributes:    { type: Map, of: String, default: {} },
              }, { timestamps: true })
            );

          await ProductModel.findOneAndUpdate(
            { slug: product.slug },
            { $set: { ...product, status: "approved" } },
            { upsert: true, new: true }
          );

          return null;
        },

        /*
         * Upserts the Cypress test customer account directly in MongoDB.
         * Called once before cart e2e tests so cy.loginByApi() can succeed
         * even on a fresh database.
         */
        async seedTestUser({ email, password, name, role = "customer" }: { email: string; password: string; name: string; role?: string }) {
          const uri = process.env.MONGODB_URI;
          if (!uri) throw new Error("MONGODB_URI is not set — check .env.local");

          const mongoose = await import("mongoose");
          const bcrypt   = await import("bcryptjs");

          if (mongoose.default.connection.readyState === 0) {
            await mongoose.default.connect(uri);
          }

          const UserModel =
            mongoose.default.models.User ||
            mongoose.default.model(
              "User",
              new mongoose.default.Schema({
                name:     { type: String, required: true },
                email:    { type: String, required: true, unique: true, lowercase: true },
                password: { type: String, required: true },
                role:     { type: String, default: "customer" },
                status:   { type: String, default: "active" },
              }, { timestamps: true })
            );

          const existing = await UserModel.findOne({ email });
          if (existing) {
            // Update role in case it changed (e.g., promoting a user to admin)
            await UserModel.findOneAndUpdate({ email }, { $set: { role } });
          } else {
            const hashed = await bcrypt.default.hash(password, 12);
            await UserModel.create({ name, email, password: hashed, role, status: "active" });
          }

          return null;
        },
      });
    },
  },

  /* ── Component ────────────────────────────────────────────────── */
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
    specPattern: "cypress/component/**/*.cy.tsx",
    supportFile: "cypress/support/component.ts",
    viewportWidth: 800,
    viewportHeight: 600,
    video: false,
  },
});
