const Assessment = require("../models/assessment.model.js");
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

module.exports = { createAssessment, getAllAssessments, getAssessmentById, executeCode };
