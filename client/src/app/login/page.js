"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const router = useRouter();
	const { setAuthUser } = useAuthContext();

	const handleLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
				{ email, password },
				{ withCredentials: true },
			);

			setAuthUser(res.data);
			router.push("/");
		} catch (err) {
			setError(err.response?.data?.error || "Invalid email or password");
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
						Welcome Back
					</h1>
					<p className="text-slate-400">
						Log in to continue your interview prep.
					</p>
				</div>

				{error && (
					<div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mb-6 text-sm text-center">
						{error}
					</div>
				)}

				<form onSubmit={handleLogin} className="space-y-4">
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
							"Log In"
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
					Don't have an account?{" "}
					<Link
						href="/signup"
						className="text-blue-400 hover:text-blue-300 font-bold">
						Sign up
					</Link>
				</p>
			</div>
		</div>
	);
}
