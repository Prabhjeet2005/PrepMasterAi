const Assessment = require("../models/assessment.model.js");
const AssessmentResult = require("../models/assessmentResult.model.js");
const axios = require("axios");

// 1. Create a new Assessment (Admin/Recruiter)
const createAssessment = async (req, res) => {
	try {
		const { title, description, durationMinutes, mcqs, dsaQuestions } =
			req.body;

		// Create the assessment and link it to the user creating it
		const newAssessment = new Assessment({
			title,
			description,
			durationMinutes,
			mcqs: mcqs || [],
			dsaQuestions: dsaQuestions || [],
			createdBy: req.user._id, // Retrieved from the protectRoute middleware
		});

		await newAssessment.save();

		res.status(201).json({
			message: "Assessment created successfully!",
			assessment: newAssessment,
		});
	} catch (error) {
		console.error("Create Assessment Error:", error);
		res.status(500).json({ error: "Failed to create assessment" });
	}
};

// 2. Fetch all active assessments (For users to see what tests they can take)
const getAllAssessments = async (req, res) => {
	try {
		// Only fetch assessments that are marked active
		const assessments = await Assessment.find({ isActive: true })
			.select("-mcqs.correctAnswerIndex -dsaQuestions.testCases") // Don't leak answers!
			.sort({ createdAt: -1 });

		res.status(200).json(assessments);
	} catch (error) {
		console.error("Fetch Assessments Error:", error);
		res.status(500).json({ error: "Failed to fetch assessments" });
	}
};

const getAssessmentById = async (req, res) => {
	try {
		const { id } = req.params;
		// .lean() allows us to easily modify the object before sending it
		const assessment = await Assessment.findById(id).lean();

		if (!assessment || !assessment.isActive) {
			return res.status(404).json({ error: "Assessment not found" });
		}

		// 1. Remove MCQ answers so the user can't cheat
		assessment.mcqs.forEach((mcq) => {
			delete mcq.correctAnswerIndex;
		});

		// 2. Remove HIDDEN test cases, but keep the visible ones for the UI
		assessment.dsaQuestions.forEach((dsa) => {
			if (dsa.testCases) {
				dsa.testCases = dsa.testCases.filter((tc) => !tc.isHidden);
			}
		});

		res.status(200).json(assessment);
	} catch (error) {
		console.error("Fetch Assessment Error:", error);
		res.status(500).json({ error: "Failed to fetch assessment" });
	}
};

const executeCode = async (req, res) => {
	try {
		const { code, language, testCases } = req.body;

		// Wandbox specific compiler environments
		const languageMap = {
			javascript: "nodejs-head",
			python: "cpython-head",
			cpp: "gcc-head",
			java: "openjdk-head",
		};

		if (!languageMap[language]) {
			return res.status(400).json({ error: "Unsupported language" });
		}

		const results = [];

		// Run the code against each test case
		for (const tc of testCases) {
			// Send request to Wandbox API
			const response = await axios.post(
				"https://wandbox.org/api/compile.json",
				{
					compiler: languageMap[language],
					code: code,
					stdin: tc.input, // Standard input for the test case
				},
			);

			const data = response.data;

			console.log(`WANDBOX RAW RESPONSE for ${language}:`, data);

			// Extract output safely (checking all possible Wandbox fields)
			const output = (
				data.program_out ||
				data.program_message ||
				data.stdout ||
				""
			).trim();
			const compileError = (
				data.compiler_error ||
				data.compiler_message ||
				""
			).trim();
			const runtimeError = (data.program_err || data.stderr || "").trim();

			// Wandbox status "0" means success. Anything else is a compile or runtime failure.
			const isError = data.status !== "0" || runtimeError !== "";
			const errorStr =
				compileError ||
				runtimeError ||
				"Unknown Compilation/Runtime Error";

			// If there's an error, show the error. Otherwise, show the output.
			const finalOutput = isError ? errorStr : output;
			const isPassed =
				!isError && finalOutput === tc.expectedOutput.trim();

			results.push({
				input: tc.input,
				expectedOutput: tc.expectedOutput,
				actualOutput: finalOutput || "No output generated",
				passed: isPassed,
				hasError: isError,
			});
		}

		res.status(200).json({ results });
	} catch (error) {
		console.error("Wandbox Execution Error:", error.message);
		res
			.status(500)
			.json({ error: "Failed to execute code on remote server" });
	}
};

