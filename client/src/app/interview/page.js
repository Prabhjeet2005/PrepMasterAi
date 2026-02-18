"use client";
import { useState, useEffect, useRef } from "react";
import {
	Mic,
	MicOff,
	PhoneOff,
	StopCircle,
	User,
	Bot,
	MessageSquare,
	Volume2,
} from "lucide-react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function InterviewPage() {
	const router = useRouter();
	const [socket, setSocket] = useState(null);
	const [status, setStatus] = useState("Connecting...");
  const [showEndModal, setShowEndModal] = useState(false);

	// States for Logic
	const [isRecording, setIsRecording] = useState(false);
	const [aiSpeaking, setAiSpeaking] = useState(false);
	const [transcript, setTranscript] = useState([]); // Full Chat History
	const [currentSpeech, setCurrentSpeech] = useState(""); // What is being said RIGHT NOW (Bubble)

	const mediaRecorderRef = useRef(null);
	const messagesEndRef = useRef(null);

	// --- 1. SETUP SOCKET & EVENTS ---
	useEffect(() => {
    const initialMsg = localStorage.getItem("initialAiMessage");
		if (initialMsg) {
			setAiSpeaking(true);
			setCurrentSpeech(initialMsg); // Show in bubble
			addMessage("ai", initialMsg); // Add to chat log

			// Speak it
			const utterance = new SpeechSynthesisUtterance(initialMsg);
			utterance.onend = () => {
				setAiSpeaking(false);
				setCurrentSpeech("");
				setStatus("Your turn...");
			};
			window.speechSynthesis.speak(utterance);

			// Clear it so it doesn't play again on refresh
			localStorage.removeItem("initialAiMessage");
		}

		const newSocket = io(process.env.NEXT_PUBLIC_API_URL);
		setSocket(newSocket);

		newSocket.on("connect", () => setStatus("Connected ✅"));

		// A. AI SPEAKS
		newSocket.on("ai-response", (text) => {
			setAiSpeaking(true);
			setCurrentSpeech(text); // Show in Bubble
			addMessage("ai", text); // Add to Logs

			const utterance = new SpeechSynthesisUtterance(text);
			utterance.onend = () => {
				setAiSpeaking(false);
				setCurrentSpeech(""); // Clear Bubble
				setStatus("Your turn...");
			};
			window.speechSynthesis.speak(utterance);
		});

		// B. USER SPEAKS (The Fix for Issue #1)
		newSocket.on("transcript-update", (data) => {
			// 'data' contains { text: "Hello", isFinal: false }

			setCurrentSpeech((prev) => {
				// If it's a new sentence (isFinal), append it.
				// If it's interim (still speaking), replace the last part.
				// SIMPLER APPROACH for "Walkie-Talkie Mode":
				// Just keep appending if it's new text.

				// We'll use a ref or just simpler logic:
				// If data.isFinal, add to a "buffer".
				// For now, let's just append:
				return data.text;
			});
		});

		// C. FEEDBACK RECEIVED
		newSocket.on("feedback-result", (data) => {
			// Save to local storage to pass to next page
			localStorage.setItem("latestFeedback", JSON.stringify(data));
			router.push("/feedback");
		});

    newSocket.on("user-input-confirmed", (text) => {
			addMessage("user", text); // Add full paragraph to log
			setCurrentSpeech(""); // Clear bubble now
		});

		return () => {
			newSocket.close();
			window.speechSynthesis.cancel();
		};
	}, []);

	// Auto-scroll chat
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [transcript]);

	const addMessage = (sender, text) => {
		setTranscript((prev) => [
			...prev,
			{
				sender,
				text,
				time: new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
			},
		]);
	};

	// --- 2. MIC LOGIC (Manual Control) ---
	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			mediaRecorderRef.current = new MediaRecorder(stream, {
				mimeType: "audio/webm",
			});

			mediaRecorderRef.current.ondataavailable = (event) => {
				if (event.data.size > 0 && socket) {
					socket.emit("audio-stream", event.data);
				}
			};

			mediaRecorderRef.current.start(250);
			setIsRecording(true);
			setStatus("Listening... (Speak Now)");
			socket.emit("start-interview");
		} catch (err) {
			alert("Mic Access Denied");
		}
	};

	const stopRecording = () => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
		}
		setIsRecording(false);
		setStatus("Sending Answer... ⏳");

		// Trigger AI
		if (socket) socket.emit("commit-answer");
	};

	const interruptAi = () => {
		window.speechSynthesis.cancel();
		setAiSpeaking(false);
		setCurrentSpeech("");
		setStatus("Interrupted 🛑");
	};

	const endSession = () => {
		setShowEndModal(true); // Show custom modal instead of alert
	};

	const confirmEnd = () => {
		setShowEndModal(false);
		setStatus("Generating Report... 📝");
		window.speechSynthesis.cancel();
		socket.emit("end-interview");
	};

	return (
		<div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
			{/* --- MAIN AREA --- */}
			<div className="flex-1 flex flex-col items-center justify-center relative p-4 gap-8">
				{/* 1. SPEECH BUBBLE (Moved Up) */}
				<div className="h-32 flex items-end justify-center w-full max-w-2xl relative">
					<AnimatePresence>
						{currentSpeech && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
								className="text-center z-10">
								<div
									className={`px-6 py-4 rounded-3xl text-lg font-medium shadow-2xl backdrop-blur-md border border-white/10 ${
										aiSpeaking
											? "bg-purple-600/90 text-white"
											: "bg-blue-600/90 text-white"
									}`}>
									"{currentSpeech}"
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* 2. AVATAR (Center) */}
				<div className="relative">
					{/* The Avatar Image */}
					<motion.div
						animate={{
							scale: aiSpeaking ? [1, 1.05, 1] : 1,
						}}
						className="w-48 h-48 rounded-full bg-slate-800 border-4 border-slate-700 shadow-2xl flex items-center justify-center relative z-0">
						{aiSpeaking ? (
							<Bot size={80} className="text-purple-400" />
						) : (
							<User
								size={80}
								className={
									isRecording ? "text-blue-400" : "text-slate-500"
								}
							/>
						)}
					</motion.div>
				</div>

				{/* 3. STATUS LABEL (Moved Below) */}
				<div className="h-8">
					{aiSpeaking && (
						<span className="text-purple-400 font-bold animate-pulse flex items-center gap-2">
							<Volume2 size={16} /> AI is Speaking...
						</span>
					)}
					{isRecording && (
						<span className="text-blue-400 font-bold animate-pulse flex items-center gap-2">
							<Mic size={16} /> I am Listening...
						</span>
					)}
				</div>
			</div>

			{/* --- SIDEBAR CHAT (Collapsible or Fixed Right) --- */}
			{/* For Zoom style, let's keep it overlay or hidden. For now, let's put it hidden on mobile, visible on desktop right */}
			<div className="hidden md:flex absolute right-4 top-4 bottom-24 w-80 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl flex-col overflow-hidden shadow-2xl">
				<div className="p-4 border-b border-slate-800 bg-slate-900 font-bold flex items-center gap-2">
					<MessageSquare size={18} /> Live Transcript
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{transcript.map((msg, i) => (
						<div
							key={i}
							className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[85%] p-3 rounded-xl text-sm ${
									msg.sender === "user"
										? "bg-blue-600 text-white"
										: "bg-slate-800 border border-slate-700 text-slate-200"
								}`}>
								{msg.text}
							</div>
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* --- ZOOM CONTROL BAR (Bottom) --- */}
			<div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4 px-4 shadow-2xl relative z-20">
				{/* 1. MIC CONTROLS */}
				{!isRecording ? (
					<button
						onClick={startRecording}
						disabled={aiSpeaking}
						className={`flex flex-col items-center gap-1 group ${aiSpeaking ? "opacity-50 cursor-not-allowed" : ""}`}>
						<div className="w-12 h-12 bg-slate-800 group-hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors">
							<Mic size={24} className="text-white" />
						</div>
						<span className="text-xs text-slate-400 font-medium">
							Start Speaking
						</span>
					</button>
				) : (
					<button
						onClick={stopRecording}
						className="flex flex-col items-center gap-1 group">
						<div className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
							<Mic size={24} className="text-white" />
						</div>
						<span className="text-xs text-blue-400 font-bold">
							Done Speaking
						</span>
					</button>
				)}

				{/* 2. INTERRUPT AI */}
				<button
					onClick={interruptAi}
					disabled={!aiSpeaking}
					className={`flex flex-col items-center gap-1 group ${!aiSpeaking ? "opacity-30" : ""}`}>
					<div className="w-12 h-12 bg-slate-800 group-hover:bg-red-900/30 border border-transparent group-hover:border-red-500/50 rounded-full flex items-center justify-center transition-all">
						<StopCircle
							size={24}
							className={aiSpeaking ? "text-red-500" : "text-slate-500"}
						/>
					</div>
					<span className="text-xs text-slate-400">Stop AI</span>
				</button>

				{/* Divider */}
				<div className="w-px h-10 bg-slate-800 mx-2"></div>

				{/* 3. END CALL */}
				<button
					onClick={endSession}
					className="flex flex-col items-center gap-1 group">
					<div className="w-12 h-12 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-red-900/20">
						<PhoneOff size={24} className="text-white" />
					</div>
					<span className="text-xs text-red-400 font-bold">
						End Session
					</span>
				</button>
			</div>
			{showEndModal && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl transform scale-100 transition-all">
						<h3 className="text-xl font-bold text-white mb-2">
							End Interview?
						</h3>
						<p className="text-slate-400 mb-6">
							You will receive your feedback report immediately. This
							cannot be undone.
						</p>
						<div className="flex gap-3">
							<button
								onClick={() => setShowEndModal(false)}
								className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors">
								Cancel
							</button>
							<button
								onClick={confirmEnd}
								className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20">
								End Session
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
