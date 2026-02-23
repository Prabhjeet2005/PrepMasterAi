"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import Editor from "@monaco-editor/react";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
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
	Smartphone,
	CheckCircle2,
	Camera,
	ShieldCheck,
	Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import * as faceapi from "@vladmandic/face-api";

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

	// --- PROCTORING & ONBOARDING STATES ---
	const [setupStep, setSetupStep] = useState(1); // 1: Rules, 2: Mobile Link, 3: Verification
	const [hasStarted, setHasStarted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [warnings, setWarnings] = useState(0);
	const [showWarningModal, setShowWarningModal] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [violationMessage, setViolationMessage] = useState("");
	const [warningCountdown, setWarningCountdown] = useState(60);
	const MAX_WARNINGS = 300;

	const [isMobileConnected, setIsMobileConnected] = useState(false);
	const [pairingUrl, setPairingUrl] = useState("");
	const [isMobileDevice, setIsMobileDevice] = useState(false);
	const [laptopStream, setLaptopStream] = useState(null);
	const [toastMessage, setToastMessage] = useState("");

	const codeRef = useRef(code);
	const mcqAnswersRef = useRef(mcqAnswers);
	const isFullscreenRef = useRef(false);
	const hasStartedRef = useRef(false);
	const lastViolationTime = useRef(0);
	const isSubmittingRef = useRef(isSubmitting);
	const showWarningModalRef = useRef(showWarningModal);
	const socketRef = useRef(null);

	const laptopVideoRef = useRef(null);
	const laptopStreamRef = useRef(null);
	const warningsRef = useRef(0);

	const faceDetectionIntervalRef = useRef(null);
	const lookAwayTimerRef = useRef(0);

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
				router.push("/assessments");
			} finally {
				setLoading(false);
			}
		};
		if (id) fetchAssessment();
	}, [id, authUser, authLoading, router]);

	// SOCKET PAIRING
	useEffect(() => {
		if (!authUser || !id) return;
		const roomId = `${id}-${authUser._id}`;
		if (typeof window !== "undefined") {
			setPairingUrl(
				`${window.location.protocol}//${window.location.host}/mobile-proctor/${roomId}`,
			);
		}
		const socket = io(process.env.NEXT_PUBLIC_API_URL);
		socketRef.current = socket;

		socket.on("connect", () => {
			socket.emit("create_proctoring_room", roomId);
		});
		socket.on("mobile_connected", () => {
			setIsMobileConnected(true);
		});
		socket.on("mobile_disconnected", () => {
			setIsMobileConnected(false);
			if (hasStartedRef.current)
				handleViolation(
					"Mobile camera disconnected! Test environment compromised.",
				);
		});
		socket.on("trigger_laptop_strike", (reason) => {
			handleViolation(`Mobile Proctor Alert: ${reason}`);
		});

		return () => socket.disconnect();
	}, [authUser, id]);

	// START LAPTOP CAMERA IMMEDIATELY ON LOAD
	useEffect(() => {
		if (isMobileDevice) return;
		const startLaptopCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: true,
				});
				laptopStreamRef.current = stream;
				setLaptopStream(stream);
			} catch (err) {
				handleViolation("Laptop Camera/Mic access is mandatory.");
			}
		};
		startLaptopCamera();

		return () => {
			if (laptopStreamRef.current)
				laptopStreamRef.current
					.getTracks()
					.forEach((track) => track.stop());
		};
	}, [isMobileDevice]);

	// BIND VIDEO (Added setupStep dependency so it attaches correctly in Step 3)
	useEffect(() => {
		if (laptopVideoRef.current && laptopStream && setupStep === 3) {
			laptopVideoRef.current.srcObject = laptopStream;
			laptopVideoRef.current
				.play()
				.catch((e) => console.error("Laptop Play Error:", e));
		}
	}, [laptopStream, hasStarted, setupStep]);

	// TEST DURATION TIMER
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

	// 60-SECOND IDLE WARNING TIMER
	useEffect(() => {
		if (!showWarningModal || isSubmitting || warnings >= MAX_WARNINGS)
			return;
		const idleTimer = setInterval(() => {
			setWarningCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(idleTimer);
					submitAssessment(true);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(idleTimer);
	}, [showWarningModal, isSubmitting, warnings]);

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
	// PRE-TEST 5-SECOND MOBILE MONITOR
	// ==========================================
	useEffect(() => {
		if (hasStarted) return;

		// Checks every 5 seconds if the mobile connection dropped while in Step 3
		const preTestPoller = setInterval(() => {
			if (setupStep === 3 && !isMobileConnected) {
				setSetupStep(2);
				toast.error("⚠️ Mobile camera disconnected. Please reconnect.");
			}
		}, 5000);

		// Instant fallback just in case the socket catches it before the 5s timer
		if (setupStep === 3 && !isMobileConnected) {
			setSetupStep(2);
			toast.error("⚠️ Mobile camera disconnected. Please reconnect.");
		}

		return () => clearInterval(preTestPoller);
	}, [setupStep, isMobileConnected, hasStarted]);

	// ==========================================
	// AI VISION ENGINE: LAPTOP FACE TRACKING
	// ==========================================
	useEffect(() => {
		// Only run when the assessment is active and the laptop video is physically playing
		if (!hasStarted || !laptopStream || !laptopVideoRef.current) return;

		const loadAiModels = async () => {
			try {
				// Load the lightweight Face Detector model from a fast CDN (Zero Server Cost)
				const MODEL_URL =
					"https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
				await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
				console.log("✅ Local Browser AI Vision Loaded");
				startFaceTracking();
			} catch (err) {
				console.error("AI Model Load Error:", err);
			}
		};

		const startFaceTracking = () => {
			const video = laptopVideoRef.current;

			// Scan the video feed every 1.5 seconds (Saves CPU, prevents lag)
			faceDetectionIntervalRef.current = setInterval(async () => {
				// Halt scanning if they are on the warning screen or submitting
				if (showWarningModalRef.current || isSubmittingRef.current) return;
				if (!video || video.paused || video.ended) return;

				const detections = await faceapi.detectAllFaces(
					video,
					new faceapi.TinyFaceDetectorOptions({
						inputSize: 224,
						scoreThreshold: 0.5,
					}),
				);

				const faceCount = detections.length;

				if (faceCount === 0) {
					lookAwayTimerRef.current += 1;
					// 3 consecutive missed scans (1.5s * 3 = 7.5 seconds of missing/looking away)
					if (lookAwayTimerRef.current >= 5) {
						handleViolation(
							"Candidate's Face is not in the Frame",
						);
						lookAwayTimerRef.current = 0;
					}
				} else if (faceCount > 1) {
					handleViolation(
						"Multiple faces detected! Unauthorized assistance suspected.",
					);
					lookAwayTimerRef.current = 0;
				} else {
					// Exactly 1 face is present, reset the looking away timer
					lookAwayTimerRef.current = 0;
				}
			}, 1500);
		};

		loadAiModels();

		return () => {
			if (faceDetectionIntervalRef.current)
				clearInterval(faceDetectionIntervalRef.current);
		};
	}, [hasStarted, laptopStream]);

	// ==========================================
	// BULLETPROOF PROCTORING ENGINE
	// ==========================================
	const checkIsFullscreen = () => {
		if (typeof window === "undefined") return false;
		const isDOMFullscreen = !!(
			document.fullscreenElement ||
			document.webkitFullscreenElement ||
			document.mozFullScreenElement ||
			document.msFullscreenElement
		);
		const isPhysicallyFullscreen =
			window.innerHeight >= window.screen.height - 15;
		return isDOMFullscreen && isPhysicallyFullscreen;
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

	const submitAssessment = async (isAutoSubmit = false) => {
		if (isSubmittingRef.current) return;
		isSubmittingRef.current = true;
		setTimeLeft(0);
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
			toast.success(
				`Assessment Submitted! Your score is: ${res.data.totalScore.toFixed(2)}`,
			);

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
			if (!isAutoSubmit) {
				toast.error("Failed to submit assessment. Please try again.");
			}
			setIsSubmitting(false);
			isSubmittingRef.current = false;
		}
	};

	const handleViolation = (reason) => {
		if (isSubmittingRef.current) return;
		const now = Date.now();
		if (now - lastViolationTime.current < 2000) return;
		lastViolationTime.current = now;

		warningsRef.current += 1;
		const currentWarnings = warningsRef.current;

		setWarnings(currentWarnings);
		setWarningCountdown(60);
		setViolationMessage(
			currentWarnings >= MAX_WARNINGS
				? `🚨 ${reason}. You reached 3 strikes.`
				: reason,
		);
		setShowWarningModal(true);

		if (currentWarnings >= MAX_WARNINGS) {
			submitAssessment(true);
		}
	};

	useEffect(() => {
		if (!hasStarted) return;

		const verifySecureEnvironment = () => {
			if (
				showWarningModalRef.current ||
				isSubmittingRef.current ||
				!hasStartedRef.current
			)
				return;
			if (!checkIsFullscreen()) {
				isFullscreenRef.current = false;
				setIsFullscreen(false);
				handleViolation("Exited Fullscreen mode");
			}
		};

		const onResize = () => setTimeout(verifySecureEnvironment, 200);

		const onVisibilityChange = () => {
			if (
				document.hidden &&
				hasStartedRef.current &&
				!showWarningModalRef.current
			) {
				handleViolation(
					"Switching tabs or minimizing is strictly prohibited",
				);
			}
		};

		const onBlur = () => {
			if (
				!document.hasFocus() &&
				hasStartedRef.current &&
				!showWarningModalRef.current
			) {
				handleViolation("Leaving the assessment window is prohibited");
			}
		};

		const onCopyPaste = (e) => {
			if (hasStartedRef.current && !showWarningModalRef.current) {
				e.preventDefault();
				e.stopPropagation();
				toast.error("Copying and Pasting is strictly disabled.");
			}
		};

		const poller = setInterval(verifySecureEnvironment, 1000);

		window.addEventListener("resize", onResize);
		document.addEventListener("fullscreenchange", verifySecureEnvironment);
		document.addEventListener(
			"webkitfullscreenchange",
			verifySecureEnvironment,
		);
		document.addEventListener("visibilitychange", onVisibilityChange);
		window.addEventListener("blur", onBlur);
		window.addEventListener("copy", onCopyPaste, { capture: true });
		window.addEventListener("paste", onCopyPaste, { capture: true });
		window.addEventListener("contextmenu", onCopyPaste, { capture: true });

		return () => {
			clearInterval(poller);
			window.removeEventListener("resize", onResize);
			document.removeEventListener(
				"fullscreenchange",
				verifySecureEnvironment,
			);
			document.removeEventListener(
				"webkitfullscreenchange",
				verifySecureEnvironment,
			);
			document.removeEventListener("visibilitychange", onVisibilityChange);
			window.removeEventListener("blur", onBlur);
			window.removeEventListener("copy", onCopyPaste, { capture: true });
			window.removeEventListener("paste", onCopyPaste, { capture: true });
			window.removeEventListener("contextmenu", onCopyPaste, {
				capture: true,
			});
		};
	}, [hasStarted]);

	// ==========================================
	// SMART RETRY FULLSCREEN ENGINE
	// ==========================================
	const enterFullscreenAndExecute = (onSuccess, onFail) => {
		const docElm = document.documentElement;
		let fsPromise;

		if (docElm.requestFullscreen) fsPromise = docElm.requestFullscreen();
		else if (docElm.webkitRequestFullscreen)
			fsPromise = docElm.webkitRequestFullscreen();
		else if (docElm.mozRequestFullScreen)
			fsPromise = docElm.mozRequestFullScreen();
		else if (docElm.msRequestFullscreen)
			fsPromise = docElm.msRequestFullscreen();

		if (fsPromise !== undefined) {
			fsPromise
				.then(() => {
					let attempts = 0;
					const verifyLoop = setInterval(() => {
						attempts++;
						if (checkIsFullscreen()) {
							clearInterval(verifyLoop);
							onSuccess();
						} else if (attempts >= 15) {
							clearInterval(verifyLoop);
							if (checkIsFullscreen()) {
								onSuccess();
							} else {
								onFail("Fullscreen animation failed. Please click again.");
							}
						}
					}, 100);
				})
				.catch(() => {
					onFail(
						"Browser blocked fullscreen. Please click 'Allow' or click anywhere on screen first.",
					);
				});
		} else {
			setTimeout(() => {
				if (checkIsFullscreen()) onSuccess();
				else onFail("Fullscreen not supported or denied.");
			}, 1000);
		}
	};

	const startAssessment = async () => {
		if (
			document.fullscreenElement &&
			window.innerHeight < window.screen.height - 15
		) {
			try {
				await exitFullscreen();
			} catch (e) {
				toast.error("Browser Blocked Fullscreen");
			}
		}

		enterFullscreenAndExecute(
			() => {
				setHasStarted(true);
				setIsFullscreen(true);
				isFullscreenRef.current = true;
			},
			(err) => {
				toast.error("Some Error Occured");
			},
		);
	};

	const handleAcknowledgeWarning = async () => {
		if (
			document.fullscreenElement &&
			window.innerHeight < window.screen.height - 15
		) {
			try {
				await exitFullscreen();
			} catch (e) {}
		}

		enterFullscreenAndExecute(
			() => {
				setViolationMessage("");
				setIsFullscreen(true);
				isFullscreenRef.current = true;
				setShowWarningModal(false);
			},
			(err) => {
				toast.error("Some Error Occured");
			},
		);
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

	const currentMcq = assessment.mcqs[currentMcqIndex];
	const currentDsa = assessment.dsaQuestions[0];

	return (
		<>
			{toastMessage && (
				<div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[99999] bg-slate-800 border border-slate-600 text-white px-8 py-4 rounded-xl font-bold shadow-2xl animate-bounce text-lg">
					{toastMessage}
				</div>
			)}

			{/* 1. 3-PHASE GATEWAY SCREEN */}
			<div
				className={`min-h-screen bg-slate-950 text-white flex-col items-center justify-center p-4 md:p-8 ${!hasStarted ? "flex" : "hidden"}`}>
				<div className="max-w-5xl w-full flex flex-col items-center">
					{/* Step Indicators */}
					<div className="flex items-center gap-4 mb-10 w-full max-w-2xl px-4">
						<div
							className={`flex flex-col items-center gap-2 ${setupStep >= 1 ? "text-blue-500" : "text-slate-600"}`}>
							<div
								className={`w-10 h-10 p-3 rounded-full flex items-center justify-center font-bold border-2 ${setupStep >= 1 ? "bg-blue-600/20 border-blue-500" : "border-slate-600"}`}>
								1
							</div>
							<span className="text-xs font-bold uppercase tracking-wider">
								Rules
							</span>
						</div>
						<div
							className={`flex-1 h-1 mb-4 rounded ${setupStep >= 2 ? "bg-blue-500" : "bg-slate-800"}`}></div>
						<div
							className={`flex flex-col items-center gap-2 ${setupStep >= 2 ? "text-blue-500" : "text-slate-600"}`}>
							<div
								className={`w-10 h-10 p-3 rounded-full flex items-center justify-center font-bold border-2 ${setupStep >= 2 ? "bg-blue-600/20 border-blue-500" : "border-slate-600"}`}>
								2
							</div>
							<span className="text-xs font-bold uppercase tracking-wider">
								Pairing
							</span>
						</div>
						<div
							className={`flex-1 h-1 mb-4 rounded ${setupStep >= 3 ? "bg-blue-500" : "bg-slate-800"}`}></div>
						<div
							className={`flex flex-col items-center gap-2 ${setupStep >= 3 ? "text-blue-500" : "text-slate-600"}`}>
							<div
								className={`w-10 h-10 p-3 rounded-full flex items-center justify-center font-bold border-2 ${setupStep >= 3 ? "bg-blue-600/20 border-blue-500" : "border-slate-600"}`}>
								3
							</div>
							<span className="text-xs font-bold uppercase tracking-wider">
								Verify
							</span>
						</div>
					</div>

					<div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-3xl shadow-2xl w-full transition-all duration-500">
						{/* PHASE 1: RULES */}
						{setupStep === 1 && (
							<div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
								<div className="w-16 h-16 bg-red-950/50 text-red-500 border border-red-900 rounded-full flex items-center justify-center mb-6">
									<AlertTriangle size={32} />
								</div>
								<h1 className="text-3xl font-bold mb-4">
									Environment Requirements
								</h1>
								<p className="text-slate-400 mb-8 max-w-lg">
									This is a strictly proctored assessment. Ensure you are
									in a quiet room before proceeding.
								</p>

								<div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-8 text-left w-full max-w-xl">
									<ul className="text-base text-slate-300 space-y-4">
										<li className="flex items-start gap-3">
											<Lock
												className="text-blue-400 mt-1 shrink-0"
												size={18}
											/>
											<span>
												Your browser will be locked into{" "}
												<b>Fullscreen mode</b>.
											</span>
										</li>
										<li className="flex items-start gap-3">
											<Lock
												className="text-blue-400 mt-1 shrink-0"
												size={18}
											/>
											<span>
												<b>
													Tab switching, minimizing, or virtual desktops
												</b>{" "}
												will result in instant strikes.
											</span>
										</li>
										<li className="flex items-start gap-3">
											<Lock
												className="text-blue-400 mt-1 shrink-0"
												size={18}
											/>
											<span>
												<b>Copy/Paste</b> functionality is disabled.
											</span>
										</li>
										<li className="flex items-start gap-3">
											<Camera
												className="text-red-400 mt-1 shrink-0"
												size={18}
											/>
											<span>
												Both your <b>Laptop & Mobile Camera</b> must remain
												active.
											</span>
										</li>
									</ul>
								</div>
								<button
									onClick={() => setSetupStep(2)}
									className="bg-blue-600 w-fit p-4 hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
									I Agree, Proceed to Setup <ChevronRight size={20} />
								</button>
							</div>
						)}

						{/* PHASE 2: MOBILE PAIRING */}
						{setupStep === 2 && (
							<div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-8">
								<h1 className="text-3xl font-bold mb-2">
									Link Secondary Device
								</h1>
								<p className="text-slate-400 mb-8 max-w-lg">
									We use your mobile phone as a secondary camera to monitor
									your workspace.
								</p>

								<div className="bg-white p-6 rounded-2xl mb-6 shadow-xl relative">
									{pairingUrl ? (
										<QRCodeSVG value={pairingUrl} size={200} />
									) : (
										<div className="w-[200px] h-[200px] flex items-center justify-center">
											<Loader2
												className="animate-spin text-slate-800"
												size={40}
											/>
										</div>
									)}
								</div>

								<div className="mb-8 h-12 flex items-center justify-center">
									{isMobileConnected ? (
										<div className="bg-green-900/30 border border-green-500/50 text-green-400 font-bold py-3 px-6 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
											<CheckCircle2 size={24} /> Mobile Device Successfully
											Paired!
										</div>
									) : (
										<div className="bg-yellow-900/20 border border-yellow-500/50 text-yellow-500 font-bold py-3 px-6 rounded-xl flex items-center gap-3">
											<Loader2 size={20} className="animate-spin" />{" "}
											Waiting for device scan...
										</div>
									)}
								</div>

								<div className="flex gap-4">
									<button
										onClick={() => setSetupStep(1)}
										className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 px-8 rounded-xl transition-all">
										Back
									</button>
									<button
										onClick={() => setSetupStep(3)}
										disabled={!isMobileConnected}
										className={`font-bold p-4 rounded-xl text-lg transition-all flex items-center gap-2 ${isMobileConnected ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}>
										Verify Cameras <ChevronRight size={20} />
									</button>
								</div>
							</div>
						)}

						{/* PHASE 3: CAMERA VERIFICATION */}
						{setupStep === 3 && (
							<div className="flex flex-col items-center animate-in fade-in slide-in-from-right-8 w-full">
								<h1 className="text-3xl font-bold mb-2">
									Final Verification
								</h1>
								<p className="text-slate-400 mb-8 text-center max-w-lg">
									Please ensure your face is visible on your laptop and
									your mobile device is propped up to show your hands.
								</p>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-10">
									{/* LAPTOP FEED */}
									<div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col items-center shadow-inner">
										<h3 className="font-bold text-slate-300 mb-3 flex items-center gap-2">
											<Camera size={18} className="text-blue-400" />{" "}
											Primary Camera (Laptop)
										</h3>
										<div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-slate-700">
											{laptopStream ? (
												<video
													ref={laptopVideoRef}
													autoPlay
													playsInline
													muted
													className="w-full h-full object-cover"
													style={{ transform: "scaleX(-1)" }}
												/>
											) : (
												<div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
													<Loader2 className="animate-spin mb-2" />{" "}
													Activating...
												</div>
											)}
											<div className="absolute top-3 left-3 bg-black/60 px-3 py-1 text-xs font-bold rounded-lg text-white flex items-center gap-2">
												<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>{" "}
												Tracking Active
											</div>
										</div>
									</div>

									{/* MOBILE FEED (Verified Status) */}
									<div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col items-center shadow-inner">
										<h3 className="font-bold text-slate-300 mb-3 flex items-center gap-2">
											<Smartphone size={18} className="text-purple-400" />{" "}
											Secondary Camera (Mobile)
										</h3>
										<div className="w-full aspect-video bg-slate-900 border-2 border-dashed border-slate-700 p-4 mt-8 rounded-xl flex flex-col items-center justify-center relative">
											{isMobileConnected ? (
												<>
													<div className="w-16 h-16 bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
														<CheckCircle2 size={32} />
													</div>
													<span className="font-bold text-green-400 text-lg">
														Stream Linked Successfully
													</span>
													<span className="text-xs text-slate-500 mt-2 font-medium bg-slate-800 px-3 py-1 rounded-full">
														Preview visible on mobile device
													</span>
												</>
											) : (
												<>
													<div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/30 animate-pulse">
														<AlertTriangle size={32} />
													</div>
													<span className="font-bold text-red-400 text-lg">
														Connection Lost
													</span>
													<span className="text-xs text-slate-500 mt-2 font-medium bg-slate-800 px-3 py-1 rounded-full">
														Redirecting to pairing...
													</span>
												</>
											)}
										</div>
									</div>
								</div>

								<div className="flex gap-4 w-full justify-center">
									<button
										onClick={() => setSetupStep(2)}
										className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 px-8 rounded-xl transition-all">
										Back
									</button>
									<button
										onClick={startAssessment}
										disabled={!laptopStream || !isMobileConnected}
										className={`font-bold p-4 rounded-xl text-xl transition-all flex items-center gap-2 ${laptopStream && isMobileConnected ? "bg-green-600 hover:bg-green-500 text-white shadow-[0_0_30px_rgba(22,163,74,0.4)]" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}>
										{laptopStream && isMobileConnected
											? "Start Assessment"
											: "Waiting for Cameras..."}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* 2. RED SCREEN OF DEATH (UPDATED BUTTON UI) */}
			<div
				className={`min-h-screen bg-red-950 text-white flex-col items-center justify-center p-8 text-center relative z-[99999] ${showWarningModal || (!isFullscreen && hasStarted) ? "flex" : "hidden"}`}>
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
						<div className="text-lg font-bold text-red-400 mt-4">
							Auto-submitting in {warningCountdown}s...
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center w-full max-w-xl">
						<p className="text-2xl font-bold text-slate-300 mb-2">
							Strike{" "}
							<span className="text-red-500 text-3xl">{warnings}</span> of{" "}
							{MAX_WARNINGS}
						</p>
						<div className="text-xl font-bold animate-pulse text-red-300 mb-8">
							Auto-submitting in {warningCountdown}s if ignored...
						</div>

						{/* THE NEW "PRETTY" I UNDERSTAND BUTTON */}
						<button
							onClick={handleAcknowledgeWarning}
							className="group relative w-fit flex justify-center py-5 px-8 border-2 border-blue-400 text-xl font-black rounded-2xl text-white bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 focus:outline-none shadow-[0_0_40px_rgba(37,99,235,0.6)] transform transition-all hover:scale-105 active:scale-95 overflow-hidden">
							<div className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent transition-colors"></div>
							<span className="flex items-center p-3 gap-3 relative z-10">
								<ShieldCheck size={28} className=" text-blue-200" />I
								Understand, Return to Test
							</span>
						</button>
						<p className="text-slate-500 text-sm mt-4">
							Clicking this will automatically restore your fullscreen
							session.
						</p>
					</div>
				)}
			</div>

			{/* 3. MAIN TEST UI */}
			<div
				className={`h-[100dvh] bg-slate-950 text-white flex-col overflow-hidden ${isDragging ? "select-none cursor-col-resize" : ""} ${hasStarted && isFullscreen && !showWarningModal ? "flex" : "hidden"}`}>
				{/* TOP NAVIGATION BAR */}
				<div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
					<div className="flex items-center gap-4">
						<button
							onClick={() => setIsSidebarOpen(!isSidebarOpen)}
							className="text-slate-400 hover:text-white transition-colors">
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
						<button
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setShowConfirmModal(true);
							}}
							disabled={isSubmitting}
							className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm md:text-base font-bold py-2 px-4 md:px-6 rounded-lg shadow-lg shadow-red-900/20">
							{isSubmitting ? (
								<Loader2 className="animate-spin" size={18} />
							) : null}{" "}
							{isSubmitting ? "Grading..." : "End Assessment"}
						</button>
					</div>
				</div>

				<div className="flex-1 flex overflow-hidden relative">
					<div
						className={`${isSidebarOpen ? "w-64" : "w-16"} bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-10 transition-all duration-300 ease-in-out`}>
						<button
							onClick={() => setActiveTab("mcq")}
							className={`flex items-center p-4 font-bold transition-colors border-l-4 ${activeTab === "mcq" ? "bg-slate-800 border-blue-500 text-white" : "border-transparent text-slate-400"}`}>
							<FileText
								size={20}
								className={isSidebarOpen ? "mr-3" : "mr-0"}
							/>
							{isSidebarOpen && "MCQ"}
						</button>
						<button
							onClick={() => setActiveTab("dsa")}
							className={`flex items-center p-4 font-bold transition-colors border-l-4 ${activeTab === "dsa" ? "bg-slate-800 border-blue-500 text-white" : "border-transparent text-slate-400"}`}>
							<Code2
								size={20}
								className={isSidebarOpen ? "mr-3" : "mr-0"}
							/>
							{isSidebarOpen && "Coding"}
						</button>
					</div>

					<div className="flex-1 bg-slate-950 flex overflow-hidden relative">
						{isDragging && (
							<div className="absolute inset-0 z-50 cursor-col-resize" />
						)}
						{activeTab === "mcq" && currentMcq && (
							<div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
								<h2 className="text-2xl font-bold mb-8">
									Question {currentMcqIndex + 1}
								</h2>
								<p className="text-lg text-slate-200 mb-8 bg-slate-900 p-6 rounded-xl border border-slate-800">
									{currentMcq.question}
								</p>
								<div className="space-y-4 mb-12">
									{currentMcq.options.map((option, idx) => (
										<button
											key={idx}
											onClick={() => handleMcqSelect(idx)}
											className={`w-full text-left p-4 rounded-xl border font-medium ${mcqAnswers[currentMcqIndex] === idx ? "bg-blue-600/20 border-blue-500 text-blue-100" : "bg-slate-900 border-slate-700 text-slate-300"}`}>
											{option}
										</button>
									))}
								</div>
								<div className="flex justify-between">
									<button
										disabled={currentMcqIndex === 0}
										onClick={() => setCurrentMcqIndex((prev) => prev - 1)}
										className="px-6 py-3 bg-slate-800 rounded-lg font-bold">
										Previous
									</button>
									<button
										onClick={() => setCurrentMcqIndex((prev) => prev + 1)}
										className="px-6 py-3 bg-blue-600 rounded-lg font-bold">
										Next
									</button>
								</div>
							</div>
						)}

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

			{/* CONFIRM MODAL */}
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
								) : null}{" "}
								Yes, Submit
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
