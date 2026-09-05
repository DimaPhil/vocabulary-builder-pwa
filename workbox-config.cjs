module.exports = {
  globDirectory: "dist",
  globPatterns: [
    "**/*.{css,html,ico,js,json,md,png,ttf,webmanifest,woff,woff2}",
  ],
  globIgnores: ["**/*.map", "sw.js"],
  swDest: "dist/sw.js",
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: false,
  inlineWorkboxRuntime: true,
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  navigateFallback: "/index.html",
};
