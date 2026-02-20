const express = require("express");
const {
	startInterviewController,
	chatWithAIController,
	generateFeedbackController,
	speakController,
	getDashboardData,
	getInterviewById,
} = require("../controllers/interview.controller");
const upload = require("../middlewares/upload.middleware");
const protectRoute = require("../middlewares/protectRoute");
const interviewRouter = express.Router();

// Route to initialize the interview context
interviewRouter.post("/start", protectRoute, upload.single("resume"),startInterviewController);

// Route to send a user answer and get a response
interviewRouter.post("/chat",protectRoute, chatWithAIController);

interviewRouter.post("/feedback",protectRoute,generateFeedbackController)

interviewRouter.post("/speak",protectRoute, speakController);

interviewRouter.get("/user-dashboard", protectRoute, getDashboardData);

interviewRouter.get("/history/:id", protectRoute, getInterviewById);

module.exports = interviewRouter;