const submitAssessment = async (req, res) => {
	try {
		const { id } = req.params;
		const { mcqAnswers, code, language } = req.body;

		// 1. Fetch the FULL assessment (including hidden test cases and answers)
		const assessment = await Assessment.findById(id);
		if (!assessment)
			return res.status(404).json({ error: "Assessment not found" });

		let mcqScore = 0;
		let dsaScore = 0;

		// 2. GRADE MCQs
		if (assessment.mcqs && assessment.mcqs.length > 0) {
			assessment.mcqs.forEach((mcq, index) => {
				// If the user's answer matches the correct index, award marks
				if (mcqAnswers[index] === mcq.correctAnswerIndex) {
					mcqScore += mcq.marks;
				}
			});
		}

		// 3. GRADE DSA (Run against ALL test cases via Wandbox)
		const testCaseResults = [];
		let passedCases = 0;
		const dsaQuestion = assessment.dsaQuestions[0]; // Assuming 1 DSA for now

		if (dsaQuestion && dsaQuestion.testCases.length > 0) {
			const totalCases = dsaQuestion.testCases.length;

			for (const tc of dsaQuestion.testCases) {
				// Compile on Wandbox
				const response = await axios.post(
					"https://wandbox.org/api/compile.json",
					{
						compiler: "gcc-head", // Hardcoded C++ for now based on our UI
						code: code,
						stdin: tc.input,
					},
				);

				const data = response.data;
				const output = (
					data.program_out ||
					data.program_message ||
					data.stdout ||
					""
				).trim();
				const errorStr = (
					data.compiler_error ||
					data.program_err ||
					""
				).trim();

				const isError = data.status !== "0" || errorStr !== "";
				const finalOutput = isError ? errorStr : output;
				const isPassed =
					!isError && finalOutput === tc.expectedOutput.trim();

				if (isPassed) passedCases++;

				testCaseResults.push({
					passed: isPassed,
					input: tc.input,
					expectedOutput: tc.expectedOutput,
					actualOutput: finalOutput,
					isHidden: tc.isHidden,
				});
			}

			// Calculate DSA Score (Percentage of test cases passed * total marks)
			dsaScore = (passedCases / totalCases) * dsaQuestion.marks;
		}

		const totalScore = mcqScore + dsaScore;

		// 4. Save to Database
		const result = new AssessmentResult({
			userId: req.user._id,
			assessmentId: assessment._id,
			mcqScore,
			dsaScore,
			totalScore,
			mcqAnswers,
			submittedCode: code,
			testCaseResults,
		});

		await result.save();

		res.status(200).json({
			message: "Assessment submitted successfully",
			resultId: result._id,
			totalScore,
		});
	} catch (error) {
		console.error("Submit Assessment Error:", error);
		res
			.status(500)
			.json({ error: "Failed to grade and submit assessment" });
	}
};

const getUserAssessmentHistory = async (req, res) => {
	try {
		// Find all results for this user, sort by newest first
		const results = await AssessmentResult.find({ userId: req.user._id })
			.populate("assessmentId", "title durationMinutes") // Pull in the test title from the Assessment model
			.sort({ createdAt: -1 });

		res.status(200).json(results);
	} catch (error) {
		console.error("Fetch Assessment History Error:", error);
		res.status(500).json({ error: "Failed to fetch assessment history" });
	}
};

const getAssessmentResultById = async (req, res) => {
	try {
		// Populate the assessmentId to get the title
		const result = await AssessmentResult.findById(req.params.id).populate(
			"assessmentId",
			"title description",
		);

		if (!result)
			return res.status(404).json({ error: "Result not found" });
		res.status(200).json(result);
	} catch (error) {
		console.error("Fetch Result Error:", error);
		res.status(500).json({ error: "Failed to fetch assessment result" });
	}
};

// 2. Fetch all OAs created by the logged-in Recruiter
const getRecruiterAssessments = async (req, res) => {
	try {
		if (req.user.role !== "recruiter" && req.user.role !== "admin") {
			return res.status(403).json({ error: "Unauthorized access" });
		}
		const assessments = await Assessment.find({
			createdBy: req.user._id,
		}).sort({ createdAt: -1 });
		res.status(200).json(assessments);
	} catch (error) {
		console.error("Fetch Recruiter OAs Error:", error);
		res
			.status(500)
			.json({ error: "Failed to fetch recruiter assessments" });
	}
};

// 3. Fetch all Student Submissions for a specific OA (Leaderboard)
const getAssessmentSubmissions = async (req, res) => {
	try {
		if (req.user.role !== "recruiter" && req.user.role !== "admin") {
			return res.status(403).json({ error: "Unauthorized access" });
		}
		// Populate the userId to get the student's name and email!
		const submissions = await AssessmentResult.find({
			assessmentId: req.params.id,
		})
			.populate("userId", "name email")
			.sort({ totalScore: -1 }); // Sort by highest score first

		res.status(200).json(submissions);
	} catch (error) {
		console.error("Fetch Submissions Error:", error);
		res.status(500).json({ error: "Failed to fetch submissions" });
	}
};

module.exports = { createAssessment, getAllAssessments, getAssessmentById, executeCode, submitAssessment, getUserAssessmentHistory,getAssessmentResultById, getRecruiterAssessments ,getAssessmentSubmissions };
