"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import Editor from "@monaco-editor/react";
import {
	Loader2,
	Clock,
	ChevronRight,
	ChevronLeft,
	Play,
	AlertTriangle,
} from "lucide-react";

export default function AssessmentEnvironment() {
	const { id } = useParams();
	const router = useRouter();
	const { authUser, isLoading: authLoading } = useAuthContext();

	const [assessment, setAssessment] = useState(null);
	const [loading, setLoading] = useState(true);

	// --- TEST STATES ---
	const [timeLeft, setTimeLeft] = useState(0);
	const [activeTab, setActiveTab] = useState("mcq"); // 'mcq' or 'dsa'
	const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
	const [mcqAnswers, setMcqAnswers] = useState({}); // { questionIndex: selectedOptionIndex }

	// --- CODE EDITOR STATES ---
	const [code, setCode] = useState("// Write your solution here...\n");
	const [language, setLanguage] = useState("javascript");
	const [isCompiling, setIsCompiling] = useState(false);

	// Fetch Assessment Data
	useEffect(() => {
		if (!authLoading && !authUser) return router.push("/login");

		const fetchAssessment = async () => {
			try {
				const res = await axios.get(
					`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/${id}`,
					{
						withCredentials: true,
					},
				);
			
				setAssessment(res.data);
				setTimeLeft(res.data.durationMinutes * 60); // Convert to seconds
				
			} catch (err) {
				console.error(err);
        router.push("/assessments")
			} finally {
				setLoading(false);
			}
		};

		if (id) fetchAssessment();
	}, [id, authUser, authLoading, router]);

	// Timer Logic
	useEffect(() => {
		if (timeLeft <= 0 || loading) return;

		const timer = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					submitAssessment(); // Auto-submit when time is up
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [timeLeft, loading]);

	const formatTime = (seconds) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	const handleMcqSelect = (optionIndex) => {
		setMcqAnswers((prev) => ({ ...prev, [currentMcqIndex]: optionIndex }));
	};

	const submitAssessment = () => {
		alert(
			"Time is up or you clicked submit! (Backend submission logic coming next)",
		);
		// We will build the actual evaluation API next!
	};

	const runCode = () => {
		setIsCompiling(true);
		// We will integrate Judge0 API here in the next step!
		setTimeout(() => {
			alert("Code execution engine (Judge0) will be connected here!");
			setIsCompiling(false);
		}, 1000);
	};

	if (loading || authLoading) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="animate-spin text-blue-500" size={48} />
			</div>
		);
	}

	if (!assessment) return null;

	const currentMcq = assessment.mcqs[currentMcqIndex];
	const currentDsa = assessment.dsaQuestions[0]; // Assuming 1 DSA question for now

	return (
		<div className="h-[100dvh] bg-slate-950 text-white flex flex-col overflow-hidden">
			{/* TOP NAVIGATION BAR */}
			<div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
				<div className="font-bold text-lg truncate max-w-md">
					{assessment.title}
				</div>

				<div className="flex items-center gap-6">
					{/* TIMER */}
					<div
						className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-lg ${timeLeft < 300 ? "bg-red-900/50 text-red-400 border border-red-500/50 animate-pulse" : "bg-slate-800 text-blue-400"}`}>
						<Clock size={20} />
						{formatTime(timeLeft)}
					</div>

					<button
						onClick={submitAssessment}
						className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
						Submit Final
					</button>
				</div>
			</div>

			{/* MAIN CONTENT AREA */}
			<div className="flex-1 flex overflow-hidden">
				{/* LEFT SIDEBAR - NAVIGATION */}
				<div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
					<div className="p-4 border-b border-slate-800 font-bold text-slate-400 uppercase text-xs tracking-wider">
						Assessment Sections
					</div>

					<button
						onClick={() => setActiveTab("mcq")}
						className={`p-4 text-left font-bold transition-colors border-l-4 ${activeTab === "mcq" ? "bg-slate-800 border-blue-500 text-white" : "border-transparent text-slate-400 hover:bg-slate-800/50"}`}>
						Multiple Choice ({assessment.mcqs?.length || 0})
					</button>

					<button
						onClick={() => setActiveTab("dsa")}
						className={`p-4 text-left font-bold transition-colors border-l-4 ${activeTab === "dsa" ? "bg-slate-800 border-blue-500 text-white" : "border-transparent text-slate-400 hover:bg-slate-800/50"}`}>
						Coding Challenge ({assessment.dsaQuestions?.length || 0})
					</button>
				</div>

				{/* RIGHT AREA - DYNAMIC CONTENT */}
				<div className="flex-1 bg-slate-950 overflow-y-auto">
					{/* --- MCQ SECTION --- */}
					{activeTab === "mcq" && currentMcq && (
						<div className="max-w-3xl mx-auto p-8 mt-8">
							<div className="flex justify-between items-center mb-8">
								<h2 className="text-2xl font-bold">
									Question {currentMcqIndex + 1} of{" "}
									{assessment.mcqs.length}
								</h2>
								<span className="text-slate-400 font-bold">
									{currentMcq.marks} Pts
								</span>
							</div>

							<p className="text-lg text-slate-200 mb-8 bg-slate-900 p-6 rounded-xl border border-slate-800">
								{currentMcq.question}
							</p>

							<div className="space-y-4 mb-12">
								{currentMcq.options.map((option, idx) => (
									<button
										key={idx}
										onClick={() => handleMcqSelect(idx)}
										className={`w-full text-left p-4 rounded-xl border transition-all font-medium ${
											mcqAnswers[currentMcqIndex] === idx
												? "bg-blue-600/20 border-blue-500 text-blue-100 ring-2 ring-blue-500/50"
												: "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
										}`}>
										<span className="inline-block w-8 h-8 text-center leading-8 rounded-lg bg-slate-950 mr-4 font-bold border border-slate-700">
											{String.fromCharCode(65 + idx)} {/* A, B, C, D */}
										</span>
										{option}
									</button>
								))}
							</div>

							<div className="flex justify-between">
								<button
									disabled={currentMcqIndex === 0}
									onClick={() => setCurrentMcqIndex((prev) => prev - 1)}
									className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold disabled:opacity-50">
									<ChevronLeft size={20} /> Previous
								</button>

								{currentMcqIndex < assessment.mcqs.length - 1 ? (
									<button
										onClick={() => setCurrentMcqIndex((prev) => prev + 1)}
										className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold">
										Next <ChevronRight size={20} />
									</button>
								) : (
									<button
										onClick={() => setActiveTab("dsa")}
										className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold">
										Move to Coding <ChevronRight size={20} />
									</button>
								)}
							</div>
						</div>
					)}

					{/* --- DSA CODING SECTION --- */}
					{activeTab === "dsa" && currentDsa && (
						<div className="flex h-full">
							{/* Problem Statement (Left Split) */}
							<div className="w-1/2 p-6 overflow-y-auto border-r border-slate-800 custom-scrollbar">
								<div className="flex items-center gap-3 mb-6">
									<h2 className="text-2xl font-bold">
										{currentDsa.title}
									</h2>
									<span
										className={`px-3 py-1 text-xs font-bold rounded-full border ${currentDsa.difficulty === "Easy" ? "bg-green-900/30 text-green-400 border-green-500/30" : "bg-yellow-900/30 text-yellow-400 border-yellow-500/30"}`}>
										{currentDsa.difficulty}
									</span>
								</div>

								<div className="prose prose-invert max-w-none mb-8">
									<p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
										{currentDsa.problemStatement}
									</p>
								</div>

								<h3 className="text-lg font-bold text-slate-400 mb-4 border-b border-slate-800 pb-2">
									Constraints:
								</h3>
								<pre className="bg-slate-900 p-4 rounded-xl text-slate-300 font-mono text-sm border border-slate-800 mb-8 whitespace-pre-wrap">
									{currentDsa.constraints}
								</pre>

								<h3 className="text-lg font-bold text-slate-400 mb-4 border-b border-slate-800 pb-2">
									Examples:
								</h3>
								{(currentDsa.testCases || [])
									.map((tc, idx) => (
										<div
											key={idx}
											className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4">
											<div className="mb-2">
												<span className="font-bold text-slate-500">
													Input:
												</span>{" "}
												<code className="text-blue-300">
													{tc.input.replace(/\n/g, " ")}
												</code>
											</div>
											<div>
												<span className="font-bold text-slate-500">
													Output:
												</span>{" "}
												<code className="text-green-300">
													{tc.expectedOutput}
												</code>
											</div>
										</div>
									))}
							</div>

							{/* Monaco Editor (Right Split) */}
							<div className="w-1/2 flex flex-col bg-[#1e1e1e]">
								<div className="h-12 bg-slate-900 flex justify-between items-center px-4 border-b border-black shrink-0">
									<select
										value={language}
										onChange={(e) => setLanguage(e.target.value)}
										className="bg-slate-800 text-sm font-bold text-slate-300 border border-slate-700 rounded px-3 py-1 outline-none">
										<option value="javascript">JavaScript</option>
										<option value="python">Python</option>
										<option value="cpp">C++</option>
										<option value="java">Java</option>
									</select>

									<button
										onClick={runCode}
										disabled={isCompiling}
										className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-50">
										{isCompiling ? (
											<Loader2 className="animate-spin" size={16} />
										) : (
											<Play size={16} />
										)}
										Run Code
									</button>
								</div>

								<div className="flex-1">
									<Editor
										height="100%"
										language={language}
										theme="vs-dark"
										value={code}
										onChange={(value) => setCode(value)}
										options={{
											minimap: { enabled: false },
											fontSize: 16,
											wordWrap: "on",
											padding: { top: 16 },
										}}
									/>
								</div>

								{/* Console Output Area (Placeholder for Judge0 results) */}
								<div className="h-48 bg-slate-950 border-t border-slate-800 p-4 overflow-y-auto shrink-0 font-mono text-sm">
									<div className="text-slate-500 mb-2 font-bold">
										Terminal Output:
									</div>
									<div className="text-slate-400">
										Click "Run Code" to compile and execute your solution
										against the visible test cases.
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
