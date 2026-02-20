const mongoose = require("mongoose");

// 1. Schema for individual MCQ questions
const mcqSchema = new mongoose.Schema({
	question: { type: String, required: true },
	options: [{ type: String, required: true }], // Array of strings (e.g., ["A", "B", "C", "D"])
	correctAnswerIndex: { type: Number, required: true }, // Index of the correct option (0-3)
	marks: { type: Number, default: 5 },
});

// 2. Schema for Test Cases (Both Visible and Hidden)
const testCaseSchema = new mongoose.Schema({
	input: { type: String, required: true }, // e.g., "[1, 2, 3]\n5"
	expectedOutput: { type: String, required: true }, // e.g., "true"
	isHidden: { type: Boolean, default: false }, // If true, the user won't see this case!
});

// 3. Schema for individual DSA questions
const dsaSchema = new mongoose.Schema({
	title: { type: String, required: true },
	problemStatement: { type: String, required: true },
	constraints: { type: String }, // e.g., "1 <= N <= 10^5"
	difficulty: {
		type: String,
		enum: ["Easy", "Medium", "Hard"],
		default: "Medium",
	},
	testCases: [testCaseSchema], // Array of test cases
	marks: { type: Number, default: 20 },
});

// 4. The Main Assessment Schema
const assessmentSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		description: { type: String, required: true },
		durationMinutes: { type: Number, required: true }, // Timer for the whole test

		// Arrays holding the actual questions
		mcqs: [mcqSchema],
		dsaQuestions: [dsaSchema],

		// Optional: Link to the Admin who created it
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},

		isActive: { type: Boolean, default: true }, // Toggle to hide/show from users
	},
	{ timestamps: true },
);

module.exports = mongoose.model("Assessment", assessmentSchema);
