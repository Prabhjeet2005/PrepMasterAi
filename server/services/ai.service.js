// services/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
require("dotenv").config();

class AIService {
	constructor() {
		// 1. Initialize Providers
		this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
		this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

		// 2. In-Memory Storage for Chat Sessions
		this.sessions = {};
	}

	getProvider() {
		return process.env.CURRENT_AI_PROVIDER || "GEMINI";
	}

	async startChat(userId, systemInstruction) {
		const provider = this.getProvider();
		console.log(`🧠 Initializing Chat for ${userId} using ${provider}`);

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

			// SAVE THE SESSION
			this.sessions[userId] = { type: "GEMINI", chat: chat };

			return result.response.text();
		} else if (provider === "GROQ") {
			// Groq is stateless, so we store the array of messages
			this.sessions[userId] = {
				type: "GROQ",
				history: [
					{ role: "system", content: systemInstruction },
					{ role: "user", content: "I am ready. Ask the first question." },
				],
			};

			return await this.generateGroqResponse(userId);
		}
	}

	async sendMessage(userId, userMessage) {
		const session = this.sessions[userId];
		if (!session) {
			throw new Error(
				"No active session found. Please upload resume first.",
			);
		}

		if (session.type === "GEMINI") {
			const result = await session.chat.sendMessage(userMessage);
			return result.response.text();
		} else if (session.type === "GROQ") {
			session.history.push({ role: "user", content: userMessage });
			return await this.generateGroqResponse(userId);
		}
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
}

// Export as a Singleton (New instance created immediately)
module.exports = new AIService();
