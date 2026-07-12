import js from "@eslint/js";
import globals from "globals";

export default [{
  files: ["**/*.js"],
  ignores: ["node_modules/**"],
  languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...globals.node, ...globals.jest } },
  rules: { ...js.configs.recommended.rules, "no-unused-vars": "off", "no-empty": "off" },
}];
