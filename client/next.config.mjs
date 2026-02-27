import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactCompiler: true,

	webpack: (config, { isServer }) => {
		// 1. Point Webpack to our fake module
		config.resolve.alias = {
			...config.resolve.alias,
			"@mediapipe/hands": path.resolve(__dirname, "src/mock-mediapipe.js"),
		};

		// 2. Ignore Node native modules on the client
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				path: false,
				crypto: false,
			};
		}
		return config;
	},
};

export default nextConfig;
