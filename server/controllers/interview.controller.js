const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

let chatHistory = []; // Temporary in-memory storage (We will move to DB later)

// 1. Start the Interview
const startInterviewController = async (req, res) => {
	const { jobRole, experienceLevel } = req.body;

	// This "System Prompt" is the most critical part.
	// It tells Gemini who to be.
	const systemInstruction = `
        You are a strict technical interviewer for a ${jobRole} position. 
        The candidate has ${experienceLevel} years of experience.
        
        Rules:
        1. Ask only ONE technical question at a time.
        2. Do not be overly polite. Be professional and concise.
        3. After the user answers, evaluate their answer briefly (Correct/Incorrect) and ask the next question.
        4. If the answer is wrong, correct them briefly before moving on.
        5. Start by asking the first technical question now.
    `;

	try {
		// Start a chat session
		const chat = model.startChat({
			history: [
				{
					role: "user",
					parts: [{ text: systemInstruction }],
				},
			],
		});

		// We send a dummy message to trigger the first question from AI
		const result = await chat.sendMessage("I am ready for the interview.");
		const response = result.response.text();

		// Save history (In real app, save to MongoDB)
		chatHistory = chat;

		res.json({ message: response });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "AI Failed to start" });
	}
};

// 2. Chat Loop
const chatWithAIController = async (req, res) => {
	const { userAnswer } = req.body;

	if (!chatHistory) {
		return res.status(400).json({ error: "Start the interview first!" });
	}

	try {
		const result = await chatHistory.sendMessage(userAnswer);
		const response = result.response.text();
		res.json({ message: response });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "AI Error" });
	}
};

module.exports = {chatWithAIController,startInterviewController}