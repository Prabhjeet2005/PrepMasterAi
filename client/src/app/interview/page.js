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
	MessageSquare,
	X,
} from "lucide-react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/context/AuthContext";

export default function InterviewPage() {
	const router = useRouter();
	const [socket, setSocket] = useState(null);

	// --- UI STATES ---
	const [status, setStatus] = useState("Connecting...");
	const [isRecording, setIsRecording] = useState(false);
	const [isThinking, setIsThinking] = useState(false);
	const [aiSpeaking, setAiSpeaking] = useState(false);
	const [showEndModal, setShowEndModal] = useState(false);
	const [isChatOpen, setIsChatOpen] = useState(false);

	// --- DATA STATES ---
	const [transcript, setTranscript] = useState([]);
	const [questionBubble, setQuestionBubble] = useState(
		"Waiting for interviewer...",
	);
	const [userSubtitle, setUserSubtitle] = useState("");
	const [voices, setVoices] = useState([]);

	const { authUser } = useAuthContext();

	const mediaRecorderRef = useRef(null);
	const messagesEndRef = useRef(null);

	useEffect(() => {
		const loadVoices = () => {
			const availableVoices = window.speechSynthesis.getVoices();
			setVoices(availableVoices);
		};
		loadVoices();
		if (window.speechSynthesis.onvoiceschanged !== undefined) {
			window.speechSynthesis.onvoiceschanged = loadVoices;
		}

		const newSocket = io(process.env.NEXT_PUBLIC_API_URL);
		setSocket(newSocket);

		newSocket.on("connect", () => {
			setStatus("Connected");
			const initialMsg = localStorage.getItem("initialAiMessage");
			if (initialMsg) {
				setTimeout(() => handleAiSpeech(initialMsg), 500);
				localStorage.removeItem("initialAiMessage");
			}
		});

		newSocket.on("ai-response", (text) => {
			setIsThinking(false);
			handleAiSpeech(text);
		});

		newSocket.on("transcript-update", (data) =>
			setUserSubtitle(data.text),
		);

		newSocket.on("user-input-confirmed", (text) => {
			setTranscript((prev) => {
				let foundPending = false;

				// 1. Try to find the pending message and replace it
				const updatedTranscript = prev.map((msg) => {
					if (msg.isPending) {
						foundPending = true;
						return { sender: "user", text: text }; // Remove isPending flag
					}
					return msg;
				});

				if (foundPending) return updatedTranscript;

				// 2. If no pending message, check if it's a duplicate from the backend
				const lastMsg = prev[prev.length - 1];
				if (
					lastMsg &&
					lastMsg.sender === "user" &&
					lastMsg.text === text
				) {
					return prev; // Ignore exact duplicate
				}

				// 3. Otherwise, it's a valid auto-commit, append it
				return [...prev, { sender: "user", text }];
			});

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

	const handleAiSpeech = (text) => {
		setAiSpeaking(true);
		setQuestionBubble(text);
		addMessage("ai", text);
		setStatus("AI Speaking");

		window.speechSynthesis.cancel();

		const utterance = new SpeechSynthesisUtterance(text);

		const googleVoice =
			voices.find(
				(v) => v.name.includes("Google") && v.lang.includes("en"),
			) || voices.find((v) => v.lang.includes("en"));
		if (googleVoice) {
			utterance.voice = googleVoice;
		}

		utterance.rate = 1.2;
		window.currentUtterance = utterance;

		utterance.onstart = () => window.speechSynthesis.resume();

		utterance.onend = () => {
			setAiSpeaking(false);
			setStatus("Ready");
		};

		utterance.onerror = (e) => {
			console.error("Browser TTS Error:", e);
			setAiSpeaking(false);
			setStatus("Audio Interrupted");
		};

		window.speechSynthesis.speak(utterance);
	};

	const startRecording = async () => {
		try {
			window.speechSynthesis.resume();
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
			alert("Mic Access Denied");
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
		setIsRecording(false);
		setIsThinking(true);
		setStatus("Thinking");
		const placeholderText = userSubtitle
			? userSubtitle
			: "Processing audio...";
		setTranscript((prev) => [
			...prev,
			{ sender: "user", text: placeholderText, isPending: true },
		]);
		if (socket) socket.emit("commit-answer", authUser._id);
	};

	const interruptAi = () => {
		window.speechSynthesis.cancel();
		setAiSpeaking(false);
		setStatus("Interrupted");
	};

	const addMessage = (sender, text) => {
		setTranscript((prev) => [...prev, { sender, text }]);
	};

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [transcript]);

	return (
		// h-[100dvh] fixes mobile browser URL bar overlapping issues
		<div className="h-[100dvh] bg-slate-950 text-white flex flex-col overflow-hidden relative">
			{/* STATUS BADGE */}
			<div className="absolute top-4 left-0 right-0 flex justify-center z-20 pointer-events-none px-4">
				<div
					className={`px-4 md:px-6 py-2 rounded-full border backdrop-blur-md flex items-center gap-2 md:gap-3 text-xs md:text-sm font-bold shadow-2xl transition-all ${
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
							<Mic className="animate-pulse" size={16} /> LISTENING
						</>
					)}
					{isThinking && (
						<>
							<Loader2 className="animate-spin" size={16} /> THINKING
						</>
					)}
					{aiSpeaking && (
						<>
							<Bot className="animate-pulse" size={16} /> AI IS SPEAKING
						</>
					)}
					{!isRecording && !isThinking && !aiSpeaking && (
						<span>{status}</span>
					)}
				</div>
			</div>

			{/* MAIN CONTENT AREA */}
			<div className="flex-1 flex flex-col items-center justify-center relative p-4 gap-6 md:gap-8 mt-12 md:mt-0">
				{/* FIXED HEIGHT, SCROLLABLE AI QUESTION BUBBLE */}
				<div className="w-full max-w-3xl flex items-center justify-center z-10">
					<AnimatePresence mode="wait">
						<motion.div
							key={questionBubble}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							// Added max-h-[150px]/[180px], overflow-y-auto, and custom scrollbar styles
							className={`w-full max-h-[150px] md:max-h-[180px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full px-6 py-4 md:px-8 md:py-6 rounded-2xl md:rounded-3xl text-base sm:text-lg md:text-xl font-medium shadow-2xl backdrop-blur-md border ${
								aiSpeaking
									? "bg-blue-600/20 border-blue-500/30 text-white"
									: "bg-slate-800/50 border-slate-700 text-slate-200"
							}`}>
							{isThinking
								? "Generating response..."
								: `"${questionBubble}"`}
						</motion.div>
					</AnimatePresence>
				</div>

				<div className="relative">
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
						className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-slate-900 border-4 border-slate-700 shadow-2xl flex items-center justify-center relative z-0">
						{aiSpeaking ? (
							<Bot className="text-blue-400 w-16 h-16 md:w-20 md:h-20" />
						) : isThinking ? (
							<Loader2 className="text-purple-400 animate-spin w-16 h-16 md:w-20 md:h-20" />
						) : (
							<User
								className={`w-16 h-16 md:w-20 md:h-20 ${isRecording ? "text-red-400" : "text-slate-500"}`}
							/>
						)}
					</motion.div>
				</div>

				<div className="h-16 w-full max-w-2xl text-center px-4">
					{userSubtitle && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="text-slate-300 text-sm md:text-lg font-medium bg-black/40 px-4 md:px-6 py-2 rounded-full inline-block backdrop-blur-sm border border-white/5 line-clamp-2">
							"{userSubtitle}"
						</motion.div>
					)}
				</div>
			</div>

			{/* FLOATING CHAT WIDGET TOGGLE */}
			<div className="absolute bottom-28 md:bottom-32 right-4 md:right-8 z-50">
				<button
					onClick={() => setIsChatOpen(!isChatOpen)}
					className={`p-3 md:p-4 rounded-full shadow-2xl transition-all flex items-center justify-center ${
						isChatOpen
							? "bg-slate-700 text-white"
							: "bg-blue-600 hover:bg-blue-500 text-white"
					}`}>
					{isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
				</button>
			</div>

			{/* FLOATING TRANSCRIPT PANEL (CHATBOT STYLE) */}
			<div
				className={`fixed bottom-44 md:bottom-52 right-4 left-4 sm:left-auto sm:right-8 sm:w-[400px] lg:w-[30vw] h-[60vh] max-h-[500px] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl flex flex-col shadow-2xl z-40 transition-all duration-300 origin-bottom-right ${
					isChatOpen
						? "scale-100 opacity-100 pointer-events-auto"
						: "scale-90 opacity-0 pointer-events-none"
				}`}>
				<div className="p-4 border-b border-slate-800 bg-slate-950/50 text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center rounded-t-2xl">
					<span>Transcript</span>
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
					{transcript.map((msg, i) => (
						<div
							key={i}
							className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[85%] p-3 rounded-xl text-xs md:text-sm ${
									msg.sender === "user"
										? msg.isPending
											? "bg-slate-700/50 text-slate-400 animate-pulse border border-slate-600/50"
											: "bg-slate-700 text-white"
										: "bg-blue-900/30 border border-blue-500/30 text-blue-100"
								}`}>
								{msg.text}
							</div>
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* ZOOM STYLE CONTROLS */}
			<div className="h-20 md:h-24 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-center gap-6 sm:gap-12 z-30 relative px-4">
				{!isRecording ? (
					<button
						onClick={startRecording}
						disabled={aiSpeaking || isThinking}
						className={`flex flex-col items-center gap-1 md:gap-2 group ${aiSpeaking || isThinking ? "opacity-30 cursor-not-allowed" : ""}`}>
						<div className="w-12 h-12 md:w-14 md:h-14 bg-slate-800 group-hover:bg-slate-700 border border-slate-700 rounded-full flex items-center justify-center transition-all shadow-lg">
							<Mic size={20} className="text-white md:w-6 md:h-6" />
						</div>
						<span className="text-[10px] md:text-xs font-bold text-slate-400">
							SPEAK
						</span>
					</button>
				) : (
					<button
						onClick={stopRecording}
						className="flex flex-col items-center gap-1 md:gap-2 group">
						<div className="w-12 h-12 md:w-14 md:h-14 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-all shadow-lg shadow-red-900/20 animate-pulse">
							<Square
								size={20}
								className="text-white fill-white md:w-6 md:h-6"
							/>
						</div>
						<span className="text-[10px] md:text-xs font-bold text-red-400">
							DONE
						</span>
					</button>
				)}

				<button
					onClick={interruptAi}
					disabled={!aiSpeaking}
					className={`flex flex-col items-center gap-1 md:gap-2 group ${!aiSpeaking ? "opacity-30 pointer-events-none" : ""}`}>
					<div className="w-12 h-12 md:w-14 md:h-14 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full flex items-center justify-center transition-all">
						<StopCircle
							size={20}
							className="text-slate-300 md:w-6 md:h-6"
						/>
					</div>
					<span className="text-[10px] md:text-xs font-bold text-slate-400">
						INTERRUPT
					</span>
				</button>

				<button
					onClick={() => setShowEndModal(true)}
					className="flex flex-col items-center gap-1 md:gap-2 group">
					<div className="w-12 h-12 md:w-14 md:h-14 bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 rounded-full flex items-center justify-center transition-all">
						<PhoneOff size={20} className="text-red-400 md:w-6 md:h-6" />
					</div>
					<span className="text-[10px] md:text-xs font-bold text-red-400">
						END
					</span>
				</button>
			</div>

			{/* END MODAL */}
			{showEndModal && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl max-w-[90%] sm:max-w-sm w-full shadow-2xl">
						<h3 className="text-lg md:text-xl font-bold text-white mb-2">
							End Interview?
						</h3>
						<p className="text-sm md:text-base text-slate-400 mb-6">
							We will generate your feedback report immediately.
						</p>
						<div className="flex gap-3 md:gap-4">
							<button
								onClick={() => setShowEndModal(false)}
								className="flex-1 py-2 md:py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm md:text-base transition-colors">
								Cancel
							</button>
							<button
								onClick={() => {
									setShowEndModal(false);
									setStatus("Generating...");
									if (socket) socket.emit("end-interview", authUser._id);
								}}
								className="flex-1 py-2 md:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm md:text-base transition-colors">
								End Session
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
 