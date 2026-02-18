"use client";
import { useState, useEffect, useRef } from "react";
import {
	Mic,
	Square,
	PhoneOff,
	User,
	Bot,
	Volume2,
	Loader2,
	StopCircle,
} from "lucide-react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function InterviewPage() {
	const router = useRouter();
	const [socket, setSocket] = useState(null);

	// --- CORE STATES ---
	const [status, setStatus] = useState("Connecting...");
	const [isRecording, setIsRecording] = useState(false);
	const [isThinking, setIsThinking] = useState(false);
	const [aiSpeaking, setAiSpeaking] = useState(false);
	const [showEndModal, setShowEndModal] = useState(false);

	// --- DATA STATES ---
	const [transcript, setTranscript] = useState([]);
	const [questionBubble, setQuestionBubble] = useState(
		"Waiting for interviewer...",
	);
	const [userSubtitle, setUserSubtitle] = useState("");
	const [voices, setVoices] = useState([]);

	const mediaRecorderRef = useRef(null);
	const messagesEndRef = useRef(null);

	// --- 1. INITIALIZATION & SOCKET ---
	useEffect(() => {
		// A. Load Voices (Crucial for Audio Error Fix)
		const loadVoices = () => {
			const vs = window.speechSynthesis.getVoices();
			if (vs.length > 0) setVoices(vs);
		};
		window.speechSynthesis.onvoiceschanged = loadVoices;
		loadVoices();

		// B. Connect Socket
		const newSocket = io(process.env.NEXT_PUBLIC_API_URL);
		setSocket(newSocket);

		newSocket.on("connect", () => {
			setStatus("Connected");
			const initialMsg = localStorage.getItem("initialAiMessage");
			if (initialMsg) {
				handleAiSpeech(initialMsg);
				localStorage.removeItem("initialAiMessage");
			}
		});

		// C. Event Listeners
		newSocket.on("ai-response", (text) => {
			setIsThinking(false);
			handleAiSpeech(text);
		});

		newSocket.on("transcript-update", (data) => {
			setUserSubtitle(data.text);
		});

		newSocket.on("user-input-confirmed", (text) => {
			addMessage("user", text);
			setUserSubtitle("");
		});

		newSocket.on("feedback-result", (data) => {
			localStorage.setItem("latestFeedback", JSON.stringify(data));
			router.push("/feedback");
		});

		return () => {
			newSocket.close();
			window.speechSynthesis.cancel();
		};
	}, []);

	// --- 2. AUDIO HANDLER (THE FIX) ---
	const handleAiSpeech = (text) => {
		setAiSpeaking(true);
		setQuestionBubble(text);
		addMessage("ai", text);

		// 1. Safety Cancel
		window.speechSynthesis.cancel();

		// 2. Create Utterance
		const utterance = new SpeechSynthesisUtterance(text);

		// 3. Robust Voice Selection
		const preferred =
			voices.find((v) => v.lang.includes("en-US")) || voices[0];
		if (preferred) utterance.voice = preferred;
		utterance.rate = 1.0;

		// 4. GLOBAL REFERENCE (Fixes the Garbage Collection Bug)
		window.currentUtterance = utterance;

		utterance.onstart = () => setStatus("AI Speaking");

		utterance.onend = () => {
			setAiSpeaking(false);
			setStatus("Ready");
		};

		utterance.onerror = (e) => {
			console.error("Audio Error:", e);
			setAiSpeaking(false);
			setStatus("Audio Error");
		};

		// 5. Speak
		window.speechSynthesis.speak(utterance);
	};

	// --- 3. MIC CONTROLS ---
	const startRecording = async () => {
		try {
			// Safety: Stop AI if it's talking
			window.speechSynthesis.cancel();
			setAiSpeaking(false);

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			mediaRecorderRef.current = new MediaRecorder(stream, {
				mimeType: "audio/webm",
			});

			mediaRecorderRef.current.ondataavailable = (event) => {
				if (event.data.size > 0 && socket)
					socket.emit("audio-stream", event.data);
			};

			mediaRecorderRef.current.start(250);
			setIsRecording(true);
			setStatus("Listening");
			socket.emit("start-interview");
		} catch (err) {
			alert("Microphone Access Denied. Check Browser Settings.");
		}
	};

	const stopRecording = () => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
		}
		setIsRecording(false);
		setIsThinking(true); // Trigger Thinking State
		setStatus("Thinking");

		// Send signal to backend
		if (socket) socket.emit("commit-answer");
	};

	const interruptAi = () => {
		window.speechSynthesis.cancel();
		setAiSpeaking(false);
		setStatus("Interrupted");
	};

	// --- 4. HELPERS ---
	const addMessage = (sender, text) => {
		setTranscript((prev) => [...prev, { sender, text }]);
	};

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [transcript]);

	// --- 5. RENDER ---
	return (
		<div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative">
			{/* HEADER / STATUS BAR */}
			<div className="absolute top-0 left-0 right-0 p-4 flex justify-center z-20">
				<div
					className={`px-6 py-2 rounded-full border backdrop-blur-md flex items-center gap-3 font-bold shadow-2xl transition-all ${
						isRecording
							? "bg-red-900/50 border-red-500 text-red-200"
							: isThinking
								? "bg-purple-900/50 border-purple-500 text-purple-200"
								: aiSpeaking
									? "bg-blue-900/50 border-blue-500 text-blue-200"
									: "bg-slate-800/50 border-slate-700 text-slate-300"
					}`}>
					{isRecording && (
						<>
							<Mic className="animate-pulse" size={18} /> LISTENING
						</>
					)}
					{isThinking && (
						<>
							<Loader2 className="animate-spin" size={18} /> THINKING
						</>
					)}
					{aiSpeaking && (
						<>
							<Volume2 className="animate-pulse" size={18} /> SPEAKING
						</>
					)}
					{!isRecording && !isThinking && !aiSpeaking && (
						<span>{status}</span>
					)}
				</div>
			</div>

			{/* MAIN CONTENT AREA */}
			<div className="flex-1 flex flex-col items-center justify-center relative p-4 gap-8">
				{/* A. QUESTION BUBBLE (PERSISTENT) */}
				<div className="w-full max-w-3xl text-center min-h-[120px] flex items-center justify-center z-10">
					<AnimatePresence mode="wait">
						<motion.div
							key={questionBubble}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className={`px-8 py-6 rounded-3xl text-xl md:text-2xl font-medium shadow-2xl backdrop-blur-md border ${
								aiSpeaking
									? "bg-blue-600/20 border-blue-500/30 text-white"
									: "bg-slate-800/50 border-slate-700 text-slate-200"
							}`}>
							{isThinking
								? "Generating feedback..."
								: `"${questionBubble}"`}
						</motion.div>
					</AnimatePresence>
				</div>

				{/* B. AVATAR */}
				<div className="relative">
					{/* Glow Ring */}
					<div
						className={`absolute inset-0 blur-3xl rounded-full opacity-40 transition-colors duration-500 ${
							aiSpeaking
								? "bg-blue-500"
								: isRecording
									? "bg-red-500"
									: isThinking
										? "bg-purple-500"
										: "bg-slate-800"
						}`}></div>

					<motion.div
						animate={{ scale: aiSpeaking ? [1, 1.05, 1] : 1 }}
						transition={{ repeat: Infinity, duration: 0.5 }}
						className="w-48 h-48 rounded-full bg-slate-900 border-4 border-slate-700 shadow-2xl flex items-center justify-center relative z-0">
						{aiSpeaking ? (
							<Bot size={80} className="text-blue-400" />
						) : isThinking ? (
							<Loader2
								size={80}
								className="text-purple-400 animate-spin"
							/>
						) : (
							<User
								size={80}
								className={isRecording ? "text-red-400" : "text-slate-500"}
							/>
						)}
					</motion.div>
				</div>

				{/* C. USER SUBTITLES */}
				<div className="h-16 w-full max-w-2xl text-center">
					{userSubtitle && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="text-slate-300 text-lg font-medium bg-black/40 px-6 py-2 rounded-full inline-block backdrop-blur-sm border border-white/5">
							"{userSubtitle}"
						</motion.div>
					)}
				</div>
			</div>

			{/* RIGHT SIDEBAR (Chat History) */}
			<div className="hidden lg:flex absolute right-6 top-24 bottom-32 w-80 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl flex-col overflow-hidden shadow-xl">
				<div className="p-4 border-b border-slate-800 bg-slate-950/50 text-xs font-bold uppercase tracking-wider text-slate-500">
					Session Transcript
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{transcript.map((msg, i) => (
						<div
							key={i}
							className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[85%] p-3 rounded-xl text-sm ${
									msg.sender === "user"
										? "bg-slate-700 text-white"
										: "bg-blue-900/30 border border-blue-500/30 text-blue-100"
								}`}>
								{msg.text}
							</div>
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* FOOTER CONTROLS (3-Button Layout) */}
			<div className="h-24 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-center gap-12 z-30">
				{/* 1. START/STOP BUTTON (Main Action) */}
				{!isRecording ? (
					<button
						onClick={startRecording}
						disabled={aiSpeaking || isThinking}
						className={`flex flex-col items-center gap-2 group ${aiSpeaking || isThinking ? "opacity-30 cursor-not-allowed" : ""}`}>
						<div className="w-14 h-14 bg-slate-800 group-hover:bg-slate-700 border border-slate-700 rounded-full flex items-center justify-center transition-all shadow-lg">
							<Mic size={24} className="text-white" />
						</div>
						<span className="text-xs font-bold text-slate-400">SPEAK</span>
					</button>
				) : (
					<button
						onClick={stopRecording}
						className="flex flex-col items-center gap-2 group">
						<div className="w-14 h-14 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-all shadow-lg shadow-red-900/20 animate-pulse">
							<Square size={24} className="text-white fill-white" />
						</div>
						<span className="text-xs font-bold text-red-400">DONE</span>
					</button>
				)}

				{/* 2. INTERRUPT (Stop AI) */}
				<button
					onClick={interruptAi}
					disabled={!aiSpeaking}
					className={`flex flex-col items-center gap-2 group ${!aiSpeaking ? "opacity-30 pointer-events-none" : ""}`}>
					<div className="w-14 h-14 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full flex items-center justify-center transition-all">
						<StopCircle size={24} className="text-slate-300" />
					</div>
					<span className="text-xs font-bold text-slate-400">
						INTERRUPT
					</span>
				</button>

				{/* 3. END SESSION */}
				<button
					onClick={() => setShowEndModal(true)}
					className="flex flex-col items-center gap-2 group">
					<div className="w-14 h-14 bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 rounded-full flex items-center justify-center transition-all">
						<PhoneOff size={24} className="text-red-400" />
					</div>
					<span className="text-xs font-bold text-red-400">END</span>
				</button>
			</div>

			{/* CONFIRMATION MODAL */}
			{showEndModal && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full shadow-2xl">
						<h3 className="text-xl font-bold text-white mb-2">
							End Interview?
						</h3>
						<p className="text-slate-400 mb-6">
							We will generate your feedback report immediately.
						</p>
						<div className="flex gap-4">
							<button
								onClick={() => setShowEndModal(false)}
								className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors">
								Cancel
							</button>
							<button
								onClick={() => {
									setShowEndModal(false);
									setStatus("Generating Report...");
									if (socket) socket.emit("end-interview");
								}}
								className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors">
								End Session
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
