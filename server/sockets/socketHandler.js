// sockets/socketHandler.js
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const dotenv = require("dotenv");
const aiService = require("../services/ai.service");

dotenv.config();

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const setupSocket = (io) => {
	io.on("connection", (socket) => {
		console.log("✅ Client Connected:", socket.id);

		let deepgramLive = null;
		let packetQueue = []; // 1. Queue to store audio while connecting
		let currentTranscript = "";

		socket.on("audio-stream", (data) => {
			// 3. SMART SENDING LOGIC
			if (deepgramLive && deepgramLive.getReadyState() === 1) {
				// If Open, send directly
				deepgramLive.send(data);
			} else if (deepgramLive && deepgramLive.getReadyState() === 0) {
				// If Connecting to DEEPGRAM, SAVE IT to the queue
				// console.log("⏳ Buffering audio chunk..."); // Optional log
				packetQueue.push(data);
			}
		});

		socket.on("start-interview", async () => {
			console.log("🚀 Requesting Deepgram Connection...");

			// Reset queue on new interview
			packetQueue = [];
			currentTranscript = "";

			deepgramLive = deepgram.listen.live({
				model: "nova-2",
				language: "en-US",
				smart_format: true,
				interim_results: true,
			});

			deepgramLive.on(LiveTranscriptionEvents.Open, () => {
				console.log("🟢 Deepgram Connection OPEN");

				// 2. FLUSH THE QUEUE (Send all missed chunks immediately)
				if (packetQueue.length > 0) {
					console.log(
						`📤 Flushing ${packetQueue.length} buffered packets...`,
					);
					packetQueue.forEach((packet) => {
						deepgramLive.send(packet);
					});
					packetQueue = []; // Clear queue
				}
			});

			deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
				const transcript = data.channel.alternatives[0].transcript;

				// 1. Send Real-time Text to Frontend (So you see what you say)
				if (transcript) {
					socket.emit("transcript-update", {
						text: transcript,
						isFinal: data.is_final,
					});
				}

				// 2. Accumulate Final Text (Don't ask AI yet!)
				if (transcript && data.is_final) {
					currentTranscript += transcript + " ";
					console.log("📝 Buffered:", currentTranscript);
				}
			});
			// -----------------------------

			deepgramLive.on(LiveTranscriptionEvents.Error, (err) =>
				console.error("🔴 Deepgram Error:", err),
			);
			deepgramLive.on(LiveTranscriptionEvents.Close, () =>
				console.log("🔴 Deepgram Connection Closed"),
			);
		});

		// 3. NEW: Manual Trigger to Ask AI (The "Finish Speaking" Button)
		socket.on("commit-answer", async () => {
			console.log(
				"🛑 User clicked 'Done'. Sending to AI:",
				currentTranscript,
			);

			if (!currentTranscript.trim()) {
				return; // Don't send empty silence
			}

			try {
				console.log("🤖 Asking AI...");
				const aiResponse = await aiService.sendMessage(
					"user1",
					currentTranscript,
				);

				// Send AI response back
				socket.emit("ai-response", aiResponse);
				socket.emit("user-input-confirmed", currentTranscript);

				// Clear buffer for next question
				currentTranscript = "";
			} catch (err) {
				console.error("AI Error:", err.message);
			}
		});

		// 4. NEW: End Session & Get Feedback
		socket.on("end-interview", async () => {
			console.log("🏁 Ending Interview for User1...");
			try {
				// "user1" is hardcoded for now, but in production, pass userId from frontend
				// Assumption: Your aiService.generateFeedback needs an Interview ID.
				// Since we store session in memory, let's look up the ID from aiService session.

				// NOTE: You might need to add a method 'getSession("user1")' to aiService
				// to get the database ID of the current interview.
				// For now, let's assume aiService handles the lookup internally or we pass the ID.

				// Option A: If aiService remembers the active DB ID:
				const feedback = await aiService.generateFeedbackForUser("user1");

				socket.emit("feedback-result", feedback);
			} catch (err) {
				console.error("Feedback Error:", err.message);
				socket.emit("error", "Failed to generate feedback.");
			}
		});

		socket.on("disconnect", () => {
			console.log("❌ Client Disconnected");
			if (deepgramLive) {
				deepgramLive.finish();
				deepgramLive = null;
			}
		});
	});
};

module.exports = setupSocket;
