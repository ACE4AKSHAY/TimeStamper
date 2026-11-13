export default [
  {
    ignores: ["node_modules/**", "benchmarks/private/**", "benchmarks/results/**", "dist/**", "cache/**"],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: {},
  },
];
