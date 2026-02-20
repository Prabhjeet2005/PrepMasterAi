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

	const [interviews, setInterviews] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!authLoading && !authUser) {
			router.push("/login");
			return;
		}

		const fetchDashboardData = async () => {
			try {
				const res = await axios.get(
					`${process.env.NEXT_PUBLIC_API_URL}/api/interview/user-dashboard`,
					{
						withCredentials: true,
					},
				);
				setInterviews(res.data);
			} catch (err) {
				console.error(err);
				setError("Failed to load your interview history.");
			} finally {
				setLoading(false);
			}
		};

		if (authUser) fetchDashboardData();
	}, [authUser, authLoading, router]);

	const handleDelete = async (id) => {
		// Confirm before deleting
		if (
			!window.confirm(
				"Are you sure you want to delete this interview record? This cannot be undone.",
			)
		)
			return;

		try {
			await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/api/interview/history/${id}`,
				{
					withCredentials: true,
				},
			);
			// Remove the deleted interview from the UI immediately
			setInterviews((prev) => prev.filter((inv) => inv._id !== id));
		} catch (err) {
			console.error("Failed to delete:", err);
			alert("Failed to delete interview. Please try again.");
		}
	};

	const formatDate = (dateString) => {
		const options = { year: "numeric", month: "short", day: "numeric" };
		return new Date(dateString).toLocaleDateString(undefined, options);
	};

	const chartData = [...interviews].reverse().map((inv, index) => ({
		name: `Int ${index + 1}`,
		date: formatDate(inv.createdAt),
		score: inv.feedback?.overallScore
			? (inv.feedback.overallScore).toFixed(1)
			: 0,
	}));

	const CustomTooltip = ({ active, payload }) => {
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

	// --- SKELETON LOADER ---
	if (authLoading || loading) {
		return (
			<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
				<div className="max-w-6xl mx-auto mt-8 space-y-8">
					<div className="h-12 w-64 bg-slate-900 animate-pulse rounded-lg"></div>
					<div className="h-64 w-full bg-slate-900 animate-pulse rounded-2xl"></div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-56 bg-slate-900 animate-pulse rounded-2xl"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
			<div className="max-w-6xl mx-auto mt-8">
				<div className="flex justify-between items-end mb-10">
					<div>
						<h1 className="text-3xl font-bold text-white mb-2">
							Your Dashboard
						</h1>
						<p className="text-slate-400">
							Track your progress and review past feedback.
						</p>
					</div>
					<Link
						href="/"
						className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl transition-colors">
						New Interview
					</Link>
				</div>

				{error && (
					<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl mb-8 flex items-center gap-3">
						<AlertCircle size={20} />
						{error}
					</div>
				)}

				{interviews.length === 0 ? (
					<div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
						<div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
							<TrendingUp size={32} className="text-slate-500" />
						</div>
						<h3 className="text-xl font-bold mb-2">No interviews yet!</h3>
						<p className="text-slate-400 mb-6 max-w-sm">
							You haven't completed any mock interviews. Upload your resume
							to start practicing.
						</p>
						<Link
							href="/"
							className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-xl transition-colors">
							Start First Interview
						</Link>
					</div>
				) : (
					<>
						{interviews.length >= 1 && (
							<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-lg">
								<h3 className="text-lg font-bold mb-6 flex items-center gap-2">
									<TrendingUp className="text-blue-400" size={20} />{" "}
									Performance History
								</h3>
								<div className="h-[300px] w-full">
									<ResponsiveContainer width="100%" height="100%">
										<LineChart
											data={chartData}
											margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
												content={<CustomTooltip />}
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
							{interviews.map((interview) => (
								<div
									key={interview._id}
									className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group flex flex-col relative">
									{/* NEW: DELETE BUTTON */}
									<button
										onClick={() => handleDelete(interview._id)}
										className="absolute top-4 right-4 text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors z-10"
										title="Delete Interview">
										<Trash2 size={18} />
									</button>

									<div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-6">
										<Calendar size={16} />
										{formatDate(interview.createdAt)}
									</div>

									<div
										className={`px-4 py-2 rounded-xl text-center font-black text-xl border mb-6 ${
											interview.feedback?.overallScore >= 8
												? "bg-green-900/30 text-green-400 border-green-500/30"
												: interview.feedback?.overallScore >= 5
													? "bg-yellow-900/30 text-yellow-400 border-yellow-500/30"
													: "bg-red-900/30 text-red-400 border-red-500/30"
										}`}>
										{interview.feedback?.overallScore || 0} / 10
									</div>

									<div className="space-y-3 mb-8 flex-1">
										<div className="flex justify-between text-sm">
											<span className="text-slate-400">Technical</span>
											<span className="font-bold text-slate-200">
												{interview.feedback?.technicalAccuracy || 0}/10
											</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-slate-400">Communication</span>
											<span className="font-bold text-slate-200">
												{interview.feedback?.communicationSkills || 0}/10
											</span>
										</div>
									</div>

									<Link
										href={`/user-dashboard/${interview._id}`}
										className="w-full py-3 bg-slate-800 group-hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-300 transition-colors flex justify-center items-center gap-2">
										View Detailed Feedback
										<ArrowRight size={16} />
									</Link>
								</div>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
