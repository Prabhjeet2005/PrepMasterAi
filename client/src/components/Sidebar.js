"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useAuthContext } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import {
	LayoutDashboard,
	Code2,
	LogOut,
	User as UserIcon,
	ChevronLeft,
	ChevronRight,
	Menu,
	X,
	Home,
	Video,
	PlusCircle,
  Speech,
  FileEdit,
  Briefcase
} from "lucide-react";

export default function Sidebar() {
	const { authUser, setAuthUser, isLoading } = useAuthContext();
	const router = useRouter();
	const pathname = usePathname();

	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	// Auto-close mobile menu on route change
	useEffect(() => {
		setIsMobileOpen(false);
	}, [pathname]);

	// HIDE SIDEBAR LOGIC: Don't show the sidebar during active tests or interviews
	const isExamMode =
		pathname === "/interview" ||
		(pathname.startsWith("/assessments/") && pathname !== "/assessments");
	if (isExamMode) return null;

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

	const navLinks = [
		{ name: "Home", href: "/", icon: Home },
		{
			name: "Your Dashboard",
			href: "/user-dashboard",
			icon: LayoutDashboard,
		},
		{ name: "Ai Interview", href: "/new-interview", icon: Speech },
		{ name: "OA & Coding", href: "/assessments", icon: Code2 },
	];

  if (authUser?.role === "recruiter" || authUser?.role === "admin") {
		navLinks.push({
			name: "Recruiter Portal",
			href: "/recruiter/dashboard",
			icon: Briefcase,
		});
		navLinks.push({
			name: "Create OA",
			href: "/recruiter/create-oa",
			icon: FileEdit,
		});
	}

	return (
		<>
			{/* MOBILE HEADER (Only visible on small screens) */}
			<div className="md:hidden flex items-center justify-between bg-slate-950 border-b border-slate-800 p-4 shrink-0">
				<Link
					href="/"
					className="text-lg font-bold text-white flex items-center gap-2">
					<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
						<span className="text-white text-lg font-black">P</span>
					</div>
					PrepMaster
				</Link>
				<button
					onClick={() => setIsMobileOpen(true)}
					className="text-slate-300 hover:text-white">
					<Menu size={28} />
				</button>
			</div>

			{/* MOBILE OVERLAY */}
			{isMobileOpen && (
				<div
					className="md:hidden fixed inset-0 bg-black/80 z-40"
					onClick={() => setIsMobileOpen(false)}
				/>
			)}

			{/* MAIN SIDEBAR (Desktop & Mobile Slide-over) */}
			<aside
				className={`
                fixed md:static inset-y-0 left-0 z-50
                flex flex-col bg-slate-950 border-r border-slate-800 transition-all duration-300 ease-in-out
                ${isCollapsed ? "md:w-20" : "md:w-64"}
                ${isMobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0"}
            `}>
				{/* LOGO AREA */}
				<div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
					<Link
						href="/"
						className="flex items-center gap-3 overflow-hidden">
						<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
							<span className="text-white text-lg font-black">P</span>
						</div>
						<span
							className={`text-lg font-bold text-white transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? "md:opacity-0 md:hidden" : "opacity-100"}`}>
							PrepMaster AI
						</span>
					</Link>

					{/* Desktop Collapse Button */}
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="hidden md:flex text-slate-500 hover:text-white transition-colors p-1">
						{isCollapsed ? (
							<ChevronRight size={20} />
						) : (
							<ChevronLeft size={20} />
						)}
					</button>

					{/* Mobile Close Button */}
					<button
						onClick={() => setIsMobileOpen(false)}
						className="md:hidden text-slate-400 hover:text-white">
						<X size={24} />
					</button>
				</div>

				{/* NAVIGATION LINKS */}
				<div className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
					{navLinks.map((link) => {
						const isActive =
							pathname === link.href ||
							(pathname.startsWith(link.href) && link.href !== "/");
						return (
							<Link
								key={link.name}
								href={link.href}
								className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
									isActive
										? "bg-blue-600/10 text-blue-400 font-bold"
										: "text-slate-400 hover:bg-slate-900 hover:text-slate-200 font-medium"
								}`}
								title={isCollapsed ? link.name : ""}>
								<link.icon size={20} className="shrink-0" />
								<span
									className={`transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? "md:opacity-0 md:hidden" : "opacity-100"}`}>
									{link.name}
								</span>
							</Link>
						);
					})}
				</div>

				{/* BOTTOM AUTH AREA */}
				<div className="p-4 border-t border-slate-800 shrink-0">
					{isLoading ? (
						<div className="h-10 w-full bg-slate-800 animate-pulse rounded-xl"></div>
					) : authUser ? (
						<div className="flex flex-col gap-2">
							<div
								className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden ${isCollapsed && "md:justify-center"}`}>
								<UserIcon size={18} className="text-blue-400 shrink-0" />
								<div
									className={`flex flex-col overflow-hidden transition-opacity duration-300 ${isCollapsed ? "md:opacity-0 md:hidden" : "opacity-100"}`}>
									<span className="text-sm font-bold text-white truncate">
										{authUser.name}
									</span>
									<span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
										{authUser.role || "user"}
									</span>
								</div>
							</div>

							<button
								onClick={handleLogout}
								className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-medium ${isCollapsed && "md:justify-center"}`}
								title={isCollapsed ? "Logout" : ""}>
								<LogOut size={18} className="shrink-0" />
								<span
									className={`transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? "md:opacity-0 md:hidden" : "opacity-100"}`}>
									Logout
								</span>
							</button>
						</div>
					) : (
						<div
							className={`flex flex-col gap-2 ${isCollapsed && "md:items-center"}`}>
							<Link
								href="/login"
								className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors font-bold ${isCollapsed ? "md:w-10 md:px-0" : "w-full"}`}
								title={isCollapsed ? "Log In" : ""}>
								{isCollapsed ? <LogOut size={18} /> : "Log In"}
							</Link>
							<Link
								href="/signup"
								className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-500 transition-colors font-bold ${isCollapsed ? "md:w-10 md:px-0" : "w-full"}`}
								title={isCollapsed ? "Sign Up" : ""}>
								{isCollapsed ? <PlusCircle size={18} /> : "Sign Up"}
							</Link>
						</div>
					)}
				</div>
			</aside>
		</>
	);
}
