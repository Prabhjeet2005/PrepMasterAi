// services/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const Interview = require("../models/interview.model.js")
require("dotenv").config();

class AIService {
	constructor() {
		// 1. Initialize Providers
		this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
		this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

		this.sessions = {};
	}

	getProvider() {
		return process.env.CURRENT_AI_PROVIDER || "GROQ";
	}

	async startChat(userId, systemInstruction) {
		const provider = this.getProvider();
		console.log(`🧠 Initializing Chat for ${userId} using ${provider}`);

		// Create a new Interview Document in MongoDB
		const newInterview = new Interview({
			userId: userId,
			messages: [{ role: "system", content: systemInstruction }],
		});
		await newInterview.save(); // Save to DB

		this.sessions = this.sessions || {};

		if (provider === "GEMINI") {
			const model = this.genAI.getGenerativeModel({
				model: process.env.GEMINI_MODEL,
			});

			const chat = model.startChat({
				history: [{ role: "user", parts: [{ text: systemInstruction }] }],
			});

			// Dummy message to "warm up" the conversation
			const result = await chat.sendMessage(
				"I am ready. Ask the first question.",
			);

			const text = result.response.text();

			// Save AI's first message to DB
			newInterview.messages.push({ role: "ai", content: text });
			await newInterview.save();

			// Store chat object in memory (Gemini needs this object to keep context)
			// But we ALSO store the ID so we can find the DB record later
			this.sessions = this.sessions || {};
			this.sessions[userId] = {
				type: "GEMINI",
				chat: chat,
				dbId: newInterview._id,
			};

			return text;
		} else if (provider === "GROQ") {
			// For Groq, we rely purely on DB history + In-memory array
			this.sessions = this.sessions || {};
			this.sessions[userId] = {
				type: "GROQ",
				dbId: newInterview._id,
				history: [
					{ role: "system", content: systemInstruction },
					{ role: "user", content: "I am ready. Ask the first question." },
				],
			};

			return await this.generateGroqResponse(userId);
		}
	}

	// 2. SEND MESSAGE (Update DB Entry)
	async sendMessage(userId, userMessage) {
		if (!this.sessions || !this.sessions[userId]) {
			throw new Error(
				"No active session found. Please restart the interview via Postman.",
			);
		}
		const session = this.sessions[userId];

		// A. Save User Message to DB
		await Interview.findByIdAndUpdate(session.dbId, {
			$push: { messages: { role: "user", content: userMessage } },
		});

		let aiResponse = "";

		if (session.type === "GEMINI") {
			const result = await session.chat.sendMessage(userMessage);
			aiResponse = result.response.text();
		} else if (session.type === "GROQ") {
			session.history.push({ role: "user", content: userMessage });
			aiResponse = await this.generateGroqResponse(userId);
		}

		// B. Save AI Response to DB
		await Interview.findByIdAndUpdate(session.dbId, {
			$push: { messages: { role: "ai", content: aiResponse } },
		});

		return aiResponse;
	}

	async generateGroqResponse(userId) {
		const session = this.sessions[userId];

		const completion = await this.groq.chat.completions.create({
			messages: session.history,
			model: process.env.GROQ_MODEL,
			temperature: 0.6,
		});

		const answer = completion.choices[0]?.message?.content || "";
		session.history.push({ role: "assistant", content: answer });

		return answer;
	}

	async generateFeedback(interviewId) {
		const interview = await Interview.findById(interviewId);
		if (!interview) throw new Error("Interview not found");

		// Convert chat history to a readable string for the AI
		const conversationText = interview.messages
			.map((m) => `${m.role.toUpperCase()}: ${m.content}`)
			.join("\n");

		const systemPrompt = `
        You are a Senior Technical Recruiter. Analyze the following interview transcript.
        
        Transcript:
        ${conversationText}
        
        Task: Generate a structured feedback report in STRICT JSON format.
        Focus on:
        1. Technical Accuracy (Did they know the answers?)
        2. Communication (Were they clear?)
        
        Output Format (JSON ONLY, no markdown):
        {
            "overallScore": (0-10),
            "technicalAccuracy": (0-10),
            "communicationSkills": (0-10),
            "strengths": ["point 1", "point 2"],
            "weaknesses": ["point 1", "point 2"],
            "improvementTips": "Summary of how to improve..."
        }
    `;

		let feedbackJson = {};

		// We use the same provider logic
		if (this.getProvider() === "GEMINI") {
			const model = this.genAI.getGenerativeModel({
				model: process.env.GEMINI_MODEL,
			});
			const result = await model.generateContent(systemPrompt);
			const text = result.response.text();
			// Clean up markdown formatting if Gemini adds it
			const jsonString = text
				.replace(/```json/g, "")
				.replace(/```/g, "")
				.trim();
			feedbackJson = JSON.parse(jsonString);
		} else if (this.getProvider() === "GROQ") {
			const completion = await this.groq.chat.completions.create({
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: "Generate Report" },
				],
				model: process.env.GROQ_MODEL,
				// specific instruction to ensure JSON
				response_format: { type: "json_object" },
			});
			feedbackJson = JSON.parse(completion.choices[0].message.content);
		}

		// Save to DB
		interview.feedback = {
			...feedbackJson,
			generatedAt: new Date(),
		};
		interview.status = "completed";
		await interview.save();

		return interview.feedback;
	}

	// Add this helper method to your AIService class:
	async generateFeedbackForUser(userId) {
		if (!this.sessions[userId]) {
			throw new Error("No active session found");
		}
		const dbId = this.sessions[userId].dbId; // Get the saved Mongo ID
		return await this.generateFeedback(dbId);
	}
}

// Export as a Singleton (New instance created immediately)
module.exports = new AIService();
