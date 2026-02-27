"use client";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import { Mic, Code, BrainCircuit } from "lucide-react";

export default function Home() {
	const { authUser, isLoading } = useAuthContext();
	return (
		<div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
			{/* Hero Section */}
			<div className="text-center max-w-2xl space-y-6">
				<div className="flex justify-center mb-6">
					<div className="p-4 bg-purple-600 rounded-full animate-pulse">
						<BrainCircuit size={64} />
					</div>
				</div>

				<h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
					PrepMaster AI
				</h1>

				<p className="text-xl text-slate-400">
					Master your Technical Interview with the AI-powered voice
					interviewer. Real-time feedback, adaptive questions, and
					proctoring.
				</p>

				{/* Stats / Features */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-4xl">
					{[
						{
							title: "Real-time Voice",
							icon: <Mic />,
							desc: "Talk naturally with Gemini/Groq AI",
						},
						{
							title: "Code Analysis",
							icon: <Code />,
							desc: "Get feedback on your technical accuracy",
						},
						{
							title: "Placement Ready",
							icon: <BrainCircuit />,
							desc: "Used by students to crack FAANG",
						},
					].map((feature, idx) => (
						<div
							key={idx}
							className="p-6 bg-slate-900 border flex flex-col items-center border-slate-800 rounded-lg hover:border-purple-500 transition-colors">
							<div className="text-purple-400 mb-4">{feature.icon}</div>
							<h3 className="font-bold text-lg">{feature.title}</h3>
							<p className="text-slate-400 text-sm mt-2">{feature.desc}</p>
						</div>
					))}
				</div>
			</div>

			<div className="max-w-4xl mx-auto p-8 mt-12">
				{/* 2. Conditionally render the features */}
				{isLoading ? (
					<div className="flex justify-center p-8">
						<span className="animate-pulse text-slate-500">
							Loading...
						</span>
					</div>
				) : authUser ? (
					// IF LOGGED IN: Show the actual app features
					<div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
						<h2 className="text-2xl text-center font-bold mb-4">
							Welcome, {authUser.name}!
						</h2>
						<div className="flex gap-4 justify-center mt-8">
							<Link href="/new-interview">
								<button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-lg transition-all flex items-center gap-2">
									<Mic size={20} /> Start Mock Ai Interview
								</button>
							</Link>

						</div>
					</div>
				) : (
					// IF LOGGED OUT: Show a prompt to log in
					<div className="bg-slate-900/50 p-12 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
						<h2 className="text-2xl font-bold mb-4">
							Ready to ace your next interview?
						</h2>
						<p className="text-slate-400 mb-8 max-w-md">
							Upload your resume and practice with our AI interviewer. Get
							real-time feedback and improve your communication skills.
						</p>
						<div className="flex gap-4">
							<Link
								href="/login"
								className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-colors">
								Log In to Start
							</Link>
							<Link
								href="/signup"
								className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-xl transition-colors">
								Create Account
							</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
