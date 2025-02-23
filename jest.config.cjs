module.exports = {
  transform: {
    "^.+\\.[t|j]sx?$": "babel-jest", // Ensure Babel is used to transpile JS/JSX files
  },
  moduleFileExtensions: ["js", "jsx", "json", "node"],
  testEnvironment: "jsdom",
};
