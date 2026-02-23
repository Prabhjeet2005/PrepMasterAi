"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import Editor from "@monaco-editor/react";
import { QRCodeSVG } from "qrcode.react"; // NEW IMPORT
import { io } from "socket.io-client"; // NEW IMPORT
import {
	Loader2,
	Clock,
	ChevronRight,
	ChevronLeft,
	Play,
	Info,
	PanelLeftClose,
	PanelLeftOpen,
	FileText,
	Code2,
	GripVertical,
	AlertTriangle,
	Smartphone, // Added Smartphone icon
	CheckCircle2,
} from "lucide-react";

const CPP_BOILERPLATE = `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your logic here...\n    \n    return 0;\n}`;

export default function AssessmentEnvironment() {
	const { id } = useParams();
	const router = useRouter();
	const { authUser, isLoading: authLoading } = useAuthContext();

	const [assessment, setAssessment] = useState(null);
	const [loading, setLoading] = useState(true);

	const [timeLeft, setTimeLeft] = useState(0);
	const [activeTab, setActiveTab] = useState("mcq");
	const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
	const [mcqAnswers, setMcqAnswers] = useState({});

	const [code, setCode] = useState(CPP_BOILERPLATE);
	const [isCompiling, setIsCompiling] = useState(false);
	const [executionResults, setExecutionResults] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// --- PROCTORING & CUSTOM UI STATES ---
	const [hasStarted, setHasStarted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [warnings, setWarnings] = useState(0);
	const [showWarningModal, setShowWarningModal] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [violationMessage, setViolationMessage] = useState("");
	const [toastMessage, setToastMessage] = useState("");
	const MAX_WARNINGS = 3;

	// --- NEW: MULTI-DEVICE STATES ---
	const [isMobileConnected, setIsMobileConnected] = useState(false);
	const [pairingUrl, setPairingUrl] = useState("");
	const [isMobileDevice, setIsMobileDevice] = useState(false);
	const [laptopStream, setLaptopStream] = useState(null);

	// --- REFS ---
	const codeRef = useRef(code);
	const mcqAnswersRef = useRef(mcqAnswers);
	const isFullscreenRef = useRef(false);
	const hasStartedRef = useRef(false);
	const lastViolationTime = useRef(0);
	const isSubmittingRef = useRef(isSubmitting);
	const showWarningModalRef = useRef(showWarningModal);
	const socketRef = useRef(null); // Keep track of the socket

	const laptopVideoRef = useRef(null);
	const laptopStreamRef = useRef(null);

	useEffect(() => {
		codeRef.current = code;
	}, [code]);
	useEffect(() => {
		mcqAnswersRef.current = mcqAnswers;
	}, [mcqAnswers]);
	useEffect(() => {
		hasStartedRef.current = hasStarted;
	}, [hasStarted]);
	useEffect(() => {
		isSubmittingRef.current = isSubmitting;
	}, [isSubmitting]);
	useEffect(() => {
		showWarningModalRef.current = showWarningModal;
	}, [showWarningModal]);

	useEffect(() => {
		// Detect if the user is on a phone/tablet
		const checkMobile =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent,
			);
		setIsMobileDevice(checkMobile);
	}, []);

	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [leftPanelWidth, setLeftPanelWidth] = useState(50);
	const [isDragging, setIsDragging] = useState(false);
	const splitContainerRef = useRef(null);

	// Fetch Assessment
	useEffect(() => {
		if (!authLoading && !authUser) return router.push("/login");

		const fetchAssessment = async () => {
			try {
				const res = await axios.get(
					`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/${id}`,
					{ withCredentials: true },
				);
				setAssessment(res.data);
				setTimeLeft(res.data.durationMinutes * 60);
			} catch (err) {
				console.error(err);
				router.push("/assessments");
			} finally {
				setLoading(false);
			}
		};

		if (id) fetchAssessment();
	}, [id, authUser, authLoading, router]);

	// ==========================================
	// NEW: SOCKET INITIALIZATION & PAIRING
	// ==========================================
	useEffect(() => {
		if (!authUser || !id) return;

		// Generate the unique room ID for this test session
		const roomId = `${id}-${authUser._id}`;

		// Generate the URL the phone will scan (Works on local Wi-Fi if using local IP)
		if (typeof window !== "undefined") {
			setPairingUrl(
				`${window.location.protocol}//${window.location.host}/mobile-proctor/${roomId}`,
			);
		}

		// Connect to Socket
		const socket = io(process.env.NEXT_PUBLIC_API_URL);
		socketRef.current = socket;

		socket.on("connect", () => {
			console.log("Laptop connected to socket. Creating room...");
			socket.emit("create_proctoring_room", roomId);
		});

		socket.on("mobile_connected", () => {
			console.log("Mobile device paired successfully!");
			setIsMobileConnected(true);
		});

		socket.on("mobile_disconnected", () => {
			console.log("Mobile device disconnected!");
			setIsMobileConnected(false);
			if (hasStartedRef.current) {
				handleViolation(
					"Mobile camera disconnected! Test environment compromised.",
				);
			}
		});

		// Listen for Strikes triggered by the Phone Camera
		socket.on("trigger_laptop_strike", (reason) => {
			// Re-use our existing bulletproof violation handler!
			handleViolation(`Mobile Proctor Alert: ${reason}`);
		});

		return () => socket.disconnect();
	}, [authUser, id]);

	// Timer
	useEffect(() => {
		if (timeLeft <= 0 || loading || !hasStarted || showWarningModal)
			return;
		const timer = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					submitAssessment(true);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [timeLeft, loading, hasStarted, showWarningModal]);

	// Drag Resizer
	useEffect(() => {
		const handleMouseMove = (e) => {
			if (!isDragging || !splitContainerRef.current) return;
			const containerRect =
				splitContainerRef.current.getBoundingClientRect();
			const newLeftWidth =
				((e.clientX - containerRect.left) / containerRect.width) * 100;
			if (newLeftWidth >= 20 && newLeftWidth <= 80)
				setLeftPanelWidth(newLeftWidth);
		};
		const handleMouseUp = () => setIsDragging(false);

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging]);

	// ==========================================
	// BULLETPROOF ANTI-CHEAT ENGINE (With 10s Poller)
	// ==========================================
	const checkIsFullscreen = () => !!document.fullscreenElement;

	const requestFullscreen = async () => {
		const docElm = document.documentElement;
		if (docElm.requestFullscreen) await docElm.requestFullscreen();
		else if (docElm.webkitRequestFullscreen)
			await docElm.webkitRequestFullscreen();
		else if (docElm.mozRequestFullScreen)
			await docElm.mozRequestFullScreen();
		else if (docElm.msRequestFullscreen)
			await docElm.msRequestFullscreen();
	};

	const exitFullscreen = async () => {
		if (document.exitFullscreen && document.fullscreenElement)
			await document.exitFullscreen();
		else if (
			document.webkitExitFullscreen &&
			document.webkitFullscreenElement
		)
			await document.webkitExitFullscreen();
	};

	// Note: We define this function up here so the Socket listener can use it too!
	const handleViolation = (reason) => {
		if (isSubmittingRef.current) return;

		const now = Date.now();
		if (now - lastViolationTime.current < 2000) return;
		lastViolationTime.current = now;

		setWarnings((prev) => {
			const newWarnings = prev + 1;
			setViolationMessage(
				newWarnings >= MAX_WARNINGS
					? `🚨 ${reason}. You reached 3 strikes.`
					: reason,
			);
			setShowWarningModal(true);
			if (newWarnings >= MAX_WARNINGS) {
				submitAssessment(true); // Force auto-submit
			}
			return newWarnings;
		});
	};

	useEffect(() => {
		if (!hasStarted) return;

		const monitorFs = () => {
			const current = checkIsFullscreen();
			if (isFullscreenRef.current !== current) {
				isFullscreenRef.current = current;
				setIsFullscreen(current);
				if (
					!current &&
					hasStartedRef.current &&
					!showWarningModalRef.current
				) {
					handleViolation(
						"Exiting Fullscreen mode is strictly prohibited",
					);
				}
			}
		};

		const handleVisibilityChange = () => {
			if (document.hidden && hasStartedRef.current)
				handleViolation("Switching tabs is strictly prohibited");
		};

		const handleBlur = () => {
			if (hasStartedRef.current && !showWarningModalRef.current) {
				if (!document.hasFocus()) {
					handleViolation(
						"Leaving the assessment window (Virtual Desktops/App switching) is prohibited",
					);
				}
			}
		};

		const preventCopyPaste = (e) => {
			if (hasStartedRef.current && !showWarningModalRef.current) {
				e.preventDefault();
				e.stopPropagation();
				setToastMessage("⚠️ Copying and Pasting is strictly disabled.");
				setTimeout(() => setToastMessage(""), 3000);
			}
		};

		const securityPoller = setInterval(() => {
			if (
				hasStartedRef.current &&
				!showWarningModalRef.current &&
				!isSubmittingRef.current
			) {
				const current = checkIsFullscreen();
				if (!current) {
					handleViolation(
						"Exited Fullscreen mode (Detected by Security Poller)",
					);
					isFullscreenRef.current = false;
					setIsFullscreen(false);
				}
			}
		}, 10000);

		document.addEventListener("fullscreenchange", monitorFs);
		document.addEventListener("webkitfullscreenchange", monitorFs);
		document.addEventListener("mozfullscreenchange", monitorFs);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("blur", handleBlur);
		window.addEventListener("copy", preventCopyPaste, { capture: true });
		window.addEventListener("paste", preventCopyPaste, { capture: true });
		window.addEventListener("contextmenu", preventCopyPaste, {
			capture: true,
		});

		return () => {
			clearInterval(securityPoller);
			document.removeEventListener("fullscreenchange", monitorFs);
			document.removeEventListener("webkitfullscreenchange", monitorFs);
			document.removeEventListener("mozfullscreenchange", monitorFs);
			document.removeEventListener(
				"visibilitychange",
				handleVisibilityChange,
			);
			window.removeEventListener("blur", handleBlur);
			window.removeEventListener("copy", preventCopyPaste, {
				capture: true,
			});
			window.removeEventListener("paste", preventCopyPaste, {
				capture: true,
			});
			window.removeEventListener("contextmenu", preventCopyPaste, {
				capture: true,
			});
		};
	}, [hasStarted]);

	// --- ENFORCED GATEWAY LOGIC ---
	const startAssessment = async () => {
		try {
			await requestFullscreen();
			setTimeout(() => {
				if (checkIsFullscreen()) {
					setHasStarted(true);
					setIsFullscreen(true);
					isFullscreenRef.current = true;
				} else {
					alert(
						"Fullscreen is required to start the assessment. Please click allow.",
					);
				}
			}, 300);
		} catch (err) {
			alert("You must allow fullscreen to take this assessment.");
		}
	};

	const handleAcknowledgeWarning = async () => {
		try {
			await requestFullscreen();
			setTimeout(() => {
				if (checkIsFullscreen()) {
					setShowWarningModal(false);
					setViolationMessage("");
					setIsFullscreen(true);
					isFullscreenRef.current = true;
				} else {
					setToastMessage(
						"Browser blocked request. Please click 'I Understand' again.",
					);
					setTimeout(() => setToastMessage(""), 3000);
				}
			}, 400);
		} catch (e) {
			console.error("Could not return to fullscreen", e);
		}
	};

	const submitAssessment = async (isAutoSubmit = false) => {
		if (isSubmittingRef.current) return;

		isSubmittingRef.current = true;
		setIsSubmitting(true);
		setShowConfirmModal(false);

		try {
			const finalCode = isAutoSubmit ? codeRef.current : code;
			const finalAnswers = isAutoSubmit
				? mcqAnswersRef.current
				: mcqAnswers;

			const res = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/${id}/submit`,
				{ mcqAnswers: finalAnswers, code: finalCode, language: "cpp" },
				{ withCredentials: true },
			);

			if (res) setHasStarted(false);

			setToastMessage(
				`✅ Assessment Submitted! Your score is: ${res.data.totalScore.toFixed(2)}`,
			);

			// --- BUG 3 FIX: Tell Mobile to close session ---
			if (socketRef.current) {
				const roomId = `${id}-${authUser._id}`;
				socketRef.current.emit("end_proctoring_session", roomId);
			}

			if (laptopStreamRef.current) {
				laptopStreamRef.current
					.getTracks()
					.forEach((track) => track.stop());
			}

			setTimeout(async () => {
				if (checkIsFullscreen()) await exitFullscreen();
				router.push("/assessments");
			}, 2000);
		} catch (error) {
			console.error("Submission failed:", error);
			if (!isAutoSubmit) {
				setToastMessage(
					"❌ Failed to submit assessment. Please try again.",
				);
				setTimeout(() => setToastMessage(""), 3000);
			}
			setIsSubmitting(false);
			isSubmittingRef.current = false;
		}
	};

	const handleMcqSelect = (optionIndex) => {
		setMcqAnswers((prev) => ({ ...prev, [currentMcqIndex]: optionIndex }));
	};

	const runCode = async () => {
		setIsCompiling(true);
		setExecutionResults(null);
		try {
			const res = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/assessment/execute`,
				{ code, language: "cpp", testCases: currentDsa.testCases },
				{ withCredentials: true },
			);
			setExecutionResults(res.data.results);
		} catch (error) {
			console.error("Compilation error:", error);
			setExecutionResults([
				{
					hasError: true,
					actualOutput: "Server error or compilation timeout.",
				},
			]);
		} finally {
			setIsCompiling(false);
		}
	};

	const formatTime = (seconds) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	// ==========================================
	// START LAPTOP WEBCAM WHEN TEST STARTS
	// ==========================================

useEffect(() => {
	if (hasStarted) {
		const startLaptopCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: true,
				});
				laptopStreamRef.current = stream;
				setLaptopStream(stream); // TRIGGER RENDER
			} catch (err) {
				handleViolation("Laptop Camera/Mic access is mandatory.");
			}
		};
		startLaptopCamera();
	}
	return () => {
		if (laptopStreamRef.current) {
			laptopStreamRef.current.getTracks().forEach((track) => track.stop());
		}
	};
}, [hasStarted]);

