"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
	Loader2,
	ArrowLeft,
	CheckCircle,
	XCircle,
	Lightbulb,
	MessageSquare,
  Printer
} from "lucide-react";

export default function DetailedInterviewView() {
	const { id } = useParams();
	const router = useRouter();

	const [interview, setInterview] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const fetchInterviewDetails = async () => {
			try {
				const res = await axios.get(
					`${process.env.NEXT_PUBLIC_API_URL}/api/interview/history/${id}`,
					{
						withCredentials: true,
					},
				);
				setInterview(res.data);
			} catch (err) {
				console.error(err);
				setError(
					"Failed to load interview details. It may not exist or you don't have access.",
				);
			} finally {
				setLoading(false);
			}
		};

		if (id) fetchInterviewDetails();
	}, [id]);

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="animate-spin text-blue-500" size={48} />
			</div>
		);
	}

	if (error || !interview) {
		return (
			<div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center justify-center">
				<div className="bg-red-900/50 border border-red-500 text-red-200 p-6 rounded-xl max-w-md text-center">
					<p className="mb-4">{error}</p>
					<Link
						href="/user-dashboard"
						className="text-white font-bold underline">
						Return to Dashboard
					</Link>
				</div>
			</div>
		);
	}

	const { feedback, messages } = interview;

	// Filter out the system prompt so the user only sees the actual conversation
	const transcript = messages?.filter((m) => m.role !== "system") || [];

	return (
		<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 print:bg-slate-950 print:text-white print:color-adjust-exact">
			<div className="max-w-5xl mx-auto mt-4">
				<div className="flex justify-between items-center mb-2">
					<Link
						href="/user-dashboard"
						className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-medium">
						<ArrowLeft size={16} /> Back to Dashboard
					</Link>

					<button
						onClick={() => window.print()}
						className="flex hover:cursor-pointer items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
						<Printer size={16} /> Export PDF
					</button>
				</div>
				<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
					<div>
						<h1 className="text-3xl font-bold mb-2">Interview Analysis</h1>
						<p className="text-slate-400">
							Completed on{" "}
							{new Date(interview.createdAt).toLocaleDateString(
								undefined,
								{
									weekday: "long",
									year: "numeric",
									month: "long",
									day: "numeric",
								},
							)}
						</p>
					</div>
					<div className="text-right">
						<div className="text-5xl font-black text-blue-400">
							{feedback?.overallScore || 0}
							<span className="text-2xl text-slate-500">/10</span>
						</div>
						<div className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
							Overall Score
						</div>
					</div>
				</div>

				{/* SCORES ROW */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
					<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
						<div className="text-lg font-bold text-slate-300">
							Technical Accuracy
						</div>
						<div className="text-2xl font-black text-white">
							{feedback?.technicalAccuracy || 0}/10
						</div>
					</div>
					<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
						<div className="text-lg font-bold text-slate-300">
							Communication
						</div>
						<div className="text-2xl font-black text-white">
							{feedback?.communicationSkills || 0}/10
						</div>
					</div>
				</div>

				{/* FEEDBACK CARDS */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
					{/* Strengths */}
					<div className="bg-green-950/20 border border-green-900/50 rounded-2xl p-6">
						<h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
							<CheckCircle size={20} /> Top Strengths
						</h3>
						<ul className="space-y-3">
							{feedback?.strengths?.map((item, i) => (
								<li
									key={i}
									className="text-slate-300 text-sm flex items-start gap-2">
									<span className="text-green-500 mt-1">•</span> {item}
								</li>
							)) || (
								<li className="text-slate-500 text-sm">
									No strengths recorded.
								</li>
							)}
						</ul>
					</div>

					{/* Weaknesses */}
					<div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6">
						<h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
							<XCircle size={20} /> Areas to Improve
						</h3>
						<ul className="space-y-3">
							{feedback?.weaknesses?.map((item, i) => (
								<li
									key={i}
									className="text-slate-300 text-sm flex items-start gap-2">
									<span className="text-red-500 mt-1">•</span> {item}
								</li>
							)) || (
								<li className="text-slate-500 text-sm">
									No weaknesses recorded.
								</li>
							)}
						</ul>
					</div>

					{/* Tips */}
					<div className="bg-blue-950/20 border border-blue-900/50 rounded-2xl p-6">
						<h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
							<Lightbulb size={20} /> Expert Advice
						</h3>
						<p className="text-slate-300 text-sm leading-relaxed">
							{feedback?.improvementTips ||
								"Keep practicing to refine your answers!"}
						</p>
					</div>
				</div>

				{/* TRANSCRIPT */}
				<h2 className="text-2xl font-bold mb-6 flex items-center gap-3 border-t border-slate-800 pt-10">
					<MessageSquare size={24} className="text-blue-500" /> Full
					Transcript
				</h2>

				<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-10 space-y-6">
					{transcript.length === 0 ? (
						<p className="text-slate-500 text-center py-8">
							Transcript is not available for this session.
						</p>
					) : (
						transcript.map((msg, i) => (
							<div
								key={i}
								className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
								<span
									className={`text-xs font-bold uppercase tracking-wider mb-2 ${msg.role === "user" ? "text-slate-500" : "text-blue-500"}`}>
									{msg.role === "user" ? "You" : "AI Interviewer"}
								</span>
								<div
									className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm md:text-base leading-relaxed ${
										msg.role === "user"
											? "bg-slate-800 text-white rounded-tr-sm"
											: "bg-blue-900/30 border border-blue-500/30 text-blue-50 rounded-tl-sm"
									}`}>
									{msg.content}
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
