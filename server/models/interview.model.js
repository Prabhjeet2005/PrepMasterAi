const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	resumeText: { type: String }, // Store the parsed resume for context

	// Store the conversation
	messages: [
		{
			role: {
				type: String,
				enum: ["user", "ai", "system"],
				required: true,
			},
			content: { type: String, required: true },
			timestamp: { type: Date, default: Date.now },
		},
	],
	feedback: {
		overallScore: { type: Number },
		technicalAccuracy: { type: Number },
		communicationSkills: { type: Number },
		strengths: [String],
		weaknesses: [String],
		improvementTips: String,
		generatedAt: { type: Date },
	},
	status: {
		type: String,
		enum: ["active", "completed"],
		default: "active",
	},
	createdAt: { type: Date, default: Date.now },
},{timestamps:true});

module.exports = mongoose.model("Interview", interviewSchema);
