"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Clock, Code, FileText, AlertCircle } from "lucide-react";

export default function AssessmentsListPage() {
	const { authUser, isLoading: authLoading } = useAuthContext();
	const router = useRouter();

	const [assessments, setAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!authLoading && !authUser) {
			router.push("/login");
			return;
		}

		const fetchAssessments = async () => {
			try {
				const res = await axios.get(
					`${process.env.NEXT_PUBLIC_API_URL}/api/assessment`,
					{
						withCredentials: true,
					},
				);
				setAssessments(res.data);
			} catch (err) {
				console.error(err);
				setError("Failed to load assessments.");
			} finally {
				setLoading(false);
			}
		};

		if (authUser) fetchAssessments();
	}, [authUser, authLoading, router]);

	if (authLoading || loading) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="animate-spin text-blue-500" size={48} />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
			<div className="max-w-6xl mx-auto mt-8">
				<div className="mb-10">
					<h1 className="text-3xl font-bold text-white mb-2">
						Technical Assessments
					</h1>
					<p className="text-slate-400">
						Practice real-world Online Assessments (OAs) with strict
						proctoring.
					</p>
				</div>

				{error && (
					<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl mb-8 flex items-center gap-3">
						<AlertCircle size={20} />
						{error}
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{assessments.map((assessment) => (
						<div
							key={assessment._id}
							className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col relative overflow-hidden group">
							{/* Decorative Top Accent */}
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
								className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white transition-colors flex justify-center items-center gap-2">
								Enter Assessment
							</Link>
						</div>
					))}

					{assessments.length === 0 && !error && (
						<div className="col-span-full text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-2xl">
							No active assessments found.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
