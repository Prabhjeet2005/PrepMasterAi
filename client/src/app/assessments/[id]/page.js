"use client";
import { useState, useEffect, useRef } from "react";
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
	Info,
	PanelLeftClose,
	PanelLeftOpen,
	FileText,
	Code2,
	GripVertical,
} from "lucide-react";

// --- C++ ONLY BOILERPLATE ---
const CPP_BOILERPLATE = `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Optimize standard I/O operations for performance
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your logic here...
    // Example: int n; cin >> n; 
    
    return 0;
}`;

export default function AssessmentEnvironment() {
	const { id } = useParams();
	const router = useRouter();
	const { authUser, isLoading: authLoading } = useAuthContext();

	const [assessment, setAssessment] = useState(null);
	const [loading, setLoading] = useState(true);

	const [timeLeft, setTimeLeft] = useState(0);
	const [activeTab, setActiveTab] = useState("mcq");
	const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
	const [mcqAnswers, setMcqAnswers] = useState({});

	const [code, setCode] = useState(CPP_BOILERPLATE);
	const [isCompiling, setIsCompiling] = useState(false);
	const [executionResults, setExecutionResults] = useState(null);

	// --- NEW UI STATES ---
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
	const [isDragging, setIsDragging] = useState(false);
	const splitContainerRef = useRef(null);

	// Fetch Assessment
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
				setTimeLeft(res.data.durationMinutes * 60);
			} catch (err) {
				console.error(err);
				router.push("/assessments");
			} finally {
				setLoading(false);
			}
		};

		if (id) fetchAssessment();
	}, [id, authUser, authLoading, router]);

	// Timer
	useEffect(() => {
		if (timeLeft <= 0 || loading) return;
		const timer = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					submitAssessment();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [timeLeft, loading]);

	// --- DRAG TO RESIZE LOGIC ---
	useEffect(() => {
		const handleMouseMove = (e) => {
			if (!isDragging || !splitContainerRef.current) return;
			const containerRect =
				splitContainerRef.current.getBoundingClientRect();
			// Calculate new percentage based on mouse X position relative to container
			const newLeftWidth =
				((e.clientX - containerRect.left) / containerRect.width) * 100;
			// Clamp the width between 20% and 80% so panels don't completely disappear
			if (newLeftWidth >= 20 && newLeftWidth <= 80) {
				setLeftPanelWidth(newLeftWidth);
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging]);

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
	};

	const runCode = async () => {
		setIsCompiling(true);
		setExecutionResults(null);

		try {
			const visibleTestCases = currentDsa.testCases;
			const res = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/execute`,
				{
					code,
					language: "cpp",
					testCases: visibleTestCases,
				},
				{ withCredentials: true },
			);

			setExecutionResults(res.data.results);
		} catch (error) {
			console.error("Compilation error:", error);
			setExecutionResults([
				{
					hasError: true,
					actualOutput: "Server error or compilation timeout.",
				},
			]);
		} finally {
			setIsCompiling(false);
		}
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
	const currentDsa = assessment.dsaQuestions[0];

	return (
		<div
			className={`h-[100dvh] bg-slate-950 text-white flex flex-col overflow-hidden ${isDragging ? "select-none cursor-col-resize" : ""}`}>
			{/* TOP NAVIGATION BAR */}
			<div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
				<div className="flex items-center gap-4">
					{/* COLLAPSE SIDEBAR TOGGLE */}
					<button
						onClick={() => setIsSidebarOpen(!isSidebarOpen)}
						className="text-slate-400 hover:text-white transition-colors"
						title="Toggle Sidebar">
						{isSidebarOpen ? (
							<PanelLeftClose size={24} />
						) : (
							<PanelLeftOpen size={24} />
						)}
					</button>
					<div className="font-bold text-base md:text-lg truncate max-w-xs md:max-w-md">
						{assessment.title}
					</div>
				</div>

				<div className="flex items-center gap-4 md:gap-6">
					<div
						className={`flex items-center gap-2 font-mono text-lg md:text-xl font-bold px-3 py-1.5 rounded-lg ${timeLeft < 300 ? "bg-red-900/50 text-red-400 border border-red-500/50 animate-pulse" : "bg-slate-800 text-blue-400"}`}>
						<Clock size={20} />
						{formatTime(timeLeft)}
					</div>
					<button
						onClick={submitAssessment}
						className="bg-green-600 hover:bg-green-500 text-white text-sm md:text-base font-bold py-2 px-4 md:px-6 rounded-lg transition-colors shadow-lg shadow-green-900/20">
						Submit Final
					</button>
				</div>
			</div>

			<div className="flex-1 flex overflow-hidden relative">
				{/* DYNAMIC LEFT SIDEBAR */}
				<div
					className={`${isSidebarOpen ? "w-64" : "w-16"} bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-10 transition-all duration-300 ease-in-out`}>
					<div
						className={`p-4 border-b border-slate-800 font-bold text-slate-400 uppercase text-xs tracking-wider flex items-center ${isSidebarOpen ? "justify-start" : "justify-center"}`}>
						{isSidebarOpen ? "Sections" : "..."}
					</div>

					<button
						onClick={() => setActiveTab("mcq")}
						title="Multiple Choice"
						className={`flex items-center p-4 font-bold transition-colors border-l-4 ${activeTab === "mcq" ? "bg-slate-800 border-blue-500 text-white" : "border-transparent text-slate-400 hover:bg-slate-800/50"} ${!isSidebarOpen && "justify-center"}`}>
						<FileText
							size={20}
							className={isSidebarOpen ? "mr-3" : "mr-0"}
						/>
						{isSidebarOpen && (
							<span className="truncate">
								MCQ ({assessment.mcqs?.length || 0})
							</span>
						)}
					</button>

					<button
						onClick={() => setActiveTab("dsa")}
						title="Coding Challenge"
						className={`flex items-center p-4 font-bold transition-colors border-l-4 ${activeTab === "dsa" ? "bg-slate-800 border-blue-500 text-white" : "border-transparent text-slate-400 hover:bg-slate-800/50"} ${!isSidebarOpen && "justify-center"}`}>
						<Code2 size={20} className={isSidebarOpen ? "mr-3" : "mr-0"} />
						{isSidebarOpen && (
							<span className="truncate">
								Coding ({assessment.dsaQuestions?.length || 0})
							</span>
						)}
					</button>
				</div>

				{/* MAIN CONTENT AREA */}
				<div className="flex-1 bg-slate-950 flex overflow-hidden relative">
					{/* OVERLAY TO FIX IFRAME DRAG CAPTURE */}
					{isDragging && (
						<div className="absolute inset-0 z-50 cursor-col-resize" />
					)}

					{/* MCQ SECTION (Centered) */}
					{activeTab === "mcq" && currentMcq && (
						<div className="w-full h-full overflow-y-auto custom-scrollbar">
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
											className={`w-full text-left p-4 rounded-xl border transition-all font-medium ${mcqAnswers[currentMcqIndex] === idx ? "bg-blue-600/20 border-blue-500 text-blue-100 ring-2 ring-blue-500/50" : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800"}`}>
											<span className="inline-block w-8 h-8 text-center leading-8 rounded-lg bg-slate-950 mr-4 font-bold border border-slate-700">
												{String.fromCharCode(65 + idx)}
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
											onClick={() =>
												setCurrentMcqIndex((prev) => prev + 1)
											}
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
						</div>
					)}

					{/* DSA SECTION (Resizable Splits) */}
					{activeTab === "dsa" && currentDsa && (
						<div
							ref={splitContainerRef}
							className="flex flex-1 w-full h-full overflow-hidden">
							{/* Problem Statement Panel */}
							<div
								style={{ width: `${leftPanelWidth}%` }}
								className="p-6 overflow-y-auto bg-slate-950 custom-scrollbar pb-32">
								<div className="flex items-center justify-between mb-6">
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

								{/* INPUT FORMAT BLOCK */}
								<div className="bg-blue-950/20 border border-blue-900/50 rounded-xl p-5 mb-8">
									<h3 className="text-blue-400 font-bold flex items-center gap-2 mb-2">
										<Info size={18} /> Input Format
									</h3>
									<p className="text-sm text-slate-300 whitespace-pre-wrap">
										{currentDsa.inputFormat ||
											"Read inputs from Standard Input (cin). Print to Standard Output (cout)."}
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
								{(currentDsa.testCases || []).map((tc, idx) => (
									<div
										key={idx}
										className="bg-slate-900 border border-slate-800 rounded-xl mb-4 overflow-hidden">
										<div className="bg-slate-800/50 px-4 py-2 border-b border-slate-800 font-bold text-xs text-slate-400 uppercase">
											Test Case {idx + 1}
										</div>
										<div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
											<div>
												<div className="text-xs text-slate-500 mb-1">
													Standard Input
												</div>
												<pre className="text-blue-300 font-mono text-sm whitespace-pre-wrap bg-black/30 p-2 rounded">
													{tc.input}
												</pre>
											</div>
											<div>
												<div className="text-xs text-slate-500 mb-1">
													Expected Output
												</div>
												<pre className="text-green-300 font-mono text-sm whitespace-pre-wrap bg-black/30 p-2 rounded">
													{tc.expectedOutput}
												</pre>
											</div>
										</div>
									</div>
								))}
							</div>

							{/* DRAGGABLE RESIZER HANDLE */}
							<div
								onMouseDown={(e) => {
									e.preventDefault();
									setIsDragging(true);
								}}
								className={`w-2 md:w-1.5 cursor-col-resize bg-slate-800 hover:bg-blue-500 flex flex-col justify-center items-center shrink-0 z-20 transition-colors ${isDragging ? "bg-blue-500" : ""}`}>
								<div className="bg-slate-950 p-0.5 rounded shadow-sm border border-slate-700">
									<GripVertical size={16} className="text-slate-400" />
								</div>
							</div>

							{/* Code Editor Panel */}
							<div
								style={{ width: `${100 - leftPanelWidth}%` }}
								className="flex flex-col bg-[#1e1e1e]">
								<div className="h-12 bg-slate-900 flex justify-between items-center px-4 border-b border-black shrink-0">
									<div className="text-sm font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded px-3 py-1">
										C++ (GCC)
									</div>

									<button
										onClick={runCode}
										disabled={isCompiling}
										className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-50">
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
										language="cpp"
										theme="vs-dark"
										value={code}
										onChange={(value) => setCode(value)}
										options={{
											minimap: { enabled: false },
											fontSize: 16,
											wordWrap: "on",
											padding: { top: 16 },
											scrollBeyondLastLine: false,
										}}
									/>
								</div>

								{/* Console Output Area */}
								<div className="h-48 md:h-64 bg-slate-950 border-t border-slate-800 p-4 overflow-y-auto shrink-0 font-mono text-sm custom-scrollbar">
									<div className="text-slate-500 mb-4 font-bold uppercase tracking-wider text-xs">
										Terminal Output
									</div>

									{!executionResults && !isCompiling && (
										<div className="text-slate-400">
											Click "Run Code" to compile and execute your solution
											against the visible test cases.
										</div>
									)}

									{isCompiling && (
										<div className="text-blue-400 flex items-center gap-2 animate-pulse">
											<Loader2 size={16} className="animate-spin" />{" "}
											Compiling and running on Wandbox server...
										</div>
									)}

									{executionResults && (
										<div className="space-y-4">
											{executionResults.map((result, idx) => (
												<div
													key={idx}
													className={`p-4 rounded-lg border ${result.passed ? "bg-green-950/20 border-green-900/50" : "bg-red-950/20 border-red-900/50"}`}>
													<div className="flex items-center gap-2 font-bold mb-2">
														{result.passed ? (
															<span className="text-green-400 flex items-center gap-1">
																✅ Test Case {idx + 1} Passed
															</span>
														) : (
															<span className="text-red-400 flex items-center gap-1">
																❌ Test Case {idx + 1} Failed
															</span>
														)}
													</div>

													<div className="grid grid-cols-1 gap-2 text-xs">
														<div>
															<span className="text-slate-500">
																Expected:
															</span>{" "}
															<span className="text-green-300 ml-2 whitespace-pre-wrap">
																{result.expectedOutput}
															</span>
														</div>
														<div>
															<span className="text-slate-500">
																Output:
															</span>
															<span
																className={
																	result.hasError
																		? "text-red-400 whitespace-pre-wrap ml-2"
																		: "text-slate-300 ml-2 whitespace-pre-wrap"
																}>
																{result.actualOutput ||
																	"No output generated"}
															</span>
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
