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
	title: "PrepMaster AI",
	description: "AI Interview Platform",
};

export default function RootLayout({ children }) {
  return (
		<html lang="en">
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
