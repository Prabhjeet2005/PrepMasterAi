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

			deepgramLive = deepgram.listen.live({
				model: "nova-2",
				language: "en-US",
				smart_format: true,
				interim_results: true,
        utterance_end_ms: 1000 // 1 sec silence
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

			deepgramLive.on(LiveTranscriptionEvents.Transcript, async (data) => {
				const transcript = data.channel.alternatives[0].transcript;
				if (transcript && data.is_final) {
            console.log("🗣️ User Finished Speaking:", transcript);
                try {
                    // 3. ASK GEMINI
                    console.log("🤖 Asking AI...");
										const aiResponse = await aiService.sendMessage(
											"user1",
											transcript,
										);
                    console.log("🤖 Ai Reply:", aiResponse);

                    // 4. SEND BACK TO FRONTEND
                    socket.emit("ai-response", aiResponse);
                } catch (err) {
                    console.error("Ai Service Error:", err?.message);
										if (err.message.includes("No active session")) {
											socket.emit(
												"ai-response",
												"Please upload your resume to start the interview first.",
											);
										}
                }
             
        }
			});

			deepgramLive.on(LiveTranscriptionEvents.Error, (error) => {
				console.error("🔴 Deepgram Error:", error);
			});

			deepgramLive.on(LiveTranscriptionEvents.Close, (event) => {
				console.log("🔴 Deepgram Connection Closed");
			});
		});

		socket.on("disconnect", () => {
			console.log("❌ Client Disconnected");
			if (deepgramLive) {
				deepgramLive.finish();
				deepgramLive = null;
				packetQueue = [];
			}
		});
	});
};

module.exports = setupSocket;
