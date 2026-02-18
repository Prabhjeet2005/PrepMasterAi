"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

export default function FeedbackPage() {
	const router = useRouter();
	const [report, setReport] = useState(null);

	useEffect(() => {
		// Retrieve data passed from Interview Page
		const data = localStorage.getItem("latestFeedback");
		if (data) {
			setReport(JSON.parse(data));
		}
	}, []);

	if (!report)
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
				Loading Report...
			</div>
		);

	return (
		<div className="min-h-screen bg-slate-950 text-white p-8">
			<div className="max-w-3xl mx-auto space-y-8">
				{/* Header */}
				<div className="text-center space-y-2">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
						Interview Analysis
					</h1>
					<p className="text-slate-400">Here is how you performed.</p>
				</div>

				{/* Score Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<ScoreCard
						title="Overall Score"
						score={report.overallScore}
						color="blue"
					/>
					<ScoreCard
						title="Technical"
						score={report.technicalAccuracy}
						color="purple"
					/>
					<ScoreCard
						title="Communication"
						score={report.communicationSkills}
						color="green"
					/>
				</div>

				{/* Detailed Feedback */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
						<h3 className="flex items-center gap-2 font-bold text-green-400 mb-4">
							<CheckCircle size={20} /> Strengths
						</h3>
						<ul className="space-y-2">
							{report.strengths?.map((s, i) => (
								<li key={i} className="text-slate-300 text-sm">
									• {s}
								</li>
							))}
						</ul>
					</div>

					<div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
						<h3 className="flex items-center gap-2 font-bold text-amber-400 mb-4">
							<AlertTriangle size={20} /> Improvements
						</h3>
						<ul className="space-y-2">
							{report.weaknesses?.map((w, i) => (
								<li key={i} className="text-slate-300 text-sm">
									• {w}
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="flex justify-center pt-8">
					<button
						onClick={() => router.push("/")}
						className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 transition-all">
						Back to Home <ArrowRight size={18} />
					</button>
				</div>
			</div>
		</div>
	);
}

function ScoreCard({ title, score, color }) {
	const colors = {
		blue: "text-blue-400 border-blue-500/30",
		purple: "text-purple-400 border-purple-500/30",
		green: "text-green-400 border-green-500/30",
	};

	return (
		<div
			className={`bg-slate-900/50 p-6 rounded-2xl border ${colors[color]} flex flex-col items-center`}>
			<span className="text-slate-500 text-sm font-uppercase tracking-wider mb-2">
				{title}
			</span>
			<span
				className={`text-5xl font-bold ${colors[color].split(" ")[0]}`}>
				{score}/10
			</span>
		</div>
	);
}
