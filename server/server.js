const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const http = require("http");
const cookieParser =require("cookie-parser");
const authRoutes = require("./routes/auth.routes.js");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const interviewRouter = require("./routes/interview.routes");
const setupSocket = require("./sockets/socketHandler");
const assessmentRoutes = require("./routes/assessment.routes.js");


const app = express(); 
const server = http.createServer(app);

// Middleware
app.use(
	cors({
		origin:
			process.env.NODE_ENV === "production"
				? [
						"http://localhost:3000",
						"http://192.168.1.5:3000",
						"https://prep-master-ai-client.vercel.app",
					]
				: true, // <--- Allow requests from any URL (including Vercel)
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true,
	}),
);
app.use(express.json()); // Allows us to receive JSON data
app.use(cookieParser());

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("✅ DB CONNECTED SUCCESSFULLY"))
	.catch((err) => console.error("❌ DB CONNECTION ERROR:", err.message));
	
// Routes
app.use("/api/test",(req,res)=>res.json({message:"WORKING"}))
app.use("/api/auth", authRoutes);
app.use("/api/interview", interviewRouter);
app.use("/api/assessment", assessmentRoutes);

// SOCKET
const io = new Server(server, {
	cors: {
		origin: process.env.NODE_ENV === "production" ?[
			"http://localhost:3000",
			"http://192.168.1.5:3000",
			"https://prep-master-ai-client.vercel.app",
		]:true, // <--- Allow WebSockets from any URL
		methods: ["GET", "POST"],
	},
});

setupSocket(io);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
	console.log(
		`✅ HTTP & WebSocket Server running on http://localhost:${PORT}`,
	);
});
