/** @type {import('next').NextConfig} */
const nextConfig = {
	reactCompiler: true,

	// 1. The Webpack rule for local development
	webpack: (config) => {
		config.resolve.alias = {
			...config.resolve.alias,
			"@mediapipe/hands": false,
		};
		return config;
	},

	// 2. The exact same rule translated for Turbopack (Vercel Production)
	experimental: {
		turbopack: {
			resolveAlias: {
				"@mediapipe/hands": false,
			},
		},
	},
};

export default nextConfig;
