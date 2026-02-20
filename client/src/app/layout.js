import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

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
					<Navbar />

					<main className="min-h-screen bg-slate-950">{children}</main>
				</AuthContextProvider>
			</body>
		</html>
	);
}
