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
	Flag,
} from "lucide-react";

export default function MobileProctorPage() {
	const { roomId } = useParams();
	const [status, setStatus] = useState("connecting"); // connecting, paired, error, completed
	const [mediaStream, setMediaStream] = useState(null);
	const streamRef = useRef(null);

	useEffect(() => {
		const socket = io(process.env.NEXT_PUBLIC_API_URL);

		socket.on("connect", () => {
			socket.emit("mobile_join_room", roomId);
			setStatus("paired");
		});

		socket.on("connect_error", () => setStatus("error"));

		// BUG 3 FIX: Listen for the test ending
		socket.on("proctoring_ended", () => {
			setStatus("completed");
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop()); // Kill camera instantly
			}
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

	useEffect(() => {
		if (status === "paired") {
			const startCamera = async () => {
				try {
					const stream = await navigator.mediaDevices.getUserMedia({
						video: { facingMode: "user" },
						audio: false,
					});
					streamRef.current = stream;
					setMediaStream(stream);
				} catch (err) {
					setStatus("error");
				}
			};
			startCamera();
		}
	}, [status]);

	return (
		<div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
			{status === "connecting" && (
				<div className="flex flex-col items-center animate-pulse">
					<Loader2 size={64} className="text-blue-500 animate-spin mb-6" />
					<h1 className="text-2xl font-bold mb-2">
						Connecting to Laptop...
					</h1>
				</div>
			)}

			{status === "paired" && (
				<div className="flex flex-col items-center w-full max-w-md h-full">
					<div className="flex items-center gap-2 text-green-400 bg-green-900/30 px-4 py-2 rounded-full font-bold mb-6 mt-4">
						<CheckCircle2 size={20} /> Securely Linked to Assessment
					</div>

					<div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl mb-8">
						{/* BUG 2 FIX: The Callback Ref guarantees the video attaches perfectly */}
						<video
							autoPlay
							playsInline
							muted
							className="absolute inset-0 w-full h-full object-cover mirror"
							style={{ transform: "scaleX(-1)" }}
							ref={(node) => {
								if (node && mediaStream) {
									node.srcObject = mediaStream;
									node.play().catch(() => {});
								}
							}}
						/>
						<div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2 text-xs font-bold border border-white/10">
							<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
							PROCTORING ACTIVE
						</div>
					</div>
				</div>
			)}

			{/* BUG 3 FIX: The Completed Screen */}
			{status === "completed" && (
				<div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
					<div className="w-24 h-24 bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/50">
						<Flag size={48} />
					</div>
					<h1 className="text-3xl font-black mb-2 text-white">
						Assessment Ended
					</h1>
					<p className="text-slate-300">
						Your proctoring session is successfully closed. You can now
						lock your phone.
					</p>
				</div>
			)}

			{status === "error" && (
				<div className="flex flex-col items-center">
					<ShieldAlert size={64} className="text-red-500 mb-6" />
					<h1 className="text-2xl font-bold mb-2">Camera Access Denied</h1>
					<p className="text-slate-400">
						Please check your browser permissions.
					</p>
				</div>
			)}
		</div>
	);
}
