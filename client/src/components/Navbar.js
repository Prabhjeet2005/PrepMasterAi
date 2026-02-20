"use client";
import Link from "next/link";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Navbar() {
	const { authUser, setAuthUser, isLoading } = useAuthContext();
	const router = useRouter();

	const handleLogout = async () => {
		try {
			await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
				{},
				{ withCredentials: true },
			);
			setAuthUser(null);
			router.push("/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	return (
		<nav className="w-full bg-slate-950 border-b border-slate-800 px-6 py-4 flex justify-between items-center z-50">
			<Link
				href="/"
				className="text-xl font-bold text-white flex items-center gap-2">
				<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
					<span className="text-white text-lg font-black">P</span>
				</div>
				PrepMaster AI
			</Link>

			<div className="flex items-center gap-4">
				{isLoading ? (
					<div className="w-20 h-8 bg-slate-800 animate-pulse rounded-lg"></div>
				) : authUser ? (
					// LOGGED IN VIEW
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2 text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
							<UserIcon size={16} className="text-blue-400" />
							<span className="text-sm font-medium">{authUser.name}</span>
						</div>
						<button
							onClick={handleLogout}
							className="text-sm font-bold text-slate-400 hover:text-red-400 flex items-center gap-2 transition-colors">
							<LogOut size={16} />
							<span className="hidden sm:inline">Logout</span>
						</button>
					</div>
				) : (
					// LOGGED OUT VIEW
					<div className="flex items-center gap-3">
						<Link
							href="/login"
							className="text-sm font-bold text-slate-300 hover:text-white transition-colors">
							Log In
						</Link>
						<Link
							href="/signup"
							className="text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors">
							Sign Up
						</Link>
					</div>
				)}
			</div>
		</nav>
	);
}
