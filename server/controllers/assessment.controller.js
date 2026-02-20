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

module.exports = { createAssessment, getAllAssessments };
