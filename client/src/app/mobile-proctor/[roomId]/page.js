"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import { CheckCircle2, ShieldAlert, Loader2, Flag } from "lucide-react";

export default function MobileProctorPage() {
	const { roomId } = useParams();
	const [status, setStatus] = useState("connecting");
	const [mediaStream, setMediaStream] = useState(null);

	const streamRef = useRef(null);
	const videoRef = useRef(null);
	const socketRef = useRef(null);

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
		window.addEventListener("blur", handleVisibilityChange);
		return () => {
			document.removeEventListener(
				"visibilitychange",
				handleVisibilityChange,
			);
			window.removeEventListener("blur", handleVisibilityChange);
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
