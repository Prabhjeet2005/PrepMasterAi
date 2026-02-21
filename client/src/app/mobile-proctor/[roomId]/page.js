"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import {
	CheckCircle2,
	Smartphone,
	ShieldAlert,
	Loader2,
} from "lucide-react";

export default function MobileProctorPage() {
	const { roomId } = useParams();
	const [status, setStatus] = useState("connecting"); // connecting, paired, error

	useEffect(() => {
		// Initialize Socket
		const socket = io(process.env.NEXT_PUBLIC_API_URL);

		socket.on("connect", () => {
			// Join the specific room matching the laptop
			socket.emit("mobile_join_room", roomId);
			setStatus("paired");
		});

		socket.on("connect_error", () => {
			setStatus("error");
		});

		// WAKE LOCK: Force the phone screen to stay awake
		const requestWakeLock = async () => {
			try {
				if ("wakeLock" in navigator) {
					await navigator.wakeLock.request("screen");
					console.log("Screen Wake Lock active.");
				}
			} catch (err) {
				console.error("Wake Lock failed:", err);
			}
		};
		requestWakeLock();

		return () => {
			socket.disconnect();
		};
	}, [roomId]);

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
				<div className="flex flex-col items-center">
					<div className="w-24 h-24 bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/50">
						<CheckCircle2 size={48} />
					</div>
					<h1 className="text-3xl font-black mb-2 text-white">
						Device Paired!
					</h1>
					<p className="text-slate-300 mb-8 max-w-xs">
						Your mobile camera is now securely linked to your assessment.
					</p>

					<div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm text-left shadow-xl">
						<h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2">
							<Smartphone size={20} /> Placement Instructions
						</h3>
						<ul className="text-sm text-slate-300 space-y-3 list-disc list-inside">
							<li>Place phone on a stand to your side.</li>
							<li>
								Ensure your <b>face, hands, and screen</b> are visible.
							</li>
							<li>
								<strong>Do not lock your phone</strong> or close this tab.
							</li>
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