// FORCE VIDEO PLAY
useEffect(() => {
	if (laptopVideoRef.current && laptopStream) {
		laptopVideoRef.current.srcObject = laptopStream;
		laptopVideoRef.current
			.play()
			.catch((e) => console.error("Laptop Video error:", e));
	}
}, [laptopStream]);

	if (loading || authLoading)
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="animate-spin text-blue-500" size={48} />
			</div>
		);
	if (!assessment) return null;

	if (isMobileDevice) {
		return (
			<div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
				<AlertTriangle size={64} className="text-red-500 mb-4" />
				<h1 className="text-2xl font-bold mb-2">Desktop Required</h1>
				<p className="text-slate-400">
					Assessments must be taken on a Laptop or Desktop computer. Mobile
					devices are only used as secondary proctoring cameras.
				</p>
			</div>
		);
	}

	// ==========================================
	// 1. RE-DESIGNED MULTI-DEVICE GATEWAY SCREEN
	// ==========================================
	if (!hasStarted) {
		return (
			<div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
				<div className="max-w-4xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-10">
					{/* LEFT COLUMN: RULES */}
					<div className="flex-1 flex flex-col justify-center">
						<div className="w-16 h-16 bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-6">
							<Info size={32} />
						</div>
						<h1 className="text-3xl font-bold mb-2">{assessment.title}</h1>
						<p className="text-slate-400 mb-8">{assessment.description}</p>

						<div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl text-left shadow-lg">
							<h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
								⚠️ Strict Proctoring Rules
							</h3>
							<ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
								<li>Your browser will be locked into Fullscreen mode.</li>
								<li>
									<strong>
										Do not switch tabs, minimize, or use virtual desktops.
									</strong>
								</li>
								<li>
									<strong>
										Your mobile phone camera must remain active
									</strong>{" "}
									to track your workspace.
								</li>
								<li>3 Strikes will result in automatic submission.</li>
							</ul>
						</div>
					</div>

					{/* RIGHT COLUMN: QR CODE PAIRING */}
					<div className="w-full md:w-80 bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center shadow-inner">
						<h3 className="font-bold text-white mb-2 flex items-center gap-2">
							<Smartphone size={20} className="text-blue-400" /> Step 1:
							Link Device
						</h3>
						<p className="text-xs text-slate-400 mb-6 px-4">
							Scan this QR code with your phone to activate the secondary
							camera.
						</p>

						<div className="bg-white p-4 rounded-xl mb-6 shadow-md">
							{pairingUrl ? (
								<QRCodeSVG value={pairingUrl} size={160} />
							) : (
								<Loader2 className="animate-spin text-slate-800" />
							)}
						</div>

						<div className="w-full mb-6">
							{isMobileConnected ? (
								<div className="bg-green-900/30 border border-green-500/50 text-green-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
									<CheckCircle2 size={20} /> Device Linked!
								</div>
							) : (
								<div className="bg-yellow-900/20 border border-yellow-500/50 text-yellow-500 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
									<Loader2 size={18} className="animate-spin" /> Waiting
									for Mobile...
								</div>
							)}
							<p className="text-[10px] text-slate-500 mt-2">
								Tip: Ensure your laptop is accessed via its Local Network
								IP (e.g. 192.168.x.x) instead of localhost for the phone to
								connect.
							</p>
						</div>

						<button
							onClick={startAssessment}
							disabled={!isMobileConnected}
							className={`w-full font-bold py-4 rounded-xl text-lg transition-all ${
								isMobileConnected
									? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40"
									: "bg-slate-800 text-slate-500 cursor-not-allowed"
							}`}>
							Step 2: Start Test
						</button>
					</div>
				</div>
			</div>
		);
	}

	// 2. RED SCREEN OF DEATH
