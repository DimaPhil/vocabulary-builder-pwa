import "tsx/cjs";

import type { ExpoConfig } from "expo/config";

module.exports = ({ config }: { config: ExpoConfig }) =>
  ({
    ...config,
    name: "Vocabulary Builder",
    slug: "vocabulary-builder-pwa",
    version: "0.1.0",
    platforms: ["web"],
    userInterfaceStyle: "light",
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true,
    },
  }) satisfies ExpoConfig;
