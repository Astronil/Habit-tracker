import globals from "globals";
import pluginJs from "@eslint/js";
import jestPlugin from "eslint-plugin-jest"; // Import the Jest plugin

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        jest: true, // Jest globals
        describe: true, // Add Jest global `describe`
        beforeEach: true, // Add Jest global `beforeEach`
        test: true, // Add Jest global `test`
        expect: true, // Add Jest global `expect`
      },
    },
    settings: {
      jest: {
        version: "latest",
      },
    },
    plugins: {
      jest: jestPlugin, // Add the Jest plugin
    },
  },
  pluginJs.configs.recommended,
];
