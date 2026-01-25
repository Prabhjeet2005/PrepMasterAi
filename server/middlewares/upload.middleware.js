const multer = require("multer");

// Configure storage (We store in memory to keep it fast and serverless-friendly)
const storage = multer.memoryStorage();

const upload = multer({
	storage: storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

module.exports = upload;
