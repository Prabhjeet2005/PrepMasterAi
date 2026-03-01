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
// ✅ FIX: Dynamic CORS. In dev, 'true' reflects the exact IP making the request, allowing anything!
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "http://localhost:3000",
            "https://prep-master-ai-client.vercel.app", // Production Vercel Link
          ]
        : true, // <--- ALLOWS ALL IPs IN DEVELOPMENT
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
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
    origin: process.env.NODE_ENV === "production" 
      ? [
          "http://localhost:3000",
          "https://prep-master-ai-client.vercel.app",
        ]
      : true,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000, // ✅ FIX: Increased to 60 seconds to survive mobile throttling
  pingInterval: 25000, 
});

setupSocket(io);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
	console.log(
		`✅ HTTP & WebSocket Server running on http://localhost:${PORT}`,
	);
});
