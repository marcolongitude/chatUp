module.exports = function (api) {
	api.cache(true);
	return {
		presets: [
			[
				"babel-preset-expo",
				{
					// seroval (TanStack Router) uses import.meta; Hermes needs this polyfill.
					unstable_transformImportMeta: true,
				},
			],
		],
		plugins: [
			[
				"module-resolver",
				{
					root: ["./"],
					alias: {
						"@/app/providers": "./src/app/providers",
						"@/app/config": "./src/app/config",
						"@": "./src",
						"~": "./",
					},
					extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
				},
			],
			[
				"babel-plugin-styled-components",
				{
					displayName: true,
					ssr: false,
				},
			],
		],
	};
};
