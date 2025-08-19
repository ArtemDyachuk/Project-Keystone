import baseConfig from "../../eslint.config.mjs";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Add any Firebase auth-specific ESLint rules here
    },
  },
];
