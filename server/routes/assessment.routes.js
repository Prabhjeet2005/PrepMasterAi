const express = require("express");
const {
	createAssessment,
	getAllAssessments,
	getAssessmentById,
	executeCode,
	submitAssessment,
	getUserAssessmentHistory,
	getRecruiterAssessments,
	getAssessmentSubmissions,
	getAssessmentResultById,
} = require("../controllers/assessment.controller.js");
const protectRoute = require("../middlewares/protectRoute.js");

const router = express.Router();

// Route to get all active assessments (Users need to be logged in to view them)
router.get("/", protectRoute, getAllAssessments);

// Route to create a new assessment
// Note: In a real production app, you'd add an `isAdmin` middleware here too!
router.post("/create", protectRoute, createAssessment);
router.post("/execute", protectRoute, executeCode);

router.get("/history", protectRoute, getUserAssessmentHistory);

router.get("/recruiter/my-oas", protectRoute, getRecruiterAssessments);
router.get(
	"/recruiter/submissions/:id",
	protectRoute,
	getAssessmentSubmissions,
);
router.get("/result/:id", protectRoute, getAssessmentResultById);

router.post("/:id/submit", protectRoute, submitAssessment);
router.get("/:id", protectRoute, getAssessmentById);

module.exports = router;
