"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import {
	Loader2,
	Plus,
	Trash2,
	Save,
	Code2,
	ListTodo,
	Settings,
} from "lucide-react";

export default function CreateAssessmentPage() {
	const { authUser, isLoading: authLoading } = useAuthContext();
	const router = useRouter();

	const [isSubmitting, setIsSubmitting] = useState(false);

	// --- FORM STATES ---
	const [general, setGeneral] = useState({
		title: "",
		description: "",
		durationMinutes: 45,
	});

	const [mcqs, setMcqs] = useState([]);

	const initialDsaState = {
		title: "",
		problemStatement: "",
		inputFormat:
			"Line 1: An integer N (size of the array).\nLine 2: N space-separated integers.",
		constraints: "1 <= N <= 10^5",
		difficulty: "Medium",
		marks: 20,
		testCases: [{ input: "", expectedOutput: "", isHidden: false }],
	};

	const [dsaQuestions, setDsaQuestions] = useState([
		{ ...initialDsaState },
	]);

	// Security Check
	useEffect(() => {
		if (!authLoading) {
			if (!authUser) router.push("/login");
			else if (
				authUser.role !== "recruiter" &&
				authUser.role !== "admin"
			) {
				alert("Unauthorized. Only recruiters can access this page.");
				router.push("/user-dashboard");
			}
		}
	}, [authUser, authLoading, router]);

	// --- MCQ HANDLERS ---
	const addMcq = () => {
		setMcqs([
			...mcqs,
			{
				question: "",
				options: ["", "", "", ""],
				correctAnswerIndex: 0,
				marks: 5,
			},
		]);
	};

	const updateMcq = (index, field, value) => {
		const updated = [...mcqs];
		updated[index][field] = value;
		setMcqs(updated);
	};

	const updateMcqOption = (mcqIndex, optionIndex, value) => {
		const updated = [...mcqs];
		updated[mcqIndex].options[optionIndex] = value;
		setMcqs(updated);
	};

	const removeMcq = (index) => {
		setMcqs(mcqs.filter((_, i) => i !== index));
	};

	// --- DSA HANDLERS ---
	const addDsaQuestion = () => {
		setDsaQuestions([...dsaQuestions, { ...initialDsaState }]);
	};

	const removeDsaQuestion = (index) => {
		setDsaQuestions(dsaQuestions.filter((_, i) => i !== index));
	};

	const updateDsaQuestion = (index, field, value) => {
		const updated = [...dsaQuestions];
		updated[index][field] = value;
		setDsaQuestions(updated);
	};

	const addTestCase = (dsaIndex) => {
		const updated = [...dsaQuestions];
		updated[dsaIndex].testCases.push({
			input: "",
			expectedOutput: "",
			isHidden: true,
		});
		setDsaQuestions(updated);
	};

	const updateTestCase = (dsaIndex, tcIndex, field, value) => {
		const updated = [...dsaQuestions];
		updated[dsaIndex].testCases[tcIndex][field] = value;
		setDsaQuestions(updated);
	};

	const removeTestCase = (dsaIndex, tcIndex) => {
		const updated = [...dsaQuestions];
		updated[dsaIndex].testCases = updated[dsaIndex].testCases.filter(
			(_, i) => i !== tcIndex,
		);
		setDsaQuestions(updated);
	};

	// --- SUBMIT ---
	const handlePublish = async () => {
		if (!general.title || !general.description)
			return alert("Title and Description are required!");

		for (let i = 0; i < dsaQuestions.length; i++) {
			if (dsaQuestions[i].testCases.length === 0) {
				return alert(
					`Coding Challenge #${i + 1} must have at least one test case.`,
				);
			}
		}

		setIsSubmitting(true);
		try {
			const payload = {
				title: general.title,
				description: general.description,
				durationMinutes: general.durationMinutes,
				mcqs: mcqs,
				dsaQuestions: dsaQuestions,
			};

			await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/create`,
				payload,
				{
					withCredentials: true,
				},
			);

			alert("Assessment published successfully!");
			router.push("/assessments");
		} catch (error) {
			console.error("Publish failed", error);
			alert("Failed to publish assessment.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (authLoading || !authUser)
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="animate-spin text-blue-500" size={48} />
			</div>
		);

	return (
		<div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 overflow-y-auto">
			<div className="max-w-4xl mx-auto mt-4 pb-20">
				{/* HEADER (Button removed and moved to bottom) */}
				<div className="mb-8 border-b border-slate-800 pb-6">
					<h1 className="text-3xl font-bold mb-2">Create Assessment</h1>
					<p className="text-slate-400">Design a new OA for candidates.</p>
				</div>

				{/* 1. GENERAL SETTINGS */}
				<section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
					<h2 className="text-xl font-bold mb-6 flex items-center gap-2">
						<Settings className="text-blue-400" /> General Info
					</h2>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-bold text-slate-400 mb-1">
								Assessment Title
							</label>
							<input
								type="text"
								value={general.title}
								onChange={(e) =>
									setGeneral({ ...general, title: e.target.value })
								}
								className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
								placeholder="e.g., Software Engineer Intern - SDE 1"
							/>
						</div>
						<div>
							<label className="block text-sm font-bold text-slate-400 mb-1">
								Instructions / Description
							</label>
							<textarea
								value={general.description}
								onChange={(e) =>
									setGeneral({ ...general, description: e.target.value })
								}
								className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
								placeholder="Explain the rules..."
							/>
						</div>
						<div className="w-full md:w-1/3">
							<label className="block text-sm font-bold text-slate-400 mb-1">
								Duration (Minutes)
							</label>
							<input
								type="number"
								value={general.durationMinutes}
								onChange={(e) =>
									setGeneral({
										...general,
										durationMinutes: parseInt(e.target.value),
									})
								}
								className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
							/>
						</div>
					</div>
				</section>

				{/* 2. MCQ SECTION */}
				<section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
					<div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
						<h2 className="text-xl font-bold flex items-center gap-2">
							<ListTodo className="text-purple-400" /> Multiple Choice (
							{mcqs.length})
						</h2>
						<button
							onClick={addMcq}
							className="text-sm bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
							<Plus size={16} /> Add MCQ
						</button>
					</div>

					<div className="space-y-6">
						{mcqs.map((mcq, mIdx) => (
							<div
								key={mIdx}
								className="bg-slate-950 border border-slate-700 p-5 rounded-xl relative">
								<button
									onClick={() => removeMcq(mIdx)}
									className="absolute top-4 right-4 text-slate-500 hover:bg-red-900/40 hover:text-red-400 p-2 rounded-lg transition-colors"
									title="Delete MCQ">
									<Trash2 size={18} />
								</button>

								<input
									type="text"
									value={mcq.question}
									onChange={(e) =>
										updateMcq(mIdx, "question", e.target.value)
									}
									className="w-full pr-12 bg-transparent border-b border-slate-700 pb-2 mb-4 text-lg font-bold outline-none focus:border-purple-500"
									placeholder={`Question ${mIdx + 1}`}
								/>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
									{mcq.options.map((opt, oIdx) => (
										<div
											key={oIdx}
											className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-lg focus-within:border-purple-500 transition-colors">
											<input
												type="radio"
												name={`correct-${mIdx}`}
												checked={mcq.correctAnswerIndex === oIdx}
												onChange={() =>
													updateMcq(mIdx, "correctAnswerIndex", oIdx)
												}
												className="w-4 h-4 accent-purple-500 cursor-pointer"
											/>
											<input
												type="text"
												value={opt}
												onChange={(e) =>
													updateMcqOption(mIdx, oIdx, e.target.value)
												}
												className="bg-transparent w-full outline-none text-sm"
												placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
											/>
										</div>
									))}
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-slate-500 font-bold">
										Marks:
									</span>
									<input
										type="number"
										value={mcq.marks}
										onChange={(e) =>
											updateMcq(mIdx, "marks", parseInt(e.target.value))
										}
										className="w-16 bg-slate-900 border border-slate-800 rounded p-1 text-center text-sm outline-none focus:border-purple-500"
									/>
								</div>
							</div>
						))}
						{mcqs.length === 0 && (
							<div className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-800 rounded-xl">
								No Multiple Choice Questions added.
							</div>
						)}
					</div>
				</section>

				{/* 3. MULTIPLE DSA SECTION */}
				<section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
					<div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
						<h2 className="text-xl font-bold flex items-center gap-2">
							<Code2 className="text-green-400" /> Coding Challenges (
							{dsaQuestions.length})
						</h2>
						<button
							onClick={addDsaQuestion}
							className="text-sm bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
							<Plus size={16} /> Add DSA
						</button>
					</div>

					<div className="space-y-10">
						{dsaQuestions.map((dsa, dIdx) => (
							<div
								key={dIdx}
								className="bg-slate-950 border border-slate-700 p-5 md:p-6 rounded-xl relative">
								{/* REPOSITIONED: Delete Entire DSA Question Button */}
								{dsaQuestions.length > 1 && (
									<button
										onClick={() => removeDsaQuestion(dIdx)}
										className="absolute top-4 right-4 text-slate-500 hover:bg-red-900/40 hover:text-red-400 p-2 rounded-lg transition-colors"
										title="Delete MCQ">
										<Trash2 size={18} />
									</button>
								)}

								<div className="flex items-center gap-4 mb-6 pr-12">
									<div className="w-10 h-10 p-2 bg-green-900/20 border border-green-500/30 text-green-400 font-bold text-lg rounded-xl flex items-center justify-center shrink-0">
										Q{dIdx + 1}
									</div>
									<div className="flex-1">
										<input
											type="text"
											value={dsa.title}
											onChange={(e) =>
												updateDsaQuestion(dIdx, "title", e.target.value)
											}
											className="w-full bg-transparent border-b border-slate-700 pb-1 text-xl font-bold focus:border-green-500 outline-none placeholder:text-slate-600"
											placeholder="Problem Title (e.g., Two Sum)"
										/>
									</div>
								</div>

								<div className="space-y-4 mb-8">
									<div>
										<label className="block text-sm font-bold text-slate-400 mb-1">
											Problem Statement
										</label>
										<textarea
											value={dsa.problemStatement}
											onChange={(e) =>
												updateDsaQuestion(
													dIdx,
													"problemStatement",
													e.target.value,
												)
											}
											className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 focus:border-green-500 outline-none h-32 resize-none"
											placeholder="Describe the problem..."
										/>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-bold text-slate-400 mb-1">
												Input Format Guide
											</label>
											<textarea
												value={dsa.inputFormat}
												onChange={(e) =>
													updateDsaQuestion(
														dIdx,
														"inputFormat",
														e.target.value,
													)
												}
												className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-sm focus:border-green-500 outline-none h-24"
											/>
										</div>
										<div>
											<label className="block text-sm font-bold text-slate-400 mb-1">
												Constraints
											</label>
											<textarea
												value={dsa.constraints}
												onChange={(e) =>
													updateDsaQuestion(
														dIdx,
														"constraints",
														e.target.value,
													)
												}
												className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-sm focus:border-green-500 outline-none h-24"
											/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-bold text-slate-400 mb-1">
												Difficulty
											</label>
											<select
												value={dsa.difficulty}
												onChange={(e) =>
													updateDsaQuestion(
														dIdx,
														"difficulty",
														e.target.value,
													)
												}
												className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none focus:border-green-500 font-medium">
												<option value="Easy">Easy</option>
												<option value="Medium">Medium</option>
												<option value="Hard">Hard</option>
											</select>
										</div>
										<div>
											<label className="block text-sm font-bold text-slate-400 mb-1">
												Total Marks
											</label>
											<input
												type="number"
												value={dsa.marks}
												onChange={(e) =>
													updateDsaQuestion(
														dIdx,
														"marks",
														parseInt(e.target.value),
													)
												}
												className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 outline-none focus:border-green-500 font-medium"
											/>
										</div>
									</div>
								</div>

								{/* TEST CASES FOR THIS DSA QUESTION */}
								<div className="border-t border-slate-800 pt-6">
									<div className="flex justify-between items-center mb-4">
										<h3 className="text-base font-bold mt-4 text-slate-300">
											Test Cases ({dsa.testCases.length})
										</h3>
										<button
											onClick={() => addTestCase(dIdx)}
											className="text-xs mt-4 bg-slate-800 hover:bg-slate-700 font-bold py-1.5 px-3 rounded-lg flex items-center gap-2 transition-colors">
											<Plus size={14} /> Add Case
										</button>
									</div>

									<div className="space-y-4">
										{dsa.testCases.map((tc, tIdx) => (
											<div
												key={tIdx}
												className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative">
												{/* REPOSITIONED: Trash icon inside the card, top right */}
												<button
													onClick={() => removeTestCase(dIdx, tIdx)}
													className="absolute top-0 right-4 text-slate-500 hover:bg-red-900/40 hover:text-red-400 p-2 rounded-lg transition-colors"
													title="Delete MCQ">
													<Trash2 size={18} />
												</button>

												{/* REFORMATTED: Clean CSS Grid for inputs and toggles */}
												<div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:pr-10 mt-6 md:mt-0">
													<div className="md:col-span-5">
														<label className="block text-xs font-bold text-slate-500 mb-1">
															Standard Input
														</label>
														<textarea
															value={tc.input}
															onChange={(e) =>
																updateTestCase(
																	dIdx,
																	tIdx,
																	"input",
																	e.target.value,
																)
															}
															className="w-full bg-slate-950 border border-slate-700 rounded p-2 font-mono text-sm h-16 outline-none focus:border-green-500"
															placeholder="e.g., 4\n2 7 11 15\n9"
														/>
													</div>

													<div className="md:col-span-5">
														<label className="block text-xs font-bold text-slate-500 mb-1">
															Expected Output
														</label>
														<textarea
															value={tc.expectedOutput}
															onChange={(e) =>
																updateTestCase(
																	dIdx,
																	tIdx,
																	"expectedOutput",
																	e.target.value,
																)
															}
															className="w-full bg-slate-950 border border-slate-700 rounded p-2 font-mono text-sm h-16 outline-none focus:border-green-500"
															placeholder="e.g., 0 1"
														/>
													</div>

													<div className="md:col-span-2 flex flex-row md:flex-col justify-between md:justify-center items-center bg-slate-950 rounded border border-slate-700 p-3 h-auto md:h-16 mt-0 md:mt-5">
														<span className="text-xs font-bold text-slate-500 md:mb-1">
															Hidden?
														</span>
														<label className="relative inline-flex items-center cursor-pointer">
															<input
																type="checkbox"
																checked={tc.isHidden}
																onChange={(e) =>
																	updateTestCase(
																		dIdx,
																		tIdx,
																		"isHidden",
																		e.target.checked,
																	)
																}
																className="sr-only peer"
															/>
															<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
														</label>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* 4. PUBLISH BUTTON (Moved to the bottom) */}
				<div className="flex justify-end pt-4">
					<button
						onClick={handlePublish}
						disabled={isSubmitting}
						className="w-full md:w-auto bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white font-bold py-4 px-12 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-xl shadow-green-900/20 text-lg">
						{isSubmitting ? (
							<Loader2 size={24} className="animate-spin" />
						) : (
							<Save size={24} />
						)}
						{isSubmitting ? "Publishing..." : "Publish Assessment"}
					</button>
				</div>
			</div>
		</div>
	);
}