if (showWarningModal || !isFullscreen) {
	return (
		<div className="min-h-screen bg-red-950 text-white flex flex-col items-center justify-center p-8 text-center relative">
			<AlertTriangle
				size={80}
				className="text-red-500 mb-6 animate-pulse"
			/>
			<h1 className="text-5xl font-black text-white mb-4 tracking-tight">
				PROCTORING WARNING
			</h1>
			<div className="bg-red-900/50 border border-red-500 p-4 rounded-xl mb-6 max-w-lg">
				<p className="text-xl text-red-100 font-bold">
					{violationMessage || "You are out of fullscreen mode."}
				</p>
			</div>

			{warnings >= MAX_WARNINGS ? (
				<div className="text-xl font-bold animate-pulse text-red-300">
					Auto-Submitting Assessment...
				</div>
			) : !isMobileConnected ? (
				// BUG 1 FIX: If mobile is disconnected, they CANNOT proceed.
				<div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 flex flex-col items-center max-w-md shadow-2xl">
					<h3 className="text-2xl font-bold text-red-400 mb-2">
						Secondary Camera Missing!
					</h3>
					<p className="text-slate-300 mb-6 text-sm">
						Your mobile device disconnected. You cannot return to the
						assessment until it is re-linked.
					</p>
					<div className="bg-white p-4 rounded-xl mb-4 shadow-lg">
						<QRCodeSVG value={pairingUrl} size={140} />
					</div>
					<div className="flex items-center gap-2 text-yellow-500 font-bold animate-pulse">
						<Loader2 size={18} className="animate-spin" /> Waiting for
						Mobile...
					</div>
				</div>
			) : (
				<>
					<p className="text-2xl font-bold text-slate-300 mb-2">
						Strike{" "}
						<span className="text-red-500 text-3xl">{warnings}</span> of{" "}
						{MAX_WARNINGS}
					</p>
					<button
						onClick={handleAcknowledgeWarning}
						className="bg-white text-red-900 font-black px-10 py-5 rounded-xl text-xl hover:bg-slate-200 transition-transform hover:scale-105 shadow-2xl">
						I Understand. Return to Test in Fullscreen.
					</button>
				</>
			)}
		</div>
	);
}

	const currentMcq = assessment.mcqs[currentMcqIndex];
	const currentDsa = assessment.dsaQuestions[0];

	return (
		<>
			{/* THE MAIN TEST UI */}
			<div
				className={`h-[100dvh] bg-slate-950 text-white flex flex-col overflow-hidden ${isDragging ? "select-none cursor-col-resize" : ""}`}>
				{toastMessage && (
					<div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[99999] bg-slate-800 border border-slate-600 text-white px-8 py-4 rounded-xl font-bold shadow-2xl animate-bounce text-lg">
						{toastMessage}
					</div>
				)}

				{/* --- FLOATING LAPTOP WEBCAM (Picture-in-Picture) --- */}
				{hasStarted && (
					<div className="fixed bottom-6 right-6 z-[9999] w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 pointer-events-none">
						<video
							autoPlay
							playsInline
							muted
							className="w-full h-full object-cover"
							style={{ transform: "scaleX(-1)" }}
							ref={(node) => {
								if (node && laptopStream) {
									node.srcObject = laptopStream;
									node.play().catch(() => {});
								}
							}}
						/>
						<div className="absolute top-2 right-2 bg-red-600 w-2.5 h-2.5 rounded-full animate-pulse"></div>
					</div>
				)}

				{/* TOP NAVIGATION BAR */}
				<div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
					<div className="flex items-center gap-4">
						<button
							onClick={() => setIsSidebarOpen(!isSidebarOpen)}
							className="text-slate-400 hover:text-white transition-colors"
							title="Toggle Sidebar">
							{isSidebarOpen ? (
								<PanelLeftClose size={24} />
							) : (
								<PanelLeftOpen size={24} />
							)}
						</button>
						<div className="font-bold text-base md:text-lg truncate max-w-xs md:max-w-md">
							{assessment.title}
						</div>
					</div>

					<div className="flex items-center gap-4 md:gap-6">
						<div className="hidden md:flex items-center gap-2 bg-red-950/30 border border-red-900/50 px-3 py-1.5 rounded-lg">
							<AlertTriangle
								size={16}
								className={
									warnings > 0 ? "text-red-500" : "text-slate-500"
								}
							/>
							<span className="text-sm font-bold text-slate-300">
								Strikes:{" "}
								<span
									className={
										warnings > 0 ? "text-red-400" : "text-slate-500"
									}>
									{warnings}/{MAX_WARNINGS}
								</span>
							</span>
						</div>

						<div
							className={`flex items-center gap-2 font-mono text-lg md:text-xl font-bold px-3 py-1.5 rounded-lg ${timeLeft < 300 ? "bg-red-900/50 text-red-400 border border-red-500/50 animate-pulse" : "bg-slate-800 text-blue-400"}`}>
							<Clock size={20} />
							{formatTime(timeLeft)}
						</div>

						{/* THE BUTTON */}
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setShowConfirmModal(true);
							}}
							disabled={isSubmitting}
							className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm md:text-base font-bold py-2 px-4 md:px-6 rounded-lg transition-colors shadow-lg shadow-red-900/20">
							{isSubmitting ? (
								<Loader2 className="animate-spin" size={18} />
							) : null}
							{isSubmitting ? "Grading..." : "End Assessment"}
						</button>
					</div>
				</div>

				<div className="flex-1 flex overflow-hidden relative">
					{/* DYNAMIC LEFT SIDEBAR */}
					<div
						className={`${isSidebarOpen ? "w-64" : "w-16"} bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-10 transition-all duration-300 ease-in-out`}>
						<div
							className={`p-4 border-b border-slate-800 font-bold text-slate-400 uppercase text-xs tracking-wider flex items-center ${isSidebarOpen ? "justify-start" : "justify-center"}`}>
							{isSidebarOpen ? "Sections" : "..."}
						</div>
						<button
							onClick={() => setActiveTab("mcq")}
							title="Multiple Choice"
							className={`flex items-center p-4 font-bold transition-colors border-l-4 ${activeTab === "mcq" ? "bg-slate-800 border-blue-500 text-white" : "border-transparent text-slate-400 hover:bg-slate-800/50"} ${!isSidebarOpen && "justify-center"}`}>
							<FileText
								size={20}
								className={isSidebarOpen ? "mr-3" : "mr-0"}
							/>
							{isSidebarOpen && (
								<span className="truncate">
									MCQ ({assessment.mcqs?.length || 0})
								</span>
							)}
						</button>
						<button
							onClick={() => setActiveTab("dsa")}
							title="Coding Challenge"
							className={`flex items-center p-4 font-bold transition-colors border-l-4 ${activeTab === "dsa" ? "bg-slate-800 border-blue-500 text-white" : "border-transparent text-slate-400 hover:bg-slate-800/50"} ${!isSidebarOpen && "justify-center"}`}>
							<Code2
								size={20}
								className={isSidebarOpen ? "mr-3" : "mr-0"}
							/>
							{isSidebarOpen && (
								<span className="truncate">
									Coding ({assessment.dsaQuestions?.length || 0})
								</span>
							)}
						</button>
					</div>

					{/* MAIN CONTENT AREA */}
					<div className="flex-1 bg-slate-950 flex overflow-hidden relative">
						{isDragging && (
							<div className="absolute inset-0 z-50 cursor-col-resize" />
						)}

						{/* MCQ SECTION */}
						{activeTab === "mcq" && currentMcq && (
							<div className="w-full h-full overflow-y-auto custom-scrollbar">
								<div className="max-w-3xl mx-auto p-8 mt-8">
									<div className="flex justify-between items-center mb-8">
										<h2 className="text-2xl font-bold">
											Question {currentMcqIndex + 1} of{" "}
											{assessment.mcqs.length}
										</h2>
										<span className="text-slate-400 font-bold">
											{currentMcq.marks} Pts
										</span>
									</div>
									<p className="text-lg text-slate-200 mb-8 bg-slate-900 p-6 rounded-xl border border-slate-800">
										{currentMcq.question}
									</p>
									<div className="space-y-4 mb-12">
										{currentMcq.options.map((option, idx) => (
											<button
												key={idx}
												onClick={() => handleMcqSelect(idx)}
												className={`w-full text-left p-4 rounded-xl border transition-all font-medium ${mcqAnswers[currentMcqIndex] === idx ? "bg-blue-600/20 border-blue-500 text-blue-100 ring-2 ring-blue-500/50" : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800"}`}>
												<span className="inline-block w-8 h-8 text-center leading-8 rounded-lg bg-slate-950 mr-4 font-bold border border-slate-700">
													{String.fromCharCode(65 + idx)}
												</span>
												{option}
											</button>
										))}
									</div>
									<div className="flex justify-between">
										<button
											disabled={currentMcqIndex === 0}
											onClick={() =>
												setCurrentMcqIndex((prev) => prev - 1)
											}
											className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold disabled:opacity-50">
											<ChevronLeft size={20} /> Previous
										</button>
										{currentMcqIndex < assessment.mcqs.length - 1 ? (
											<button
												onClick={() =>
													setCurrentMcqIndex((prev) => prev + 1)
												}
												className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold">
												Next <ChevronRight size={20} />
											</button>
										) : (
											<button
												onClick={() => setActiveTab("dsa")}
												className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold">
												Move to Coding <ChevronRight size={20} />
											</button>
										)}
									</div>
								</div>
							</div>
						)}

						{/* DSA SECTION */}
						{activeTab === "dsa" && currentDsa && (
							<div
								ref={splitContainerRef}
								className="flex flex-1 w-full h-full overflow-hidden">
								<div
									style={{ width: `${leftPanelWidth}%` }}
									className="p-6 overflow-y-auto bg-slate-950 custom-scrollbar pb-32">
									<div className="flex items-center justify-between mb-6">
										<h2 className="text-2xl font-bold">
											{currentDsa.title}
										</h2>
										<span
											className={`px-3 py-1 text-xs font-bold rounded-full border ${currentDsa.difficulty === "Easy" ? "bg-green-900/30 text-green-400 border-green-500/30" : "bg-yellow-900/30 text-yellow-400 border-yellow-500/30"}`}>
											{currentDsa.difficulty}
										</span>
									</div>
									<div className="prose prose-invert max-w-none mb-8">
										<p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
											{currentDsa.problemStatement}
										</p>
									</div>
									<div className="bg-blue-950/20 border border-blue-900/50 rounded-xl p-5 mb-8">
										<h3 className="text-blue-400 font-bold flex items-center gap-2 mb-2">
											<Info size={18} /> Input Format
										</h3>
										<p className="text-sm text-slate-300 whitespace-pre-wrap">
											{currentDsa.inputFormat ||
												"Read inputs from Standard Input (cin). Print to Standard Output (cout)."}
										</p>
									</div>
									<h3 className="text-lg font-bold text-slate-400 mb-4 border-b border-slate-800 pb-2">
										Constraints:
									</h3>
									<pre className="bg-slate-900 p-4 rounded-xl text-slate-300 font-mono text-sm border border-slate-800 mb-8 whitespace-pre-wrap">
										{currentDsa.constraints}
									</pre>
									<h3 className="text-lg font-bold text-slate-400 mb-4 border-b border-slate-800 pb-2">
										Examples:
									</h3>
									{(currentDsa.testCases || []).map((tc, idx) => (
										<div
											key={idx}
											className="bg-slate-900 border border-slate-800 rounded-xl mb-4 overflow-hidden">
											<div className="bg-slate-800/50 px-4 py-2 border-b border-slate-800 font-bold text-xs text-slate-400 uppercase">
												Test Case {idx + 1}
											</div>
											<div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
												<div>
													<div className="text-xs text-slate-500 mb-1">
														Standard Input
													</div>
													<pre className="text-blue-300 font-mono text-sm whitespace-pre-wrap bg-black/30 p-2 rounded">
														{tc.input}
													</pre>
												</div>
												<div>
													<div className="text-xs text-slate-500 mb-1">
														Expected Output
													</div>
													<pre className="text-green-300 font-mono text-sm whitespace-pre-wrap bg-black/30 p-2 rounded">
														{tc.expectedOutput}
													</pre>
												</div>
											</div>
										</div>
									))}
								</div>

								<div
									onMouseDown={(e) => {
										e.preventDefault();
										setIsDragging(true);
									}}
									className={`w-2 md:w-1.5 cursor-col-resize bg-slate-800 hover:bg-blue-500 flex flex-col justify-center items-center shrink-0 z-20 transition-colors ${isDragging ? "bg-blue-500" : ""}`}>
									<div className="bg-slate-950 p-0.5 rounded shadow-sm border border-slate-700">
										<GripVertical size={16} className="text-slate-400" />
									</div>
								</div>

								<div
									style={{ width: `${100 - leftPanelWidth}%` }}
									className="flex flex-col bg-[#1e1e1e]">
									<div className="h-12 bg-slate-900 flex justify-between items-center px-4 border-b border-black shrink-0">
										<div className="text-sm font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded px-3 py-1">
											C++ (GCC)
										</div>
										<button
											onClick={runCode}
											disabled={isCompiling}
											className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-50">
											{isCompiling ? (
												<Loader2 className="animate-spin" size={16} />
											) : (
												<Play size={16} />
											)}{" "}
											Run Code
										</button>
									</div>
									<div className="flex-1">
										<Editor
											height="100%"
											language="cpp"
											theme="vs-dark"
											value={code}
											onChange={(value) => setCode(value)}
											options={{
												minimap: { enabled: false },
												fontSize: 16,
												wordWrap: "on",
												padding: { top: 16 },
												scrollBeyondLastLine: false,
											}}
										/>
									</div>
									<div className="h-48 md:h-64 bg-slate-950 border-t border-slate-800 p-4 overflow-y-auto shrink-0 font-mono text-sm custom-scrollbar">
										<div className="text-slate-500 mb-4 font-bold uppercase tracking-wider text-xs">
											Terminal Output
										</div>
										{!executionResults && !isCompiling && (
											<div className="text-slate-400">
												Click "Run Code" to compile and execute your
												solution against the visible test cases.
											</div>
										)}
										{isCompiling && (
											<div className="text-blue-400 flex items-center gap-2 animate-pulse">
												<Loader2 size={16} className="animate-spin" />{" "}
												Compiling and running on server...
											</div>
										)}
										{executionResults && (
											<div className="space-y-4">
												{executionResults.map((result, idx) => (
													<div
														key={idx}
														className={`p-4 rounded-lg border ${result.passed ? "bg-green-950/20 border-green-900/50" : "bg-red-950/20 border-red-900/50"}`}>
														<div className="flex items-center gap-2 font-bold mb-2">
															{result.passed ? (
																<span className="text-green-400 flex items-center gap-1">
																	✅ Test Case {idx + 1} Passed
																</span>
															) : (
																<span className="text-red-400 flex items-center gap-1">
																	❌ Test Case {idx + 1} Failed
																</span>
															)}
														</div>
														<div className="grid grid-cols-1 gap-2 text-xs">
															<div>
																<span className="text-slate-500">
																	Expected:
																</span>{" "}
																<span className="text-green-300 ml-2 whitespace-pre-wrap">
																	{result.expectedOutput}
																</span>
															</div>
															<div>
																<span className="text-slate-500">
																	Output:
																</span>{" "}
																<span
																	className={
																		result.hasError
																			? "text-red-400 whitespace-pre-wrap ml-2"
																			: "text-slate-300 ml-2 whitespace-pre-wrap"
																	}>
																	{result.actualOutput ||
																		"No output generated"}
																</span>
															</div>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* --- THE MODAL IS NOW OUTSIDE THE APP CONTAINER TO FIX CSS Z-INDEX HIDING --- */}
			{showConfirmModal && (
				<div
					style={{ zIndex: 9999999 }}
					className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
					<div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
						<h2 className="text-3xl font-black text-white mb-4">
							Submit Assessment?
						</h2>
						<p className="text-slate-300 mb-8 text-lg">
							Are you sure you want to end the test? You will not be able
							to modify your answers after this.
						</p>
						<div className="flex gap-4">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setShowConfirmModal(false);
								}}
								className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">
								Cancel
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									submitAssessment(false);
								}}
								className="flex-1 px-6 py-4 rounded-xl font-bold bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center justify-center gap-2">
								{isSubmitting ? (
									<Loader2 className="animate-spin" size={18} />
								) : null}
								Yes, Submit
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
