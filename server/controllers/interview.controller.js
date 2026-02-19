require("dotenv").config();
const aiService = require('../services/ai.service.js'); // Import the adapter
const pdf = require("pdf-extraction"); // NEW LIBRARY
const fs = require("fs");

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
						1: Start with a brief professional introduction.
        		2: Ask specific technical questions based on the resume. 
        		3: Ask one question at a time. Short questions.
            4. Start by asking a question about a specific project or skill from the resume.
            5. Do not be generic. If they mention "MongoDB", ask about indexing or schema design.
            6. If they mention a project, ask about the hardest technical challenge they faced in it.
            7. Adopt a professional tone.
            
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

const generateFeedbackController = async (req, res) => {
	try {
		const { interviewId } = req.body; // We get ID from frontend
		if (!interviewId)
			return res.status(400).json({ error: "Interview ID required" });

		const feedback = await aiService.generateFeedback(interviewId);
		res.json(feedback);
	} catch (error) {
		console.error("Feedback Error:", error);
		res.status(500).json({ error: "Failed to generate feedback" });
	}
};

const speakController = async (req, res) => {
	try {
		const { text } = req.body;
		if (!text) return res.status(400).json({ error: "Text required" });

		const audioBuffer = await aiService.generateAudio(text);

		// Send Audio File back to frontend
		if(process.env.TTS_PROVIDER="GOOGLE"){
		res.set({
			"Content-Type": "audio/mp3",
			"Content-Length": audioBuffer.length,
		});}
		else if(process.env.TTS_PROVIDER="DEEPGRAM"){
		res.set({
			"Content-Type": "audio/wav",
			"Content-Length": audioBuffer.length,
		});}
		
		res.send(audioBuffer);
	} catch (error) {
		console.error("Speak Error:", error);
		res.status(500).json({ error: "TTS Failed" });
	}
};

module.exports = { chatWithAIController, startInterviewController, speakController,generateFeedbackController };
