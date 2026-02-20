const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");

const protectRoute = async (req, res, next) => {
	try {
		// 1. Check if the token exists in the cookies
		const token = req.cookies.jwt;
		if (!token) {
			return res
				.status(401)
				.json({ error: "Unauthorized - No Token Provided" });
		}

		// 2. Verify the token is valid and hasn't expired
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		if (!decoded) {
			return res
				.status(401)
				.json({ error: "Unauthorized - Invalid Token" });
		}

		// 3. Find the user in the database (exclude the password from the result)
		const user = await User.findById(decoded.userId).select("-password");
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		// 4. Attach the user object to the request so the next function can use it
		req.user = user;

		// 5. Pass control to the next function (the actual route handler)
		next();
	} catch (error) {
		console.error("Error in protectRoute middleware:", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

module.exports = protectRoute;
