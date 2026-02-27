"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
	Loader2,
	Briefcase,
	Users,
	Calendar,
	Trophy,
	ArrowRight,
	Eye,
	X,
	AlertTriangle,
	ShieldCheck,
	CheckCircle2,
	Code2,
	Camera,ExternalLink,Search,ListFilter
} from "lucide-react";
import Link from "next/link";

export default function RecruiterDashboard() {
	const { authUser, isLoading: authLoading } = useAuthContext();
	const router = useRouter();

	const [assessments, setAssessments] = useState([]);
	const [selectedOaId, setSelectedOaId] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submissionsLoading, setSubmissionsLoading] = useState(false);
	const [selectedSubmission, setSelectedSubmission] = useState(null);
	const [selectedEvidence, setSelectedEvidence] = useState(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("newest");

	useEffect(() => {
		if (!authLoading) {
			if (!authUser) router.push("/login");
			else if (authUser.role !== "recruiter" && authUser.role !== "admin")
				router.push("/user-dashboard");
			else fetchAssessments();
		}
	}, [authUser, authLoading, router]);

	const fetchAssessments = async () => {
		try {
			const res = await axios.get(
				`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/recruiter/my-oas`,
				{ withCredentials: true },
			);
			setAssessments(res.data);
			// If they have OAs, auto-select the first one to show submissions
			if (res.data.length > 0) {
				handleSelectOa(res.data[0]._id);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const processedSubmissions = submissions
		.filter((sub) => {
			const name = sub.userId?.name?.toLowerCase() || "";
			const email = sub.userId?.email?.toLowerCase() || "";
			const query = searchQuery.toLowerCase();
			return name.includes(query) || email.includes(query);
		})
		.sort((a, b) => {
			if (sortBy === "newest")
				return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
			if (sortBy === "oldest")
				return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
			if (sortBy === "score_high")
				return (b.totalScore || 0) - (a.totalScore || 0);
			if (sortBy === "score_low")
				return (a.totalScore || 0) - (b.totalScore || 0);
			return 0;
		});

	const handleSelectOa = async (oaId) => {
		setSelectedOaId(oaId);
		setSubmissionsLoading(true);
		try {
			const res = await axios.get(
				`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/recruiter/submissions/${oaId}`,
				{ withCredentials: true },
			);
			setSubmissions(res.data);
		} catch (err) {
			console.error("Failed to fetch submissions", err);
		} finally {
			setSubmissionsLoading(false);
		}
	};

	if (loading || authLoading)
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="animate-spin text-blue-500" size={48} />
			</div>
		);

	return (
		<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
			<div className="max-w-7xl mx-auto mt-4">
				<div className="mb-10 border-b border-slate-800 pb-6 flex justify-between items-end">
					<div className="mb-4">
						<h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
							<Briefcase className="text-blue-500" /> Recruiter Portal
						</h1>
						<p className="text-slate-400">
							Manage your Online Assessments and view candidate
							leaderboards.
						</p>
					</div>
					<Link
						href="/recruiter/create-oa"
						className="bg-blue-600 mb-4 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
						+ Create New OA
					</Link>
				</div>

				<div className="flex flex-col lg:flex-row gap-8">
					{/* LEFT COLUMN: List of OAs */}
					<div className="w-full lg:w-1/3 mr-4 mb-4 space-y-4">
						<h2 className="text-xl font-bold mb-4 text-slate-300">
							Your Active OAs
						</h2>
						{assessments.length === 0 ? (
							<div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center text-slate-500">
								You haven't created any assessments yet.
							</div>
						) : (
							assessments.map((oa) => (
								<button
									key={oa._id}
									onClick={() => handleSelectOa(oa._id)}
									className={`w-full text-left p-5 rounded-xl border transition-all ${selectedOaId === oa._id ? "bg-blue-900/20 border-blue-500 ring-1 ring-blue-500" : "bg-slate-900 border-slate-800 hover:border-slate-600"}`}>
									<h3 className="font-bold text-white mb-2 line-clamp-1">
										{oa.title}
									</h3>
									<div className="flex items-center justify-between text-xs text-slate-400 font-bold">
										<span className="flex items-center gap-1">
											<Calendar size={14} />{" "}
											{new Date(oa.createdAt).toLocaleDateString()}
										</span>
										<span className="flex items-center gap-1">
											<Clock size={14} /> {oa.durationMinutes}m
										</span>
									</div>
								</button>
							))
						)}
					</div>

					{/* RIGHT COLUMN: Candidate Leaderboard */}
					<div className="w-full lg:w-2/3">
						<div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-[600px] flex flex-col">
							<div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
								<h2 className="text-xl font-bold flex items-center gap-2">
									<Trophy className="text-yellow-500" /> Candidate
									Leaderboard
								</h2>
								<span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
									{submissions.length} Submissions
								</span>
							</div>

							<div className="flex-1 overflow-y-auto custom-scrollbar p-6">
								{/* ✅ NEW SEARCH & SORT UI */}
								<div className="flex flex-col md:flex-row gap-4 mb-6">
									<div className="relative flex-1">
										<Search
											className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
											size={18}
										/>
										<input
											type="text"
											placeholder="Search by candidate name or email..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
										/>
									</div>
									<div className="relative min-w-[180px]">
										<ListFilter
											className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
											size={18}
										/>
										<select
											value={sortBy}
											onChange={(e) => setSortBy(e.target.value)}
											className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-8 py-3 appearance-none focus:outline-none focus:border-blue-500 transition-colors cursor-pointer">
											<option value="newest">Latest Submissions</option>
											<option value="oldest">Oldest Submissions</option>
											<option value="score_high">Highest Score</option>
											<option value="score_low">Lowest Score</option>
										</select>
										<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
											▼
										</div>
									</div>
								</div>
								{submissionsLoading ? (
									<div className="flex justify-center items-center h-full">
										<Loader2
											className="animate-spin text-slate-500"
											size={32}
										/>
									</div>
								) : !selectedOaId ? (
									<div className="flex justify-center items-center h-full text-slate-500">
										Select an assessment to view submissions.
									</div>
								) : processedSubmissions.length === 0 ? (
									<div className="flex flex-col justify-center items-center h-full text-slate-500">
										<Users size={48} className="mb-4 opacity-20" />
										<p>
											No candidates have submitted this assessment yet.
										</p>
									</div>
								) : (
									<div className="space-y-3">
										{processedSubmissions.map((sub, idx) => (
											<div
												key={sub._id}
												className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
												<div className="flex items-center gap-4">
													<div className="w-8 text-center font-black text-slate-600">
														#{idx + 1}
													</div>
													<div>
														<div className="font-bold text-slate-200">
															{sub.userId?.name || "Unknown User"}
														</div>
														<div className="text-xs text-slate-500">
															{sub.userId?.email || "No Email"}
														</div>
													</div>
												</div>

												<div className="flex items-center gap-6">
													<div className="text-right">
														<div className="text-xs font-bold text-slate-500 uppercase">
															Score
														</div>
														<div className="font-black text-lg text-purple-400">
															{sub.totalScore?.toFixed(2)}
														</div>
													</div>
													{/* The Recruiter can click this to view the candidate's specific code using the page we just built! */}
													{/* <Link
														href={`/user-dashboard/assessment/${sub._id}`}
														className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 transition-colors"
														title="View Code Submission">
														<Eye size={18} />
													</Link> */}
													<button
														onClick={() => setSelectedSubmission(sub)}
														className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors shadow"
														title="View Full Submission">
														<Eye size={20} />
													</button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* CANDIDATE QUICK-VIEW MODAL */}
			{selectedSubmission && (
				<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
						{/* Modal Header */}
						<div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-3xl shrink-0">
							<div>
								<h2 className="text-2xl font-bold text-white flex items-center gap-3">
									{selectedSubmission.userId?.name || "Candidate"}
								</h2>
								<p className="text-slate-400 text-sm mt-1">
									Submission Quick View
								</p>
							</div>
							<button
								onClick={() => setSelectedSubmission(null)}
								className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors">
								<X size={24} />
							</button>
						</div>

						{/* Modal Body */}
						<div className="p-6 overflow-hidden flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Left Column: Summary & CTA */}
							<div className="lg:col-span-1 flex flex-col gap-6 border-r border-slate-800 pr-6">
								<div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center">
									<div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
										Total Score
									</div>
									<div className="text-5xl font-black text-purple-400 mb-6">
										{selectedSubmission.totalScore?.toFixed(2) || 0}
									</div>

									<div className="w-full border-t border-slate-800 pt-6">
										<div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
											Total Strikes
										</div>
										<div
											className={`text-4xl font-black ${selectedSubmission.warnings > 0 ? "text-red-500" : "text-green-500"}`}>
											{selectedSubmission.warnings || 0}
										</div>
									</div>
								</div>

								<Link
									href={`/user-dashboard/assessment/${selectedSubmission._id}`}
									className="mt-auto w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2">
									View Full Assessment <ExternalLink size={18} />
								</Link>
							</div>

							{/* Right Column: AI Proctoring Timeline */}
							<div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
								<h3 className="font-bold text-slate-300 flex items-center gap-2 mb-4 shrink-0">
									<ShieldCheck size={20} className="text-purple-400" /> AI
									Proctoring Timeline
								</h3>

								<div className="bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-y-auto custom-scrollbar flex-1 max-h-[320px]">
									{selectedSubmission.proctoringLogs?.length > 0 ? (
										<div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-700 before:via-slate-700 before:to-transparent">
											{selectedSubmission.proctoringLogs.map((log, i) => (
												<div
													key={i}
													className="relative flex items-start gap-4">
													<div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-950 bg-red-900 text-red-400 shadow shrink-0 z-10">
														<AlertTriangle size={16} />
													</div>
													<div className="flex-1 bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
														<div className="flex justify-between items-start mb-2">
															<div className="text-xs font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded">
																{new Date(
																	log.timestamp,
																).toLocaleTimeString([], {
																	hour: "2-digit",
																	minute: "2-digit",
																	second: "2-digit",
																})}
															</div>
															{log.evidence && (
																<button
																	onClick={() =>
																		setSelectedEvidence(log.evidence)
																	}
																	className="text-xs font-bold bg-blue-900/30 text-blue-400 border border-blue-900 hover:bg-blue-900/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
																	<Camera size={14} /> View Evidence
																</button>
															)}
														</div>
														<div className="text-sm font-medium text-red-300">
															{log.reason}
														</div>
													</div>
												</div>
											))}
										</div>
									) : (
										<div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-80">
											<div className="w-16 h-16 bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
												<CheckCircle2 size={32} />
											</div>
											<span className="font-bold text-green-400 text-lg">
												Clean Session
											</span>
											<p className="text-sm text-slate-500 mt-2">
												No suspicious activity detected.
											</p>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* EVIDENCE IMAGE OVERLAY */}
			{selectedEvidence && (
				<div
					className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
					onClick={() => setSelectedEvidence(null)}>
					<div
						className="relative max-w-5xl w-full flex flex-col items-center"
						onClick={(e) => e.stopPropagation()}>
						<button
							onClick={() => setSelectedEvidence(null)}
							className="absolute -top-12 right-0 p-2 bg-slate-800 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg">
							<X size={24} />
						</button>

						{/* ✅ FIX: Moved the badge outside the image as a clean header tab */}
						<div className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-t-xl shadow-lg flex items-center gap-2 self-start ml-4">
							<AlertTriangle size={16} /> AI Evidence Snapshot
						</div>

						<div className="border-4 border-slate-800 rounded-2xl rounded-tl-none overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black w-full">
							 <img
								src={selectedEvidence}
								alt="Violation Evidence"
								className="w-full h-auto max-h-[80vh] object-contain"
							/>
						</div>
					</div>
					<p className="text-slate-400 mt-6 text-sm">
						Click anywhere outside the image to close
					</p>
				</div>
			)}
		</div>
	);
}

// Just adding a quick Clock icon fallback since it wasn't imported from lucide
function Clock(props) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round">
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}
