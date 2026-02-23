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
		socket.on("commit-answer", async (userId) => {
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
					userId,
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
		socket.on("end-interview", async (userId) => {
			console.log(`🏁 Ending Interview for User ${userId}...`);
			try {
				const feedback = await aiService.generateFeedbackForUser(userId);
				socket.emit("feedback-result", feedback);
			} catch (err) {
				console.error("Feedback Error:", err.message);
				socket.emit("error", "Failed to generate feedback.");
			}
		});

		// ========================================================
		// ZONE 2: MULTI-DEVICE PROCTORING LOGIC (NEW CODE)
		// ========================================================

		// 1. Laptop creates a secure room
		socket.on("create_proctoring_room", (roomId) => {
			socket.join(roomId);
			console.log(
				`[Proctor Socket] Laptop created/joined room: ${roomId}`,
			);
		});

		// 2. Mobile device joins the room
		socket.on("mobile_join_room", (roomId) => {
			socket.join(roomId);
			socket.proctorRoomId = roomId; // TAG THE SOCKET
			socket.isMobile = true; // MARK AS MOBILE
			console.log(`[Proctor Socket] Mobile joined room: ${roomId}`);
			socket.to(roomId).emit("mobile_connected");
		});

		// 3. Mobile detects a violation and alerts the laptop
		socket.on("mobile_violation_detected", ({ roomId, reason }) => {
			console.log(
				`[Proctor Socket] Mobile Violation in ${roomId}: ${reason}`,
			);
			// Send the strike directly to the laptop
			socket.to(roomId).emit("trigger_laptop_strike", reason);
		});

		// 4. Laptop ends the session completely
		socket.on("end_proctoring_session", (roomId) => {
			console.log(`[Proctor Socket] Session ended for room: ${roomId}`);
			socket.to(roomId).emit("proctoring_ended");
		});

		socket.on("disconnect", () => {
			console.log("❌ Client Disconnected");

			if (socket.isMobile && socket.proctorRoomId) {
				console.log(
					`[Proctor Socket] Mobile dropped in room: ${socket.proctorRoomId}`,
				);
				socket.to(socket.proctorRoomId).emit("mobile_disconnected");
			}

			if (deepgramLive) {
				deepgramLive.finish();
				deepgramLive = null;
			}
		});
	});
};

module.exports = setupSocket;
