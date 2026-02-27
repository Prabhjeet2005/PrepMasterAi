"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import {
	Loader2,
	ArrowLeft,
	CheckCircle2,
	XCircle,
	Code2,
	EyeOff,
} from "lucide-react";
import Link from "next/link";
import Editor from "@monaco-editor/react";

export default function AssessmentResultDetail() {
	const { id } = useParams();
	const router = useRouter();
	const { authUser, isLoading: authLoading } = useAuthContext();
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authLoading && !authUser) return router.push("/login");

		const fetchResult = async () => {
			try {
				const res = await axios.get(
					`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/result/${id}`,
					{
						withCredentials: true,
					},
				);

				// DEBUGGING LOG: Check your Browser Console (F12) to see this!
				console.log("FETCHED RESULT FROM BACKEND:", res.data);

				setResult(res.data);
			} catch (err) {
				console.error(err);
				alert("Failed to load result.");
				router.push("/user-dashboard");
			} finally {
				setLoading(false);
			}
		};

		if (id) fetchResult();
	}, [id, authUser, authLoading, router]);

	if (loading || authLoading)
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="animate-spin text-blue-500" size={48} />
			</div>
		);
	if (!result) return null;

	const backLink =
		authUser?.role === "recruiter" || authUser?.role === "admin"
			? "/recruiter/dashboard"
			: "/user-dashboard";

	const codeToDisplay =
		result.submittedCode ||
		"// ERROR: No code was found in the database for this submission.";

	return (
		<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
			<div className="max-w-5xl mx-auto mt-4">
				<Link
					href={backLink}
					className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
					<ArrowLeft size={20} /> Back to Dashboard
				</Link>

				<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-slate-800 pb-6">
					<div className="mb-6">
						<h1 className="text-3xl font-bold mb-2">
							{result.assessmentId?.title || "Assessment Results"}
						</h1>
						<p className="text-slate-400">
							Candidate performance and submitted code.
						</p>
					</div>
					<div className="bg-slate-900 mb-6 border border-slate-800 px-6 py-4 rounded-xl text-center">
						<div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">
							Total Score
						</div>
						<div className="text-4xl font-black text-purple-400">
							{result.totalScore?.toFixed(2)}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					{/* Score Breakdown */}
					<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
						<h3 className="text-xl font-bold mb-6">Score Breakdown</h3>
						<div className="space-y-4">
							<div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800">
								<span className="font-bold text-slate-300">
									MCQ Section
								</span>
								<span className="text-xl font-bold">
									{result.mcqScore} Pts
								</span>
							</div>
							<div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800">
								<span className="font-bold text-slate-300">
									Coding Section
								</span>
								<span className="text-xl font-bold">
									{result.dsaScore?.toFixed(2)} Pts
								</span>
							</div>
						</div>
					</div>

					{/* Test Case Breakdown */}
					<div className="bg-slate-900 border mt-8 border-slate-800 rounded-2xl p-6 overflow-y-auto max-h-[300px] custom-scrollbar">
						<h3 className="text-xl font-bold  mb-6 flex items-center gap-2">
							Test Case Results
						</h3>
						<div className="space-y-3">
							{result.testCaseResults?.map((tc, idx) => (
								<div
									key={idx}
									className={`p-4 rounded-xl border flex items-center justify-between ${tc.passed ? "bg-green-950/20 border-green-900/50" : "bg-red-950/20 border-red-900/50"}`}>
									<div className="flex items-center gap-3">
										{tc.passed ? (
											<CheckCircle2 className="text-green-500" size={20} />
										) : (
											<XCircle className="text-red-500" size={20} />
										)}
										<span className="font-bold text-slate-200">
											Test Case {idx + 1}
										</span>
										{tc.isHidden && (
											<span className="flex items-center gap-1 text-xs font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded">
												<EyeOff size={12} /> Hidden
											</span>
										)}
									</div>
									<div
										className={
											tc.passed
												? "text-green-400 font-bold"
												: "text-red-400 font-bold"
										}>
										{tc.passed ? "Passed" : "Failed"}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Submitted Code  */}
				<div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-8 mb-12">
					<div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-900">
						<Code2 className="text-blue-400" size={20} />
						<h3 className="font-bold">Submitted Code</h3>
					</div>
					{/* Fixed Height absolute container */}
					<div className="h-[500px] w-full relative bg-[#1e1e1e]">
						<Editor
							height="500px"
							width="100%"
							language="cpp"
							theme="vs-dark"
							value={codeToDisplay}
							options={{
								readOnly: true,
								minimap: { enabled: false },
								fontSize: 16,
								scrollBeyondLastLine: false,
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
