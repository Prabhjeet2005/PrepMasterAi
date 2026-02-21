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
								) : submissions.length === 0 ? (
									<div className="flex flex-col justify-center items-center h-full text-slate-500">
										<Users size={48} className="mb-4 opacity-20" />
										<p>
											No candidates have submitted this assessment yet.
										</p>
									</div>
								) : (
									<div className="space-y-3">
										{submissions.map((sub, idx) => (
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
													<Link
														href={`/user-dashboard/assessment/${sub._id}`}
														className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 transition-colors"
														title="View Code Submission">
														<Eye size={18} />
													</Link>
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
