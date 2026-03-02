export default function sitemap() {
	const baseUrl = "https://prep-master-ai-client.vercel.app"; // ⚠️ Change this to your live URL!

	return [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1.0, // This is your main landing page, the highest priority (1.0)
		},
		{
			url: `${baseUrl}/login`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.8,
		},
		{
			url: `${baseUrl}/signup`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.8,
		},
		// If you ever add an "About Us" or "Features" page, add them here with a priority of 0.8 or 0.9!
	];
}