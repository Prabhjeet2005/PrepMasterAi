const express = require("express");
const {
	createAssessment,
	getAllAssessments,
} = require("../controllers/assessment.controller.js");
const protectRoute = require("../middlewares/protectRoute.js");

const router = express.Router();

// Route to get all active assessments (Users need to be logged in to view them)
router.get("/", protectRoute, getAllAssessments);

// Route to create a new assessment
// Note: In a real production app, you'd add an `isAdmin` middleware here too!
router.post("/create", protectRoute, createAssessment);

module.exports = router;
