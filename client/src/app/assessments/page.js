"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	Loader2,
	Clock,
	Code,
	FileText,
	AlertCircle,
	CheckCircle2,
} from "lucide-react";

export default function AssessmentsListPage() {
	const { authUser, isLoading: authLoading } = useAuthContext();
	const router = useRouter();

	const [availableAssessments, setAvailableAssessments] = useState([]);
	const [completedAssessments, setCompletedAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!authLoading && !authUser) {
			router.push("/login");
			return;
		}

		const fetchData = async () => {
			try {
				// Fetch BOTH all active assessments and the user's history concurrently
				const [assessmentsRes, historyRes] = await Promise.all([
					axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/assessment`, {
						withCredentials: true,
					}),
					axios.get(
						`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/history`,
						{ withCredentials: true },
					),
				]);

				const allAssessments = assessmentsRes.data;
				const userHistory = historyRes.data;

				// Create an array of Assessment IDs the user has already submitted
				const completedIds = userHistory.map(
					(historyItem) => historyItem.assessmentId._id,
				);

				// ✅ TEMPORARY HACK: Disabled the filter so you can take tests infinitely during development!
				// const available = allAssessments.filter(a => !completedIds.includes(a._id));
				const available = allAssessments;

				setAvailableAssessments(available);
				setCompletedAssessments(userHistory);
			} catch (err) {
				console.error(err);
				setError("Failed to load assessments data.");
			} finally {
				setLoading(false);
			}
		};

		if (authUser) fetchData();
	}, [authUser, authLoading, router]);

	if (authLoading || loading) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="animate-spin text-blue-500" size={48} />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 overflow-y-auto">
			<div className="max-w-7xl mx-auto mt-8 space-y-16">
				{error && (
					<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl mb-8 flex items-center gap-3">
						<AlertCircle size={20} /> {error}
					</div>
				)}

				{/* TOP HALF: AVAILABLE ASSESSMENTS */}
				<div>
					<div className="mb-8 border-b border-slate-800 pb-4">
						<h1 className="text-3xl font-bold text-white mb-2">
							Available Assessments
						</h1>
						<p className="text-slate-400">
							Assessments pending your completion. You may only attempt
							these once.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{availableAssessments.map((assessment) => (
							<div
								key={assessment._id}
								className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col relative overflow-hidden group shadow-lg">
								<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
								<h3 className="text-xl font-bold mb-2 text-white">
									{assessment.title}
								</h3>
								<p className="text-slate-400 text-sm mb-6 line-clamp-2 flex-1">
									{assessment.description}
								</p>
								<div className="flex flex-wrap gap-3 mb-8">
									<div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg">
										<Clock size={14} className="text-blue-400" />{" "}
										{assessment.durationMinutes} Mins
									</div>
									<div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg">
										<FileText size={14} className="text-purple-400" />{" "}
										{assessment.mcqs?.length || 0} MCQs
									</div>
									<div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg">
										<Code size={14} className="text-green-400" />{" "}
										{assessment.dsaQuestions?.length || 0} DSA
									</div>
								</div>
								<Link
									href={`/assessments/${assessment._id}`}
									className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white transition-colors flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
									Enter Assessment
								</Link>
							</div>
						))}
						{availableAssessments.length === 0 && (
							<div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
								<CheckCircle2
									size={48}
									className="text-green-500 mb-4 opacity-50"
								/>
								<p className="text-slate-400 font-medium">
									You have completed all available assessments!
								</p>
							</div>
						)}
					</div>
				</div>

				{/* BOTTOM HALF: COMPLETED ASSESSMENTS */}
				<div>
					<div className="mb-8 border-b border-slate-800 pb-4">
						<h2 className="text-2xl font-bold text-slate-300 mb-2">
							Completed Assessments
						</h2>
						<p className="text-slate-500">
							Review your past scores and submissions.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{completedAssessments.map((history) => (
							<div
								key={history._id}
								className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
								<div>
									<h3 className="font-bold text-lg text-slate-200 mb-1">
										{history.assessmentId?.title || "Unknown Assessment"}
									</h3>
									<div className="text-sm text-slate-500 flex items-center gap-2">
										<Clock size={14} /> Submitted on{" "}
										{new Date(history.createdAt).toLocaleDateString()}
									</div>
								</div>
								<div className="flex items-center gap-6">
									<div className="text-right">
										<div className="text-xs font-bold text-slate-500 uppercase">
											Final Score
										</div>
										<div
											className={`font-black text-2xl ${history.totalScore > 0 ? "text-purple-400" : "text-slate-500"}`}>
											{history.totalScore?.toFixed(2) || 0}
										</div>
									</div>
									<Link
										href={`/user-dashboard/assessment/${history._id}`}
										className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors">
										View Details
									</Link>
								</div>
							</div>
						))}
						{completedAssessments.length === 0 && (
							<div className="col-span-full py-8 text-slate-600 text-center italic">
								You haven't completed any assessments yet.
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
