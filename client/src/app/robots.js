export default function robots() {
	const baseUrl = "https://prep-master-ai-client.vercel.app"; // ⚠️ Change this to your live URL!

	return {
		rules: {
			userAgent: "*",
			// Allow Google to scan your public marketing pages
			allow: ["/", "/login", "/signup"],

			// STRICTLY BLOCK Google from crawling private dashboards, test rooms, and mobile pairing links
			disallow: [
				"/user-dashboard/",
				"/recruiter/",
				"/assessments/",
				"/mobile-proctor/",
				"/interview/",
			],
		},
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
