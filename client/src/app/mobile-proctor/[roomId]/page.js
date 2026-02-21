"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import {
	CheckCircle2,
	Smartphone,
	ShieldAlert,
	Loader2,
	Camera,
} from "lucide-react";

export default function MobileProctorPage() {
	const { roomId } = useParams();
	const [status, setStatus] = useState("connecting"); // connecting, paired, error
	const videoRef = useRef(null);

	useEffect(() => {
		const socket = io(process.env.NEXT_PUBLIC_API_URL);

		socket.on("connect", () => {
			socket.emit("mobile_join_room", roomId);
			setStatus("paired");
			startCamera(); // Start camera as soon as paired
		});

		socket.on("connect_error", () => {
			setStatus("error");
		});

		// WAKE LOCK: Force the phone screen to stay awake
		const requestWakeLock = async () => {
			try {
				if ("wakeLock" in navigator) {
					await navigator.wakeLock.request("screen");
				}
			} catch (err) {
				console.error("Wake Lock failed:", err);
			}
		};
		requestWakeLock();

		return () => {
			socket.disconnect();
			// Turn off camera when leaving
			if (videoRef.current && videoRef.current.srcObject) {
				videoRef.current.srcObject
					.getTracks()
					.forEach((track) => track.stop());
			}
		};
	}, [roomId]);

	// --- HARDWARE ACCESS ---
	const startCamera = async () => {
		try {
			if (
				!navigator.mediaDevices ||
				!navigator.mediaDevices.getUserMedia
			) {
				setStatus("error");
				alert(
					"Camera API blocked. Please use Chrome with the security flag enabled.",
				);
				return;
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user" },
				audio: false,
			});

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				// CRITICAL FIX: Explicitly tell the video element to play the stream
				videoRef.current
					.play()
					.catch((e) => console.error("Video play error:", e));
			}
		} catch (err) {
			console.error("Camera access denied:", err);
			setStatus("error");
			alert(
				"Camera access was denied. Please check your browser permissions and refresh.",
			);
		}
	};

	return (
		<div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
			{status === "connecting" && (
				<div className="flex flex-col items-center animate-pulse">
					<Loader2 size={64} className="text-blue-500 animate-spin mb-6" />
					<h1 className="text-2xl font-bold mb-2">
						Connecting to Laptop...
					</h1>
					<p className="text-slate-400">
						Please wait while we establish a secure connection.
					</p>
				</div>
			)}

			{status === "paired" && (
				<div className="flex flex-col items-center w-full max-w-md h-full">
					<div className="flex items-center gap-2 text-green-400 bg-green-900/30 px-4 py-2 rounded-full font-bold mb-6 mt-4">
						<CheckCircle2 size={20} /> Securely Linked to Assessment
					</div>

					{/* LIVE CAMERA FEED */}
					<div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl mb-8">
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className="absolute inset-0 w-full h-full object-cover mirror"
							style={{ transform: "scaleX(-1)" }} // Mirrors the video so it feels natural
						/>
						<div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2 text-xs font-bold border border-white/10">
							<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
							PROCTORING ACTIVE
						</div>
					</div>

					<div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full text-left shadow-xl">
						<h3 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
							<Camera size={20} /> Positioning Rules
						</h3>
						<ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
							<li>Prop your phone up on your desk.</li>
							<li>
								Ensure your <b>face, hands, and laptop screen</b> are
								clearly visible.
							</li>
							<li>Do not lock your phone screen.</li>
						</ul>
					</div>
				</div>
			)}

			{status === "error" && (
				<div className="flex flex-col items-center">
					<ShieldAlert size={64} className="text-red-500 mb-6" />
					<h1 className="text-2xl font-bold mb-2">Connection Failed</h1>
					<p className="text-slate-400">
						Please rescan the QR code on your laptop.
					</p>
				</div>
			)}
		</div>
	);
}
