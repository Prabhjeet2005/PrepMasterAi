/** @type {import('next').NextConfig} */
const nextConfig = {
	/* config options here */
	reactCompiler: true,
	webpack: (config) => {
		// Tells Webpack to ignore the broken @mediapipe/hands module since we use the TFJS runtime
		config.resolve.alias = {
			...config.resolve.alias,
			"@mediapipe/hands": false,
		};
		return config;
	},
};

export default nextConfig;
