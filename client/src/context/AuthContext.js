"use client";
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

// Custom hook to make it easy to use anywhere
export const useAuthContext = () => {
	return useContext(AuthContext);
};

export const AuthContextProvider = ({ children }) => {
	const [authUser, setAuthUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const checkUser = async () => {
			try {
				const res = await axios.get(
					`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check`,
					{
						// CRUCIAL: This tells Axios to send the HTTP-only cookie with the request
						withCredentials: true,
					},
				);
				setAuthUser(res.data);
			} catch (error) {
				// If it fails (401 Unauthorized), it means they aren't logged in
				setAuthUser(null);
			} finally {
				setIsLoading(false);
			}
		};

		checkUser();
	}, []);

	return (
		<AuthContext.Provider value={{ authUser, setAuthUser, isLoading }}>
			{children}
		</AuthContext.Provider>
	);
};
