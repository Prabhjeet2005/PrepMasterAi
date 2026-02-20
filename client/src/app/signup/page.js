"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const router = useRouter();
	const { setAuthUser } = useAuthContext();

	const handleSignup = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`,
				{ name, email, password },
				{ withCredentials: true }, // Crucial: Tells browser to save the cookie
			);

			// Update global state with the new user
			setAuthUser(res.data);

			// Redirect to home or dashboard
			router.push("/");
		} catch (err) {
			setError(err.response?.data?.error || "Something went wrong");
		} finally {
			setLoading(false);
		}
	};

  const handleGuestLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
				{
					email: "recruiter@prepmaster.ai", // Put the account you created here
					password: "portfolio2026", // Put the password here
				},
				{ withCredentials: true },
			);

			setAuthUser(res.data);
			router.push("/");
		} catch (err) {
			setError("Guest login failed. Please try normal login.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-white mb-2">
						Create an Account
					</h1>
					<p className="text-slate-400">
						Start practicing with PrepMaster AI today.
					</p>
				</div>

				{error && (
					<div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mb-6 text-sm text-center">
						{error}
					</div>
				)}

				<form onSubmit={handleSignup} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">
							Full Name
						</label>
						<input
							type="text"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
							placeholder="John Doe"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">
							Email
						</label>
						<input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
							placeholder="john@example.com"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">
							Password
						</label>
						<input
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
							placeholder="••••••••"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center mt-6">
						{loading ? (
							<Loader2 className="animate-spin" size={24} />
						) : (
							"Sign Up"
						)}
					</button>
				</form>

				<div className="mt-4 border-t border-slate-800 pt-4">
					<button
						onClick={handleGuestLogin}
						disabled={loading}
						className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2">
						🚀 1-Click Recruiter Demo
					</button>
				</div>

				<p className="mt-6 text-center text-slate-400 text-sm">
					Already have an account?{" "}
					<Link
						href="/login"
						className="text-blue-400 hover:text-blue-300 font-bold">
						Log in
					</Link>
				</p>
			</div>
		</div>
	);
}
