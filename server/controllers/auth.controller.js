const User = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const signup = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ error: "Email already in use" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const newUser = new User({
			name,
			email,
			password: hashedPassword,
		});

		await newUser.save();

		const token = jwt.sign(
			{ userId: newUser._id },
			process.env.JWT_SECRET,
			{ expiresIn: "15d" },
		);

		res.cookie("jwt", token, {
			maxAge: 15 * 24 * 60 * 60 * 1000,
			httpOnly: true,
			sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
			secure: process.env.NODE_ENV === "production",
		});

		res.status(201).json({
			_id: newUser._id,
			name: newUser.name,
			email: newUser.email,
		});
	} catch (error) {
		console.error("Signup Error:", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ error: "Invalid credentials" });
		}

		const isPasswordCorrect = await bcrypt.compare(
			password,
			user.password || "",
		);
		if (!isPasswordCorrect) {
			return res.status(400).json({ error: "Invalid credentials" });
		}

		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
			expiresIn: "15d",
		});

		res.cookie("jwt", token, {
			maxAge: 15 * 24 * 60 * 60 * 1000,
			httpOnly: true,
			sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
			secure: process.env.NODE_ENV === "production",
		});

		res.status(200).json({
			_id: user._id,
			name: user.name,
			email: user.email,
		});
	} catch (error) {
		console.error("Login Error:", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const logout = (req, res) => {
	try {
		res.cookie("jwt", "", {
			maxAge: 0,
			httpOnly: true,
			sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
			secure: process.env.NODE_ENV === "production",
		});
		res.status(200).json({ message: "Logged out successfully" });
	} catch (error) {
		console.error("Logout Error:", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const checkAuth = (req, res) => {
	try {
		// If the bouncer (protectRoute) let them through, req.user exists!
		res.status(200).json(req.user);
	} catch (error) {
		console.error("CheckAuth Error:", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

// Don't forget to export it!
module.exports = { signup, login, logout, checkAuth };