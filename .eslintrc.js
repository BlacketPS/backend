module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module"
    },
    plugins: ["@typescript-eslint/eslint-plugin", "@stylistic"],
    extends: ["plugin:@typescript-eslint/recommended"],
    root: true,
    env: { node: true },
    ignorePatterns: [".eslintrc.js"],
    rules: {
        // TypeScript Rules
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "warn",

        // Blacket Rules
        "max-depth": "error",
        "prefer-spread": "off",
        "@stylistic/quotes": ["error", "double"],
        "@stylistic/arrow-parens": ["error", "always"],
        "@stylistic/arrow-spacing": "error",
        "@stylistic/block-spacing": "error",
        "@stylistic/brace-style": "error",
        "@stylistic/comma-dangle": ["error", "never"],
        "@stylistic/comma-spacing": ["error", { "before": false, "after": true }],
        "@stylistic/dot-location": ["error", "property"],
        "@stylistic/type-annotation-spacing": "error",
        "@stylistic/spaced-comment": ["error", "always"],
        "@stylistic/semi": ["error", "always"]
    }
}
