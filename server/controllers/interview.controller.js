require("dotenv").config();
const aiService = require('../services/ai.service.js'); // Import the adapter
const pdf = require("pdf-extraction"); // NEW LIBRARY
const fs = require("fs");

let chatHistory = {};

const extractTextFromPDF = async (buffer) => {
	try {
		const data = await pdf(buffer);
		return data.text;
	} catch (error) {
		console.error("❌ PDF Parse Failed:", error);
		// FALLBACK: Return dummy text if PDF fails, so you aren't stuck!
		console.log("⚠️ USING FALLBACK RESUME TEXT (So you can proceed)");
		return `
      Candidate Name: Prabhjeet Singh
      Skills: MERN Stack, Node.js, React, Docker, AWS.
      Projects: 
      - Secure Backup System (Node.js streams, AES Encryption).
      - Investow (Stock trading app).
      - Journeaze (Travel booking).
      Achievements: Leetcode Global Rank 158.
    `;
	}
};

// 1. Start the Interview
const startInterviewController = async (req, res) => {
	try {
		let resumeText = "";

		// OPTION A: File Uploaded
		if (req.file) {
			resumeText = await extractTextFromPDF(req.file.buffer);
		}
		// OPTION B: No File (For testing)
		else {
			console.log("⚠️ No file uploaded. Using default context.");
			resumeText =
				"Candidate is a MERN Stack Developer with 2 years of experience.";
		}

		console.log("✅ Context Loaded. Length:", resumeText.length);

		// 3. Construct the "Context-Aware" Prompt
		const systemInstruction = `
            You are a strict Senior Technical Interviewer at a top tech company (like Google or Amazon).
            
            Here is the candidate's Resume:
            """
            ${resumeText}
            """
            
            Your Goal: Drill the candidate on THEIR specific projects and skills mentioned above.
            
            Rules:
            1. Start by asking a question about a specific project or skill from the resume.
            2. Do not be generic. If they mention "MongoDB", ask about indexing or schema design.
            3. If they mention a project, ask about the hardest technical challenge they faced in it.
            4. Keep questions short (1-2 sentences).
            5. Adopt a professional, slightly intimidating tone.
            
            Start the interview now with the first question.
        `;

		// 4. Initialize Chat
		const response = await aiService.startChat("user1", systemInstruction);
		res.json({ message: response });
		
	} catch (error) {
		console.error("Error starting interview:", error);
		res
			.status(500)
			.json({ error: "Failed to process resume or start AI" });
	}
};

// 2. Chat Loop
const chatWithAIController = async (req, res) => {
	try {
		const { userAnswer } = req.body;
		const response = await aiService.sendMessage("user1", userAnswer);
		res.json({ message: response });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

module.exports = { chatWithAIController, startInterviewController };
