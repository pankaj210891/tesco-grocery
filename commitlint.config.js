/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allowed types
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "chore", "docs", "test", "perf", "ci", "revert"],
    ],
    // Scope is optional but when provided must be a known domain
    "scope-enum": [
      1, // warn (not error) so adding new scopes doesn't block
      "always",
      [
        "auth", "cart", "wishlist", "orders", "checkout",
        "products", "categories", "account", "db", "api",
        "ui", "store", "hooks", "types", "deps",
      ],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "header-max-length": [2, "always", 100],
  },
};
