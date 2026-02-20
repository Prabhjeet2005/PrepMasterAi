const Assessment = require("../models/assessment.model.js");

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

module.exports = { createAssessment, getAllAssessments, getAssessmentById };
