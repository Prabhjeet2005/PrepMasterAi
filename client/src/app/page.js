import Link from "next/link";
import { Mic, Code, BrainCircuit } from "lucide-react";

export default function Home() {
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
					Master your Technical Interview with the AI-powered
					voice interviewer. Real-time feedback, adaptive questions, and
					proctoring.
				</p>

				<div className="flex gap-4 justify-center mt-8">
					<Link href="/dashboard">
						<button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-lg transition-all flex items-center gap-2">
							<Mic size={20} /> Start Interview
						</button>
					</Link>

					<button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-lg transition-all border border-slate-700">
						View Demo
					</button>
				</div>
			</div>

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
						className="p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-purple-500 transition-colors">
						<div className="text-purple-400 mb-4">{feature.icon}</div>
						<h3 className="font-bold text-lg">{feature.title}</h3>
						<p className="text-slate-400 text-sm mt-2">{feature.desc}</p>
					</div>
				))}
			</div>
		</div>
	);
}
