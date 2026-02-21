const mongoose = require("mongoose");

const assessmentResultSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		assessmentId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Assessment",
			required: true,
		},

		// Scores
		mcqScore: { type: Number, default: 0 },
		dsaScore: { type: Number, default: 0 },
		totalScore: { type: Number, default: 0 },

		// User's Submissions
		mcqAnswers: { type: Object }, // e.g., { "0": 1, "1": 3 }
		submittedCode: { type: String },

		// Detailed DSA Results
		testCaseResults: [
			{
				passed: Boolean,
				input: String,
				expectedOutput: String,
				actualOutput: String,
				isHidden: Boolean,
			},
		],
	},
	{ timestamps: true },
);

module.exports = mongoose.model(
	"AssessmentResult",
	assessmentResultSchema,
);
