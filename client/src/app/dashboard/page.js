"use client"; // Required for React interactivity

import { useState } from "react";
import { Upload, FileText, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Dashboard() {
	const router = useRouter();
	const [file, setFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleFileChange = (e) => {
		if (e.target.files && e.target.files[0]) {
			setFile(e.target.files[0]);
		}
	};

	const startInterview = async () => {
		if (!file) {
			setError("Please upload a Resume PDF first.");
			return;
		}

		setLoading(true);
		setError("");

		// 1. Prepare Form Data (Backend expects 'file')
		const formData = new FormData();
		formData.append("resume", file);

		try {
			// 2. Call the Backend
			// NOTE: Ensure your backend is running on port 5001
			const res = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/interview/start`,
				formData,
				{
					headers: { "Content-Type": "multipart/form-data" },
					withCredentials: true,
				},
			);

      if (res.data.message) {
				localStorage.setItem("initialAiMessage", res.data.message);
			}
			// 3. Save Interview ID & Redirect
			// Ideally, the backend should return the ID. For now, we assume success.
			// We'll use "user1" as our session key for the WebSocket later.
			router.push("/interview");
		} catch (err) {
			console.error("Upload Error:", err);
			setError("Failed to start interview. Is the Backend running?");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
			<div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
				<h2 className="text-3xl font-bold mb-2">Setup Interview</h2>
				<p className="text-slate-400 mb-8">
					Upload your resume to personalize the AI questions.
				</p>

				{/* Upload Box */}
				<div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer relative">
					<input
						type="file"
						accept="application/pdf"
						onChange={handleFileChange}
						className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
					/>
					<div className="flex flex-col items-center gap-3">
						<div className="p-4 bg-slate-800 rounded-full">
							{file ? (
								<FileText className="text-purple-400" />
							) : (
								<Upload className="text-slate-400" />
							)}
						</div>
						<p className="text-sm font-medium">
							{file ? file.name : "Click to Upload Resume (PDF)"}
						</p>
					</div>
				</div>

				{error && (
					<p className="text-red-400 text-sm mt-4 text-center bg-red-900/20 p-2 rounded">
						{error}
					</p>
				)}

				{/* Start Button */}
				<button
					onClick={startInterview}
					disabled={loading || !file}
					className={`w-full mt-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
						loading || !file
							? "bg-slate-800 text-slate-500 cursor-not-allowed"
							: "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20"
					}`}>
					{loading ? (
						<>
							<Loader2 className="animate-spin" /> Analyzing Resume...
						</>
					) : (
						<>
							Start Interview <ArrowRight size={20} />
						</>
					)}
				</button>
			</div>
		</div>
	);
}
