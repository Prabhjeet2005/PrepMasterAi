"use client";
import { useState, useEffect, useRef } from "react";
import {
	Mic,
	StopCircle,
	User,
	Bot,
	Volume2,
	PhoneOff,
	Loader2,
} from "lucide-react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function InterviewPage() {
	const router = useRouter();
	const [socket, setSocket] = useState(null);
	const [voices, setVoices] = useState([]);

	// UI States
	const [status, setStatus] = useState("Connecting...");
	const [isRecording, setIsRecording] = useState(false);
	const [isThinking, setIsThinking] = useState(false);
	const [aiSpeaking, setAiSpeaking] = useState(false);
	const [showEndModal, setShowEndModal] = useState(false);

	// Data States
	const [transcript, setTranscript] = useState([]);
	const [questionBubble, setQuestionBubble] = useState(
		"Waiting for interviewer...",
	); // The persistent question
	const [userSubtitle, setUserSubtitle] = useState(""); // Your live speech

	const mediaRecorderRef = useRef(null);
	const messagesEndRef = useRef(null);

	// 1. SETUP
	useEffect(() => {
		// Load Voices
		const loadVoices = () => {
			const vs = window.speechSynthesis.getVoices();
			if (vs.length > 0) setVoices(vs);
		};
		window.speechSynthesis.onvoiceschanged = loadVoices;
		loadVoices();

		const newSocket = io(process.env.NEXT_PUBLIC_API_URL);
		setSocket(newSocket);

		newSocket.on("connect", () => {
			setStatus("Connected ✅");
			const initialMsg = localStorage.getItem("initialAiMessage");
			if (initialMsg) {
				handleAiSpeech(initialMsg);
				localStorage.removeItem("initialAiMessage");
			}
		});

		newSocket.on("ai-response", (text) => {
			setIsThinking(false);
			handleAiSpeech(text);
		});

		newSocket.on("transcript-update", (data) => {
			setUserSubtitle(data.text); // Update subtitle, NOT bubble
		});

		newSocket.on("user-input-confirmed", (text) => {
			addMessage("user", text);
			setUserSubtitle(""); // Clear subtitle
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

	// 2. AUDIO LOGIC (Fixed)
	const handleAiSpeech = (text) => {
		setAiSpeaking(true);
		setQuestionBubble(text); // Update Question Bubble
		addMessage("ai", text);

		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);

		// Voice Selection
		const preferred =
			voices.find((v) => v.lang.includes("en")) || voices[0];
		if (preferred) utterance.voice = preferred;

		// Global Hack
		window.currentUtterance = utterance;

		utterance.onend = () => {
			setAiSpeaking(false);
			setStatus("Your turn...");
		};
		utterance.onerror = (e) => {
			console.error("Audio Error", e);
			setAiSpeaking(false);
		};

		window.speechSynthesis.speak(utterance);
	};

	// 3. MIC LOGIC
	const startRecording = async () => {
		try {
			window.speechSynthesis.cancel(); // Silence AI
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
			setStatus("Listening... 🔴");
			socket.emit("start-interview");
		} catch (err) {
			alert("Mic Error");
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
		setIsRecording(false);
		setIsThinking(true);
		setStatus("Thinking... 🧠");
		if (socket) socket.emit("commit-answer");
	};

	const addMessage = (sender, text) => {
		setTranscript((prev) => [...prev, { sender, text }]);
	};
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [transcript]);

	// 4. RENDER
	return (
		<div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative">
			{/* MAIN CONTENT */}
			<div className="flex-1 flex flex-col items-center justify-center relative p-4 gap-6">
				{/* A. QUESTION BUBBLE (PERSISTENT) */}
				<div className="w-full max-w-2xl text-center z-10 min-h-[100px] flex items-center justify-center">
					<AnimatePresence mode="wait">
						<motion.div
							key={questionBubble} // Animate on change
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className={`px-8 py-6 rounded-3xl text-xl font-medium shadow-2xl backdrop-blur-md border border-white/10 ${
								aiSpeaking
									? "bg-purple-900/80 text-white"
									: "bg-slate-800/80 text-slate-200"
							}`}>
							{isThinking ? (
								<div className="flex items-center gap-2 text-purple-400">
									<Loader2 className="animate-spin" /> Generating
									Response...
								</div>
							) : (
								`"${questionBubble}"`
							)}
						</motion.div>
					</AnimatePresence>
				</div>

				{/* B. AVATAR */}
				<motion.div
					animate={{ scale: aiSpeaking ? [1, 1.05, 1] : 1 }}
					transition={{ repeat: Infinity, duration: 0.5 }}
					className="w-48 h-48 rounded-full bg-slate-800 border-4 border-slate-700 shadow-2xl flex items-center justify-center">
					{aiSpeaking ? (
						<Bot size={80} className="text-purple-400" />
					) : (
						<User
							size={80}
							className={isRecording ? "text-blue-400" : "text-slate-500"}
						/>
					)}
				</motion.div>

				{/* C. USER SUBTITLES (LIVE) */}
				<div className="h-16 w-full max-w-xl text-center">
					{isRecording && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="text-blue-300 font-medium text-lg bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-500/30">
							🎤 {userSubtitle || "Listening..."}
						</motion.div>
					)}
				</div>
			</div>

			{/* RIGHT SIDEBAR CHAT */}
			<div className="hidden md:flex absolute right-4 top-20 bottom-24 w-80 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl flex-col overflow-hidden shadow-2xl">
				<div className="p-3 border-b border-slate-800 bg-slate-950/50 text-xs font-bold uppercase tracking-wider text-slate-500">
					History
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{transcript.map((msg, i) => (
						<div
							key={i}
							className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[85%] p-3 rounded-xl text-xs ${msg.sender === "user" ? "bg-blue-600" : "bg-slate-800 border border-slate-700"}`}>
								{msg.text}
							</div>
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* CONTROLS */}
			<div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-8 shadow-2xl z-20">
				{!isRecording ? (
					<button
						onClick={startRecording}
						disabled={aiSpeaking || isThinking}
						className={`flex flex-col items-center gap-1 group ${aiSpeaking || isThinking ? "opacity-30" : ""}`}>
						<div className="w-14 h-14 bg-slate-800 group-hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors">
							<Mic size={28} className="text-white" />
						</div>
						<span className="text-xs text-slate-400 font-medium">
							Speak
						</span>
					</button>
				) : (
					<button
						onClick={stopRecording}
						className="flex flex-col items-center gap-1 group">
						<div className="w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
							<StopCircle size={28} className="text-white" />
						</div>
						<span className="text-xs text-blue-400 font-bold">Done</span>
					</button>
				)}

				<button
					onClick={() => setShowEndModal(true)}
					className="flex flex-col items-center gap-1 group">
					<div className="w-14 h-14 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded-full flex items-center justify-center transition-colors">
						<PhoneOff size={28} className="text-red-500" />
					</div>
					<span className="text-xs text-red-500 font-medium">End</span>
				</button>
			</div>

			{/* MODAL */}
			{showEndModal && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
						<h3 className="text-xl font-bold text-white mb-2">
							End Interview?
						</h3>
						<p className="text-slate-400 mb-6">
							Receive feedback immediately.
						</p>
						<div className="flex gap-3">
							<button
								onClick={() => setShowEndModal(false)}
								className="flex-1 py-3 bg-slate-800 rounded-xl font-bold">
								Cancel
							</button>
							<button
								onClick={() => {
									setShowEndModal(false);
									setStatus("Generating...");
									if (socket) socket.emit("end-interview");
								}}
								className="flex-1 py-3 bg-red-600 rounded-xl font-bold">
								End
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
