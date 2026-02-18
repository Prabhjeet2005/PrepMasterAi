const express = require("express");
const { startInterviewController, chatWithAIController, generateFeedbackController } = require("../controllers/interview.controller");
const upload = require("../middlewares/upload.middleware");
const interviewRouter = express.Router();

// Route to initialize the interview context
interviewRouter.post("/start", upload.single("resume"),startInterviewController);

// Route to send a user answer and get a response
interviewRouter.post("/chat", chatWithAIController);

interviewRouter.post("/feedback",generateFeedbackController)

module.exports = interviewRouter;
