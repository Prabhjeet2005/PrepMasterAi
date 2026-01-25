const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const interviewRouter = require("./routes/interview.routes");


const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows us to receive JSON data

// Routes
app.use("/api/test",(req,res)=>res.json({message:"WORKING"}))
app.use("/api/interview", interviewRouter);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
