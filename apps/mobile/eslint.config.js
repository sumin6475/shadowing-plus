// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Experimental react-compiler rules (newly enabled by eslint-config-expo@57).
      // They flag idiomatic patterns we use on purpose — load-on-mount data
      // fetching and time-based derived state (Date.now() for "due now") — so keep
      // them as warnings, visible but not build-blocking. Revisit if the rules
      // stabilize.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);
