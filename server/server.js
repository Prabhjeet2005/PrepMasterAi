const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const interviewRouter = require("./routes/interview.routes");
const setupSocket = require("./sockets/socketHandler");


const app = express(); 
const server = http.createServer(app);

// Middleware
app.use(
	cors({
		origin: "*", // <--- Allow requests from any URL (including Vercel)
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true,
	}),
);
app.use(express.json()); // Allows us to receive JSON data

const MONGO_URI = process.env.MONGO_URI;

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("✅ DB CONNECTED SUCCESSFULLY"))
	.catch((err) => console.error("❌ DB CONNECTION ERROR:", err.message));
	
// Routes
app.use("/api/test",(req,res)=>res.json({message:"WORKING"}))
app.use("/api/interview", interviewRouter);

// SOCKET
const io = new Server(server, {
	cors: {
		origin: "*", // <--- Allow WebSockets from any URL
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
