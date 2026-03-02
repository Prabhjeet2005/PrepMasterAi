import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
	// The Title is the most important SEO factor. Put your main keywords here.
	title: "PrepMaster AI | Elite Interview Preparation & Proctoring",

	description:
		"Prepare for your dream job with PrepMaster AI. Offering cutting-edge AI mock interviews, secure proctoring, and real-time coding assessments to help you ace your next technical interview.",

	// These keywords tell search algorithms exactly how to index you
	keywords: [
		"prepare",
		"ai",
		"prepare ai",
		"mock interview ai",
		"ai interview preparation",
		"coding assessment",
		"proctoring software",
		"tech interview prep",
		"FAANG preparation",
		"PrepMaster",
	],
	authors: [{ name: "Prabhjeet Singh Sandhu" }],

	// Open Graph makes your link look beautiful when shared on LinkedIn or WhatsApp
	openGraph: {
		title: "PrepMaster AI | Elite Interview Preparation",
		description:
			"Prepare for your dream job with cutting-edge AI mock interviews and secure proctoring.",
		url: "https://prep-master-ai-client.vercel.app", // ⚠️ Change this to your actual Vercel/live URL!
		siteName: "PrepMaster AI",
		images: [
			{
				url: "https://prep-master-ai-client.vercel.app/og-image.png", // ⚠️ Drop a cool screenshot of your app into your client/public folder and name it og-image.png
				width: 1200,
				height: 630,
				alt: "PrepMaster AI Dashboard",
			},
		],
		locale: "en_US",
		type: "website",
	},

	// Twitter Cards for social sharing
	twitter: {
		card: "summary_large_image",
		title: "PrepMaster AI | Elite Interview Preparation",
		description:
			"Prepare for your dream job with cutting-edge AI mock interviews and secure proctoring.",
		images: [
			"https://prep-master-ai-client.vercel.app/og-image.png",
		], // ⚠️ Change this too
	},

	// This explicitly invites Google's web crawlers to scan your site
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
};

export default function RootLayout({ children }) {
  return (
		<html lang="en">
			<head>
				<meta
					name="google-site-verification"
					content="5RQkL0Et9vuWBf8Mx381GPbyIL5ygdOst3oRQ-rBZLc"
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<AuthContextProvider>
					{/* Flex container to place Sidebar and Main Content side-by-side */}
					<div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-slate-950">
						<Sidebar />
						<Toaster
							position="top-center"
							toastOptions={{
								duration: 4000,
								style: {
									background: "#1e293b",
									color: "#fff",
									border: "1px solid #334155",
								},
							}}
						/>

						{/* Main content area takes remaining space and handles its own scrolling */}
						<main className="flex-1 overflow-y-auto relative bg-slate-950">
							{children}
						</main>
					</div>
				</AuthContextProvider>
			</body>
		</html>
	);
}
