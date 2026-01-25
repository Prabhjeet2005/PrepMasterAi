const express = require("express");
const { startInterviewController, chatWithAIController } = require("../controllers/interview.controller");
const interviewRouter = express.Router();

// Route to initialize the interview context
interviewRouter.post("/start", startInterviewController);

// Route to send a user answer and get a response
interviewRouter.post("/chat", chatWithAIController);

module.exports = interviewRouter;
