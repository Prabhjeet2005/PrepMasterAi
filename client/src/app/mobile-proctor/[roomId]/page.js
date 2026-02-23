"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import { CheckCircle2, ShieldAlert, Loader2, Flag } from "lucide-react";

let faceapi;

export default function MobileProctorPage() {
	const { roomId } = useParams();
	const [status, setStatus] = useState("connecting");
	const [mediaStream, setMediaStream] = useState(null);

	const streamRef = useRef(null);
	const videoRef = useRef(null);
	const socketRef = useRef(null);
	const faceScanIntervalRef = useRef(null); // ADD THIS

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

		const requestWakeLock = async () => {
			try {
				if ("wakeLock" in navigator)
					await navigator.wakeLock.request("screen");
			} catch (err) {}
		};
		requestWakeLock();

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
		if (document.hidden && status === "paired" && socketRef.current) {
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
						video: { facingMode: "user" },
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
				// Safely handle Next.js ESM dynamic module exports
				faceapi = module.default || module;
			}
			const MODEL_URL =
				"https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
			await Promise.all([
				faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
				faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
				faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
			]);
			console.log("✅ Mobile AI Identity Models Loaded");
		} catch (e) {
			console.error("Mobile Model load error", e);
		}
	};
	loadModels();
}, []);

	useEffect(() => {
		if (status !== "paired" || !mediaStream || !videoRef.current) return;

		const video = videoRef.current;

		// Scan every 3 seconds to save mobile battery while maintaining security
		faceScanIntervalRef.current = setInterval(async () => {
			if (video.paused || video.ended || !socketRef.current) return;

			// Detect the single largest face in the mobile view
			const detection = await faceapi
				.detectSingleFace(
					video,
					new faceapi.TinyFaceDetectorOptions({
						inputSize: 224,
						scoreThreshold: 0.5,
					}),
				)
				.withFaceLandmarks()
				.withFaceDescriptor();

			if (detection) {
				// Convert Float32Array to standard array so it can survive WebSocket JSON serialization
				const descriptorArray = Array.from(detection.descriptor);
				socketRef.current.emit("send_mobile_face_descriptor", {
					roomId,
					descriptor: descriptorArray,
				});
			}
		}, 3000);

		return () => {
			if (faceScanIntervalRef.current)
				clearInterval(faceScanIntervalRef.current);
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
