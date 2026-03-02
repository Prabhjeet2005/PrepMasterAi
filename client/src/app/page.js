"use client";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import {
	Mic,
	Code2,
	BrainCircuit,
	Smartphone,
	ShieldCheck,
	Terminal,
	Users,
	Activity,
	ChevronRight,
	Lock,
	Loader2,
} from "lucide-react";

export default function Home() {
	const { authUser, isLoading } = useAuthContext();

	const techStack = [
		"Next.js",
		"WebRTC",
		"Socket.io",
		"TensorFlow.js",
		"Node.js",
		"Gemini AI",
	];

	const features = [
		{
			title: "Dual-Device AI Proctoring",
			desc: "Synchronizes laptop and mobile cameras via WebRTC. Uses WebGL Edge AI (FaceAPI, CocoSSD) to detect multiple faces, missing hands, and forbidden objects.",
			icon: <Smartphone className="text-blue-400" size={28} />,
			border: "hover:border-blue-500/50",
			glow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
		},
		{
			title: "Voice-to-Voice AI Interviews",
			desc: "Dynamic, LLM-driven technical mock interviews featuring sub-second latency voice interactions powered by Gemini & Groq APIs.",
			icon: <Mic className="text-purple-400" size={28} />,
			border: "hover:border-purple-500/50",
			glow: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
		},
		{
			title: "Live Remote Code Execution",
			desc: "Integrated Monaco Editor with a secure backend execution engine for C++ algorithms, featuring automated test-case evaluation.",
			icon: <Terminal className="text-green-400" size={28} />,
			border: "hover:border-green-500/50",
			glow: "group-hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]",
		},
		{
			title: "Enterprise Zero-Trust Security",
			desc: "Strict browser lockdown, fullscreen API enforcement, and AES-encrypted JWT Role-Based Access Control (RBAC) separating Users and Recruiters.",
			icon: <Lock className="text-red-400" size={28} />,
			border: "hover:border-red-500/50",
			glow: "group-hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]",
		},
		{
			title: "Hardware-Accelerated Edge AI",
			desc: "Optimized GPU memory scopes and dynamic frame-rate capping to entirely eliminate iOS thermal throttling and Android memory leaks.",
			icon: <Activity className="text-yellow-400" size={28} />,
			border: "hover:border-yellow-500/50",
			glow: "group-hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]",
		},
		{
			title: "Comprehensive Audit Logs",
			desc: "Automated candidate scoring, real-time WebSocket anomaly detection, and base64 evidence-capture logging for recruiter review.",
			icon: <ShieldCheck className="text-emerald-400" size={28} />,
			border: "hover:border-emerald-500/50",
			glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
		},
	];

	return (
		<div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-hidden relative">
			{/* Background Ambient Glow */}
			<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
			<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none"></div>

			<div className="max-w-7xl mx-auto px-6 py-20 relative z-10 flex flex-col items-center">
				{/* Hero Section */}
				<div className="text-center max-w-4xl space-y-8 mt-10">
					<div className="flex justify-center mb-8">
						<div className="p-5 bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-pulse">
							<BrainCircuit size={56} className="text-blue-400" />
						</div>
					</div>

					<h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
						Enterprise-Grade <br />
						<span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
							Assessment Engine
						</span>
					</h1>

					<p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
						A highly secure, dual-device proctoring and AI mock interview
						platform built for technical excellence. Evaluates algorithms,
						tracks behavior, and eliminates anomalies.
					</p>

					{/* Tech Stack Pills */}
					<div className="flex flex-wrap justify-center gap-3 pt-4">
						{techStack.map((tech, i) => (
							<span
								key={i}
								className="px-4 py-1.5 text-sm font-bold bg-slate-900 border border-slate-700 text-slate-300 rounded-full shadow-sm">
								{tech}
							</span>
						))}
					</div>
				</div>

				{/* Action Section (Login/Dashboard) */}
				<div className="w-full max-w-2xl mt-16 mb-24">
					{isLoading ? (
						<div className="flex justify-center p-8">
							<Loader2 className="animate-spin text-blue-500" size={40} />
						</div>
					) : authUser ? (
						<div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl text-center transform transition-all">
							<h2 className="text-2xl font-bold mb-2">
								Welcome back, {authUser.name}
							</h2>
							<p className="text-slate-400 mb-8">
								Your secure session is active. Where would you like to go?
							</p>

							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								{authUser.role === "recruiter" ? (
									<Link href="/recruiter/dashboard" className="flex-1">
										<button className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
											<Users size={20} /> Recruiter Dashboard
										</button>
									</Link>
								) : (
									<>
										<Link href="/user-dashboard" className="flex-1">
											<button className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2">
												<Code2 size={20} /> My Assessments
											</button>
										</Link>
										<Link href="/new-interview" className="flex-1">
											<button className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20">
												<Mic size={20} /> AI Interview
											</button>
										</Link>
									</>
								)}
							</div>
						</div>
					) : (
						<div className="bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl border border-slate-700/50 shadow-2xl text-center">
							<h2 className="text-2xl md:text-3xl font-bold mb-4">
								Experience the Platform
							</h2>
							<p className="text-slate-400 mb-8 max-w-md mx-auto">
								Create an account to test the edge-AI proctoring, execute
								live code, or chat with the AI interviewer.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Link href="/login" className="flex-1 max-w-[200px]">
									<button className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20">
										Log In
									</button>
								</Link>
								<Link href="/signup" className="flex-1 max-w-[200px]">
									<button className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold rounded-xl transition-all">
										Create Account
									</button>
								</Link>
							</div>
						</div>
					)}
				</div>

				{/* System Architecture / Features Grid */}
				<div className="w-full">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold mb-4">
							System Architecture
						</h2>
						<p className="text-slate-500">
							Built to handle complex technical evaluations securely.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{features.map((feature, idx) => (
							<div
								key={idx}
								className={`group p-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl transition-all duration-300 ${feature.border} ${feature.glow} flex flex-col`}>
								<div className="mb-6 p-3 bg-slate-800/50 w-fit rounded-xl border border-slate-700">
									{feature.icon}
								</div>
								<h3 className="font-bold text-xl mb-3 text-slate-200 group-hover:text-white transition-colors">
									{feature.title}
								</h3>
								<p className="text-slate-400 leading-relaxed text-sm flex-1">
									{feature.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
