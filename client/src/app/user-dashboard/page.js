"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
	Loader2,
	Calendar,
	TrendingUp,
	AlertCircle,
	ArrowRight,
	Trash2,
	Code2,
	Video,
	ChevronLeft,
	ChevronRight,
	Eye,Download,FileText,X
} from "lucide-react";
import Link from "next/link";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";

export default function UserDashboardPage() {
	const { authUser, isLoading: authLoading } = useAuthContext();
	const router = useRouter();

	// --- UI STATES ---
	const [activeTab, setActiveTab] = useState("interviews"); // 'interviews' or 'assessments'
	const [interviewPage, setInterviewPage] = useState(1);
	const [assessmentPage, setAssessmentPage] = useState(1);
	const [selectedResumeUrl, setSelectedResumeUrl] = useState(null);
	const ITEMS_PER_PAGE = 6;

	// --- DATA STATES ---
	const [interviews, setInterviews] = useState([]);
	const [assessments, setAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!authLoading && !authUser) {
			router.push("/login");
			return;
		}

		const fetchDashboardData = async () => {
			try {
				const [interviewRes, assessmentRes] = await Promise.all([
					axios.get(
						`${process.env.NEXT_PUBLIC_API_URL}/api/interview/user-dashboard`,
						{ withCredentials: true },
					),
					axios.get(
						`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/history`,
						{ withCredentials: true },
					),
				]);

				setInterviews(interviewRes.data);
				setAssessments(assessmentRes.data);
			} catch (err) {
				console.error(err);
				setError("Failed to load your history.");
			} finally {
				setLoading(false);
			}
		};

		if (authUser) fetchDashboardData();
	}, [authUser, authLoading, router]);

	const handleDeleteInterview = async (id) => {
		if (
			!window.confirm(
				"Are you sure you want to delete this interview record? This cannot be undone.",
			)
		)
			return;
		try {
			await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/api/interview/history/${id}`,
				{ withCredentials: true },
			);
			setInterviews((prev) => {
				const updated = prev.filter((inv) => inv._id !== id);
				// Adjust pagination if the current page becomes empty
				if (
					updated.length > 0 &&
					Math.ceil(updated.length / ITEMS_PER_PAGE) < interviewPage
				) {
					setInterviewPage(Math.max(1, interviewPage - 1));
				}
				return updated;
			});
		} catch (err) {
			alert("Failed to delete interview.");
		}
	};

	const formatDate = (dateString) => {
		const options = { year: "numeric", month: "short", day: "numeric" };
		return new Date(dateString).toLocaleDateString(undefined, options);
	};

	// --- CHART DATA PREPARATION ---
	const interviewChartData = [...interviews]
		.reverse()
		.map((inv, index) => ({
			name: `Int ${index + 1}`,
			date: formatDate(inv.createdAt),
			score: inv.feedback?.overallScore
				? (inv.feedback.overallScore).toFixed(1)
				: 0,
		}));

	const assessmentChartData = [...assessments]
		.reverse()
		.map((ast, index) => ({
			name: `OA ${index + 1}`,
			date: formatDate(ast.createdAt),
			score: ast.totalScore ? ast.totalScore.toFixed(1) : 0,
		}));

	// --- PAGINATION LOGIC ---
	const totalInterviewPages = Math.ceil(
		interviews.length / ITEMS_PER_PAGE,
	);
	const paginatedInterviews = interviews.slice(
		(interviewPage - 1) * ITEMS_PER_PAGE,
		interviewPage * ITEMS_PER_PAGE,
	);

	const totalAssessmentPages = Math.ceil(
		assessments.length / ITEMS_PER_PAGE,
	);
	const paginatedAssessments = assessments.slice(
		(assessmentPage - 1) * ITEMS_PER_PAGE,
		assessmentPage * ITEMS_PER_PAGE,
	);

	// --- CUSTOM TOOLTIPS ---
	const InterviewTooltip = ({ active, payload }) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
					<p className="text-slate-300 text-sm mb-1">
						{payload[0].payload.date}
					</p>
					<p className="text-white font-bold text-lg">
						Score:{" "}
						<span className="text-blue-400">{payload[0].value} / 10</span>
					</p>
				</div>
			);
		}
		return null;
	};

	const AssessmentTooltip = ({ active, payload }) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
					<p className="text-slate-300 text-sm mb-1">
						{payload[0].payload.date}
					</p>
					<p className="text-white font-bold text-lg">
						Score:{" "}
						<span className="text-purple-400">{payload[0].value} Pts</span>
					</p>
				</div>
			);
		}
		return null;
	};

	if (authLoading || loading) {
		return (
			<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
				<div className="max-w-6xl mx-auto mt-8 space-y-8">
					<div className="flex justify-between">
						<div className="h-12 w-64 bg-slate-900 animate-pulse rounded-lg"></div>
						<div className="h-12 w-32 bg-slate-900 animate-pulse rounded-lg"></div>
					</div>
					<div className="h-64 w-full bg-slate-900 animate-pulse rounded-2xl"></div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="h-48 bg-slate-900 animate-pulse rounded-xl"></div>
						<div className="h-48 bg-slate-900 animate-pulse rounded-xl"></div>
						<div className="h-48 bg-slate-900 animate-pulse rounded-xl"></div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 print:bg-slate-950 print:text-white print:color-adjust-exact">
			<div className="max-w-6xl mx-auto mt-8">
				{/* HEADER & TABS */}
				<div className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6">
					<div>
						<h1 className="text-3xl font-bold text-white mb-2">
							Your Dashboard
						</h1>
						<p className="text-slate-400">
							Track your progress and review past feedback.
						</p>
					</div>

					<div className="flex flex-col xl:flex-row items-center gap-4 w-full lg:w-auto">
						{/* TAB TOGGLES */}
						<div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
							<button
								onClick={() => setActiveTab("interviews")}
								className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === "interviews" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
								<Video size={16} /> Mock Interviews
							</button>
							<button
								onClick={() => setActiveTab("assessments")}
								className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === "assessments" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
								<Code2 size={16} /> Coding OAs
							</button>
						</div>

						{/* RESTORED: DYNAMIC NEW ACTION BUTTON */}
						{activeTab === "interviews" ? (
							<Link
								href="/new-interview"
								className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-center shadow-lg shadow-blue-900/20 whitespace-nowrap">
								+ New Interview
							</Link>
						) : (
							<Link
								href="/assessments"
								className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-center shadow-lg shadow-purple-900/20 whitespace-nowrap">
								+ Browse OAs
							</Link>
						)}
					</div>
				</div>

				{error && (
					<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl mb-8 flex items-center gap-3">
						<AlertCircle size={20} /> {error}
					</div>
				)}

				{/* ===================================================================== */}
				{/* TAB 1: MOCK INTERVIEWS */}
				{/* ===================================================================== */}
				{activeTab === "interviews" && (
					<>
						{interviews.length === 0 ? (
							<div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
								<div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
									<TrendingUp size={32} className="text-slate-500" />
								</div>
								<h3 className="text-xl font-bold mb-2">
									No interviews yet!
								</h3>
								<p className="text-slate-400 mb-6 max-w-sm">
									You haven't completed any mock interviews. Upload your
									resume to start practicing.
								</p>
								<Link
									href="/"
									className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-colors">
									Start First Interview
								</Link>
							</div>
						) : (
							<>
								{interviews.length > 1 && (
									<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-lg">
										<h3 className="text-lg font-bold mb-6 flex items-center gap-2">
											<TrendingUp className="text-blue-400" size={20} />{" "}
											Performance History
										</h3>
										<div className="h-[300px] w-full">
											<ResponsiveContainer width="100%" height="100%">
												<LineChart
													data={interviewChartData}
													margin={{
														top: 5,
														right: 20,
														bottom: 5,
														left: 0,
													}}>
													<CartesianGrid
														strokeDasharray="3 3"
														stroke="#1e293b"
														vertical={false}
													/>
													<XAxis
														dataKey="name"
														stroke="#64748b"
														fontSize={12}
														tickLine={false}
														axisLine={false}
													/>
													<YAxis
														domain={[0, 10]}
														stroke="#64748b"
														fontSize={12}
														tickLine={false}
														axisLine={false}
													/>
													<Tooltip
														content={<InterviewTooltip />}
														cursor={{ stroke: "#334155", strokeWidth: 2 }}
													/>
													<Line
														type="monotone"
														dataKey="score"
														stroke="#3b82f6"
														strokeWidth={4}
														dot={{
															r: 6,
															fill: "#1e3a8a",
															stroke: "#3b82f6",
															strokeWidth: 2,
														}}
														activeDot={{
															r: 8,
															fill: "#60a5fa",
															stroke: "#fff",
															strokeWidth: 2,
														}}
													/>
												</LineChart>
											</ResponsiveContainer>
										</div>
									</div>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{paginatedInterviews.map((interview) => (
										<div
											key={interview._id}
											className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-slate-700 transition-all group flex flex-col h-full shadow-lg">
											{/* ✅ RESPONSIVE FIX: Flex header instead of absolute positioning */}
											<div className="flex flex-wrap-reverse justify-between items-start gap-3 mb-6">
												<div className="flex items-center gap-2 text-slate-400 text-sm font-medium mt-1">
													<Calendar size={16} className="shrink-0" />
													<span className="whitespace-nowrap">
														{formatDate(interview.createdAt)}
													</span>
												</div>

												<div className="flex items-center gap-2 self-end sm:self-auto ml-auto">
													{interview.resumeUrl && (
														<button
															onClick={() =>
																setSelectedResumeUrl(interview.resumeUrl)
															}
															className="flex items-center gap-1.5 text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-600/50 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg transition-all shadow-md whitespace-nowrap"
															title="View Original Resume PDF">
															<Eye size={14} />
															<span className="hidden sm:inline">
																View Resume
															</span>
															<span className="sm:hidden">Resume</span>
														</button>
													)}

													<button
														onClick={() =>
															handleDeleteInterview(interview._id)
														}
														className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-1.5 sm:p-2 rounded-lg transition-colors bg-slate-950 border border-slate-800 shrink-0"
														title="Delete Interview">
														<Trash2 size={16} />
													</button>
												</div>
											</div>

											<div
												className={`px-4 py-3 rounded-xl text-center font-black text-2xl border mb-6 shadow-inner ${interview.feedback?.overallScore >= 80 ? "bg-green-900/20 text-green-400 border-green-500/20" : interview.feedback?.overallScore >= 60 ? "bg-yellow-900/20 text-yellow-400 border-yellow-500/20" : "bg-red-900/20 text-red-400 border-red-500/20"}`}>
												{interview.feedback?.overallScore || 0}{" "}
												<span className="text-sm opacity-50 font-bold">
													/ 10
												</span>
											</div>

											<div className="space-y-3 mb-8 flex-1">
												<div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
													<span className="text-slate-400">
														Technical Accuracy
													</span>
													<span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md">
														{interview.feedback?.technicalAccuracy || 0}/10
													</span>
												</div>
												<div className="flex justify-between items-center text-sm">
													<span className="text-slate-400">
														Communication
													</span>
													<span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md">
														{interview.feedback?.communicationSkills || 0}
														/10
													</span>
												</div>
											</div>

											<Link
												href={`/user-dashboard/${interview._id}`}
												className="w-full p-4 bg-slate-800 group-hover:bg-blue-600 rounded-xl text-sm font-bold text-slate-300 group-hover:text-white transition-all flex justify-center items-center gap-2 shadow-md mt-auto">
												View Detailed Feedback <ArrowRight size={16} />
											</Link>
										</div>
									))}
								</div>

								{/* PAGINATION CONTROLS */}
								{totalInterviewPages > 1 && (
									<div className="flex justify-center items-center gap-4 mt-10">
										<button
											onClick={() =>
												setInterviewPage((p) => Math.max(1, p - 1))
											}
											disabled={interviewPage === 1}
											className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white transition-colors">
											<ChevronLeft size={20} />
										</button>
										<span className="text-slate-400 text-sm font-bold tracking-widest uppercase">
											Page {interviewPage} of {totalInterviewPages}
										</span>
										<button
											onClick={() =>
												setInterviewPage((p) =>
													Math.min(totalInterviewPages, p + 1),
												)
											}
											disabled={interviewPage === totalInterviewPages}
											className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white transition-colors">
											<ChevronRight size={20} />
										</button>
									</div>
								)}
							</>
						)}
					</>
				)}

				{/* ===================================================================== */}
				{/* TAB 2: CODING ASSESSMENTS */}
				{/* ===================================================================== */}
				{activeTab === "assessments" && (
					<>
						{assessments.length === 0 ? (
							<div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
								<div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
									<Code2 size={32} className="text-slate-500" />
								</div>
								<h3 className="text-xl font-bold mb-2">
									No assessments taken yet!
								</h3>
								<p className="text-slate-400 mb-6 max-w-sm">
									You haven't completed any Online Assessments. Go to the
									Assessments page to start one.
								</p>
								<Link
									href="/assessments"
									className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-colors">
									Browse Assessments
								</Link>
							</div>
						) : (
							<>
								{/* NEW: ASSESSMENT PROGRESS CHART */}
								{assessments.length > 1 && (
									<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-lg">
										<h3 className="text-lg font-bold mb-6 flex items-center gap-2">
											<TrendingUp className="text-purple-400" size={20} />{" "}
											Assessment Progress
										</h3>
										<div className="h-[300px] w-full">
											<ResponsiveContainer width="100%" height="100%">
												<LineChart
													data={assessmentChartData}
													margin={{
														top: 5,
														right: 20,
														bottom: 5,
														left: 0,
													}}>
													<CartesianGrid
														strokeDasharray="3 3"
														stroke="#1e293b"
														vertical={false}
													/>
													<XAxis
														dataKey="name"
														stroke="#64748b"
														fontSize={12}
														tickLine={false}
														axisLine={false}
													/>
													<YAxis
														stroke="#64748b"
														fontSize={12}
														tickLine={false}
														axisLine={false}
													/>
													<Tooltip
														content={<AssessmentTooltip />}
														cursor={{ stroke: "#334155", strokeWidth: 2 }}
													/>
													<Line
														type="monotone"
														dataKey="score"
														stroke="#a855f7"
														strokeWidth={4}
														dot={{
															r: 6,
															fill: "#3b0764",
															stroke: "#a855f7",
															strokeWidth: 2,
														}}
														activeDot={{
															r: 8,
															fill: "#d8b4fe",
															stroke: "#fff",
															strokeWidth: 2,
														}}
													/>
												</LineChart>
											</ResponsiveContainer>
										</div>
									</div>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{paginatedAssessments.map((result) => (
										<div
											key={result._id}
											className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-slate-700 transition-all group flex flex-col h-full shadow-lg">
											{/* ✅ RESPONSIVE FIX: Flex-wrap allows the score badge to drop below the date on tiny screens */}
											<div className="flex flex-wrap items-start justify-between gap-3 mb-5">
												<div className="flex items-center gap-2 text-slate-400 text-sm font-medium mt-1">
													<Calendar size={16} className="shrink-0" />
													<span className="whitespace-nowrap">
														{formatDate(result.createdAt)}
													</span>
												</div>
												<div className="text-xs font-bold bg-purple-900/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-full shrink-0 shadow-sm ml-auto sm:ml-0">
													Score: {result.totalScore?.toFixed(2)}
												</div>
											</div>

											<h3 className="text-lg font-bold text-white mb-6 line-clamp-2 min-h-[56px]">
												{result.assessmentId?.title ||
													"Deleted Assessment"}
											</h3>

											<div className="space-y-3 mb-8 flex-1">
												<div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
													<span className="text-slate-400">MCQ Score</span>
													<span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md">
														{result.mcqScore || 0}
													</span>
												</div>
												<div className="flex justify-between items-center text-sm">
													<span className="text-slate-400">DSA Score</span>
													<span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md">
														{result.dsaScore
															? result.dsaScore.toFixed(2)
															: 0}
													</span>
												</div>
											</div>

											<Link
												href={`/user-dashboard/assessment/${result._id}`}
												className="w-full py-3 sm:py-3.5 bg-slate-800 group-hover:bg-purple-600 rounded-xl text-sm font-bold text-slate-300 group-hover:text-white transition-all flex justify-center items-center gap-2 shadow-md mt-auto">
												View Code & Results <ArrowRight size={16} />
											</Link>
										</div>
									))}
								</div>

								{/* PAGINATION CONTROLS */}
								{totalAssessmentPages > 1 && (
									<div className="flex justify-center items-center gap-4 mt-10">
										<button
											onClick={() =>
												setAssessmentPage((p) => Math.max(1, p - 1))
											}
											disabled={assessmentPage === 1}
											className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white transition-colors">
											<ChevronLeft size={20} />
										</button>
										<span className="text-slate-400 text-sm font-bold tracking-widest uppercase">
											Page {assessmentPage} of {totalAssessmentPages}
										</span>
										<button
											onClick={() =>
												setAssessmentPage((p) =>
													Math.min(totalAssessmentPages, p + 1),
												)
											}
											disabled={assessmentPage === totalAssessmentPages}
											className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white transition-colors">
											<ChevronRight size={20} />
										</button>
									</div>
								)}
							</>
						)}
					</>
				)}
			</div>

			{/* ✅ NEW: RESUME PDF VIEWER MODAL */}
			{selectedResumeUrl && (
				<div
					className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8"
					onClick={() => setSelectedResumeUrl(null)}>
					<div
						className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden"
						onClick={(e) => e.stopPropagation()}>
						{/* Modal Header */}
						<div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 shrink-0">
							<div className="flex items-center gap-3 text-white font-bold text-lg md:text-xl">
								<div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30 text-blue-400">
									<FileText size={20} />
								</div>
								Candidate Resume Reference
							</div>
							<div className="flex items-center gap-3 md:gap-4">
								<a
									href={selectedResumeUrl}
									download="Candidate_Resume.pdf"
									className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-slate-700 shadow-md">
									<Download size={16} />{" "}
									<span className="hidden md:inline">Download</span>
								</a>
								<button
									onClick={() => setSelectedResumeUrl(null)}
									className="p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-colors border border-slate-700">
									<X size={20} />
								</button>
							</div>
						</div>

						{/* Modal Body - PDF Iframe */}
						<div className="flex-1 w-full h-full bg-slate-950/50 p-2 md:p-6">
							<div className="flex-1 w-full h-full bg-slate-950/50 p-2 md:p-6">
								<iframe
									src={`${selectedResumeUrl}#toolbar=0`}
									className="w-full h-full rounded-xl border border-slate-800 bg-white shadow-inner"
									title="Resume PDF Viewer"
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
