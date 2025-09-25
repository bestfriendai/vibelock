module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  ignorePatterns: ["/dist/*", "rootStore.example.ts", "nativewind-env.d.ts"],
  rules: {
    "prettier/prettier": "error",
    "import/first": "off",
  },
  overrides: [
    {
      files: ["scripts/**/*.js", "*.config.js", "jest.setup.js", "functional-tests.js", "test-runner.js"],
      env: {
        node: true,
      },
    },
    {
      files: ["supabase/functions/**/*.ts"],
      rules: {
        "import/no-unresolved": "off",
        "import/extensions": "off",
      },
    },
  ],
};
