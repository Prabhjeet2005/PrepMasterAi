"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import { CheckCircle2, ShieldAlert, Loader2, Flag } from "lucide-react";

let faceapi;
let tf; 
let cocoSsd; 
let handPoseDetection;

export default function MobileProctorPage() {
	const { roomId } = useParams();
	const [status, setStatus] = useState("connecting");
	const [mediaStream, setMediaStream] = useState(null);

	const streamRef = useRef(null);
	const videoRef = useRef(null);
	const socketRef = useRef(null);
	const faceScanIntervalRef = useRef(null);
	const objectDetectorRef = useRef(null);
	const handModelRef = useRef(null);
	const missingHandsTimerRef = useRef(0);
	const missingFaceTimerRef = useRef(0);
	const isGracePeriodRef = useRef(true);
	const isAiReadyRef = useRef(false);

	// Disarm the grace period 3 seconds after successfully pairing
	useEffect(() => {
		if (status === "paired") {
			setTimeout(() => {
				isGracePeriodRef.current = false;
			}, 3000);
		}
	}, [status]);

	useEffect(() => {
		socketRef.current = io(process.env.NEXT_PUBLIC_API_URL);
		const socket = socketRef.current;

		socket.on("connect", () => {
			socket.emit("mobile_join_room", roomId);
			setStatus("paired");
		});

		socket.on("connect_error", () => setStatus("error"));

		socket.on("proctoring_ended", () => {
			setStatus("completed");
			if (streamRef.current)
				streamRef.current.getTracks().forEach((track) => track.stop());
		});

		// ✅ FIX FOR BUG 1: Aggressively re-request WakeLock to stop iOS screen dimming
		const requestWakeLock = async () => {
			try {
				if ("wakeLock" in navigator)
					await navigator.wakeLock.request("screen");
			} catch (err) {}
		};
		requestWakeLock();
		const wakeLockInterval = setInterval(requestWakeLock, 15000);

		// ✅ FIX FOR BUG 2: Aggressive 20-second heartbeat to bypass load balancer timeouts
		const heartbeatInterval = setInterval(() => {
			if (socket.connected) socket.emit("ping");
		}, 20000);

		return () => {
			socket.disconnect();
			if (streamRef.current)
				streamRef.current.getTracks().forEach((track) => track.stop());
		};
	}, [roomId]);

	// INSTANT KILL ON BACKGROUNDING
	useEffect(() => {
		const handleVisibilityChange = () => {
			// THE FIX: Only trigger if the document is completely hidden (swapped apps or minimized)
			if (document.hidden && status === "paired" && socketRef.current && !isGracePeriodRef.current) {
        socketRef.current.emit("mobile_violation_detected", {
          roomId,
          reason: "Mobile browser minimized or backgrounded.",
        });
        if (streamRef.current)
          streamRef.current.getTracks().forEach((track) => track.stop());
        socketRef.current.disconnect();
        setStatus("disconnected");
      }
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener(
				"visibilitychange",
				handleVisibilityChange,
			);
		};
	}, [status, roomId]);

	// START CAMERA
	useEffect(() => {
		if (status === "paired" && !mediaStream) {
			const startCamera = async () => {
				try {
					const stream = await navigator.mediaDevices.getUserMedia({
						video: {
							facingMode: "user",
							width: { ideal: 640 },
							height: { ideal: 480 },
							// ✅ FIX FOR iOS: Cap framerate to stop Apple's thermal throttling!
							frameRate: { ideal: 10, max: 15 },
						},
						audio: false,
					});
					streamRef.current = stream;
					setMediaStream(stream);

					stream.getVideoTracks()[0].onended = () => {
						if (socketRef.current && status === "paired") {
							socketRef.current.emit("mobile_violation_detected", {
								roomId,
								reason: "Camera access revoked.",
							});
							socketRef.current.disconnect();
							setStatus("disconnected");
						}
					};
				} catch (err) {
					setStatus("error");
				}
			};
			startCamera();
		}
	}, [status, roomId, mediaStream]);

	// BULLETPROOF VIDEO BINDING FOR MOBILE
	useEffect(() => {
		if (videoRef.current && mediaStream) {
			const video = videoRef.current;
			video.srcObject = mediaStream;
			// CRITICAL: Forces mobile browsers to render the video inline without full-screening it or blocking it
			video.setAttribute("playsinline", "true");
			video.setAttribute("autoplay", "true");
			video.play().catch((e) => console.error("Mobile Play Error:", e));
		}
	}, [mediaStream, status]);

	// ==========================================
	// MOBILE AI: FACE DESCRIPTOR GENERATOR
	// ==========================================
	useEffect(() => {
		const loadModels = async () => {
			try {
				if (!faceapi) {
					const module = await import("@vladmandic/face-api");
					faceapi = module.default || module;
				}

				// NEW: Load TensorFlow and COCO-SSD dynamically for SSR safety
				if (!cocoSsd) {
					tf = await import("@tensorflow/tfjs");
					await tf.ready(); // Initializes the WebGL backend
					const cocoModule = await import("@tensorflow-models/coco-ssd");
					cocoSsd = cocoModule.default || cocoModule;
				}

				if (!handPoseDetection) {
					const hpdModule =
						await import("@tensorflow-models/hand-pose-detection");
					handPoseDetection = hpdModule.default || hpdModule;
				}

				const MODEL_URL =
					"https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
				await Promise.all([
					faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
					faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
					faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
				]);

				// NEW: Load the Object Detection Model
				objectDetectorRef.current = await cocoSsd.load();

				const handModel = handPoseDetection.SupportedModels.MediaPipeHands;
				const detectorConfig = {
					runtime: "tfjs",
					modelType: "lite",
					maxHands: 2, // THIS IS THE MAGIC BULLET!
				};
				handModelRef.current = await handPoseDetection.createDetector(
					handModel,
					detectorConfig,
				);

				console.log("✅ Mobile AI Identity & Object Models Loaded");
				isAiReadyRef.current = true;
			} catch (e) {
				console.error("Mobile Model load error", e);
			}
		};
		loadModels();
	}, []);

	useEffect(() => {
		if (status !== "paired" || !mediaStream || !videoRef.current) return;

		const video = videoRef.current;
		let isScanning = false;

		// Recursive function to handle the AI scan
		// Recursive function to handle the AI scan
		const runAiScan = async () => {
			if (
				video.paused ||
				video.ended ||
				!socketRef.current ||
				isScanning
			) {
				scheduleNextScan(3000); // Retry soon if busy
				return;
			}

			if (!isAiReadyRef.current) {
				console.log(
					"[AI] Models still downloading... checking again in 2 seconds.",
				);
				scheduleNextScan(2000);
				return;
			}

			isScanning = true;

			// CRITICAL FIX: TFJS requires explicit DOM width/height attributes
			if (
				!video.width &&
				(video.width !== video.videoWidth ||
					video.height !== video.videoHeight)
			) {
				video.width = video.videoWidth;
				video.height = video.videoHeight;
			}

			// ✅ THE IOS WEBKIT FIX: The Offscreen Canvas Buffer
			// We snapshot the video frame once. This prevents iOS WebGL from crashing
			// when multiple AI models try to access the live video texture simultaneously.
			const frameCanvas = document.createElement("canvas");
			frameCanvas.width = video.videoWidth;
			frameCanvas.height = video.videoHeight;
			const frameCtx = frameCanvas.getContext("2d", {
				willReadFrequently: true,
			});
			frameCtx.drawImage(
				video,
				0,
				0,
				frameCanvas.width,
				frameCanvas.height,
			);

			// Faster polling (3 to 7 seconds) won't choke the CPU but catches cheaters faster.
			let nextDelay = Math.floor(Math.random() * (7000 - 3000 + 1)) + 5000;

			const captureEvidence = (sourceCanvas, bbox = null, label = "") => {
				const canvas = document.createElement("canvas");
				canvas.width = sourceCanvas.width;
				canvas.height = sourceCanvas.height;
				const ctx = canvas.getContext("2d");
				ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

				if (bbox) {
					ctx.strokeStyle = "red";
					ctx.lineWidth = 4;
					ctx.strokeRect(bbox[0], bbox[1], bbox[2], bbox[3]);
					ctx.fillStyle = "red";
					ctx.font = "bold 24px Arial";
					ctx.fillText(label.toUpperCase(), bbox[0], bbox[1] - 10);
				} else if (label) {
					ctx.fillStyle = "rgba(220, 38, 38, 0.85)";
					ctx.fillRect(0, 20, canvas.width, 50);
					ctx.fillStyle = "white";
					ctx.font = "bold 28px Arial";
					ctx.textAlign = "center";
					ctx.fillText(label.toUpperCase(), canvas.width / 2, 55);
				}
				return canvas.toDataURL("image/jpeg", 0.4);
			};

			// ✅ GPU Memory Scope to prevent the 5-minute Android freeze
			if (tf) tf.engine().startScope();

			// =====================================
			// 1. FACE IDENTITY SCANNER
			// =====================================
			try {
				if (faceapi) {
					// ✅ Pass the static frameCanvas instead of the live video
					const detection = await faceapi
						.detectSingleFace(
							frameCanvas,
							new faceapi.TinyFaceDetectorOptions({
								inputSize: 224,
								scoreThreshold: 0.3,
							}),
						)
						.withFaceLandmarks()
						.withFaceDescriptor();

					if (detection) {
						socketRef.current.emit("send_mobile_face_descriptor", {
							roomId,
							descriptor: Array.from(detection.descriptor),
						});
						missingFaceTimerRef.current = 0;
					} else {
						missingFaceTimerRef.current += 1;

						if (missingFaceTimerRef.current === 1) {
							socketRef.current.emit("mobile_violation_detected", {
								roomId,
								reason:
									"SOFT_WARNING: Secondary camera obstructed. Please ensure your face is visible.",
							});
							nextDelay = 4000;
						} else if (missingFaceTimerRef.current >= 4) {
							const evidence = captureEvidence(
								frameCanvas,
								null,
								"CAMERA OBSTRUCTED",
							);
							socketRef.current.emit("mobile_violation_detected", {
								roomId,
								reason:
									"Secondary camera obstructed or candidate missing for a prolonged period.",
								evidence,
							});
							missingFaceTimerRef.current = 0;
						} else {
							nextDelay = 4000;
						}
					}
				}
			} catch (err) {
				console.warn("Face AI Skipped:", err.message);
			}

			// =====================================
			// 2. FORBIDDEN OBJECT SCANNER
			// =====================================
			try {
				if (objectDetectorRef.current) {
					// ✅ Pass the static frameCanvas
					const predictions =
						await objectDetectorRef.current.detect(frameCanvas);
					const forbiddenItems = ["cell phone", "book", "remote"];

					const violation = predictions.find((p) => {
						if (!forbiddenItems.includes(p.class)) return false;
						const requiredConfidence =
							p.class === "cell phone" || p.class === "remote"
								? 0.45
								: 0.5;
						return p.score > requiredConfidence;
					});

					if (violation) {
						const evidence = captureEvidence(
							frameCanvas,
							violation.bbox,
							violation.class,
						);
						socketRef.current.emit("mobile_violation_detected", {
							roomId,
							reason: `Forbidden object detected: ${violation.class}`,
							evidence,
						});
					}
				}
			} catch (err) {
				console.warn("Object AI Skipped:", err.message);
			}

			// =====================================
			// 3. HAND TRACKING
			// =====================================
			try {
				if (handModelRef.current) {
					// ✅ Pass the static frameCanvas
					const hands =
						await handModelRef.current.estimateHands(frameCanvas);

					if (hands.length < 2) {
						missingHandsTimerRef.current += 1;

						if (missingHandsTimerRef.current === 2) {
							socketRef.current.emit("mobile_violation_detected", {
								roomId,
								reason:
									"SOFT_WARNING: Hand(s) Missing. Please return both hands to the desk.",
							});
							nextDelay = 4000;
						} else if (missingHandsTimerRef.current >= 4) {
							const evidence = captureEvidence(
								frameCanvas,
								null,
								"HAND(S) MISSING",
							);
							socketRef.current.emit("mobile_violation_detected", {
								roomId,
								reason:
									"Hand(s) Missing: Please keep both hands clearly visible on your desk.",
								evidence,
							});
							missingHandsTimerRef.current = 0;
						} else {
							nextDelay = 4000;
						}
					} else {
						missingHandsTimerRef.current = 0;
					}
				}
			} catch (err) {
				console.warn("Hand AI Skipped:", err.message);
			}

			// ✅ Clear all GPU Memory after scan
			if (tf) tf.engine().endScope();

			isScanning = false;
			scheduleNextScan(nextDelay);
		};

		// Accepts a dynamic delay parameter
		const scheduleNextScan = (delay) => {
			if (status !== "paired") return;
			faceScanIntervalRef.current = setTimeout(runAiScan, delay);
		};

		// Kick off the very first scan after 5 seconds
		faceScanIntervalRef.current = setTimeout(runAiScan, 5000);
		return () => {
			// Changed clearInterval to clearTimeout since we switched architectures
			if (faceScanIntervalRef.current)
				clearTimeout(faceScanIntervalRef.current);
		};
	}, [status, mediaStream, roomId]);

	return (
		<div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
			{status === "connecting" && (
				<div className="flex flex-col items-center animate-pulse">
					<Loader2 size={64} className="text-blue-500 animate-spin mb-6" />
					<h1 className="text-2xl font-bold mb-2">Connecting...</h1>
				</div>
			)}

			{status === "disconnected" && (
				<div className="flex flex-col items-center">
					<ShieldAlert size={64} className="text-red-500 mb-6" />
					<h1 className="text-2xl font-bold mb-2">Session Terminated</h1>
					<p className="text-slate-400">
						You exited the camera view. Rescan the QR code on your laptop.
					</p>
				</div>
			)}

			{status === "completed" && (
				<div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
					<div className="w-24 h-24 bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/50">
						<Flag size={48} />
					</div>
					<h1 className="text-3xl font-black mb-2 text-white">Ended</h1>
					<p className="text-slate-300">You can now lock your phone.</p>
				</div>
			)}

			{status === "error" && (
				<div className="flex flex-col items-center">
					<ShieldAlert size={64} className="text-red-500 mb-6" />
					<h1 className="text-2xl font-bold mb-2">Access Denied</h1>
				</div>
			)}

			{status === "paired" && (
				<div className="flex flex-col items-center w-full max-w-md h-full">
					<div className="flex items-center gap-2 text-green-400 bg-green-900/30 px-4 py-2 rounded-full font-bold mb-6 mt-4">
						<CheckCircle2 size={20} /> Linked to Assessment
					</div>

					{/* EXPLICIT HEIGHT (h-[60vh]) PREVENTS CSS COLLAPSE ON MOBILE */}
					<div className="relative w-full h-[60vh] max-h-[500px] bg-black rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl mb-8">
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className="absolute inset-0 w-full h-full object-cover"
							style={{ transform: "scaleX(-1)" }}
						/>
						<div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2 text-xs font-bold border border-white/10">
							<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
							PROCTORING ACTIVE
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
