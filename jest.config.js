/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/"],
  modulePathIgnorePatterns: ["<rootDir>/.vercel/"],
  collectCoverageFrom: [
    "features/admin/schemas/import.ts",
    "features/practice/schemas/session.ts",
    "features/practice/services/exampleMasking/index.ts",
    "features/practice/services/exampleMasking/normalization.ts",
    "lib/db/schemas.ts",
    "lib/utils/random.ts",
    "lib/utils/strings.ts",
    "lib/rotation/selection.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
