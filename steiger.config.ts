import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/android/**",
      "**/ios/**",
      "**/backend/**",
      "**/build-*.apk",
      "**/*.apk",
      "**/*.aab",
      "**/*.md",
      "**/*.json",
      "**/*.proto",
    ],
  },
  {
    files: ["./src/**"],
    rules: {
      "fsd/ambiguous-slice-names": "error",
      "fsd/excessive-slicing": "error",
      "fsd/forbidden-imports": "error",
      "fsd/inconsistent-naming": "error",
      "fsd/insignificant-slice": "error",
      "fsd/no-layer-public-api": "error",
      "fsd/no-public-api-sidestep": "error",
      "fsd/no-reserved-folder-names": "error",
      "fsd/no-segmentless-slices": "error",
      "fsd/no-segments-on-sliced-layers": "error",
      "fsd/no-ui-in-app": "error",
      "fsd/public-api": "error",
      "fsd/repetitive-naming": "error",
      "fsd/segments-by-purpose": "error",
      "fsd/shared-lib-grouping": "error",
      "fsd/typo-in-layer-name": "error",
      "fsd/no-processes": "error",
      "fsd/no-cross-imports": "error",
      "fsd/no-higher-level-imports": "error",
    },
  },
]);
