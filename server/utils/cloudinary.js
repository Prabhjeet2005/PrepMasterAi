const cloudinary = require("cloudinary").v2;

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Uploads a massive Base64 string and returns a tiny, secure URL
const uploadBase64Image = async (base64String) => {
	try {
		const result = await cloudinary.uploader.upload(base64String, {
			folder: "prepmaster/proctoring",
		});
		return result.secure_url;
	} catch (error) {
		console.error("Cloudinary Image Upload Error:", error);
		return null; // If it fails, we just won't save the image, but the test won't crash
	}
};

// Uploads a raw PDF file buffer from memory and returns a URL
const uploadPDFBuffer = async (buffer) => {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{ folder: "prepmaster/resumes", resource_type: "raw" },
			(error, result) => {
				if (error) {
					console.error("Cloudinary PDF Upload Error:", error);
					resolve(null);
				} else {
					resolve(result.secure_url);
				}
			},
		);
		uploadStream.end(buffer);
	});
};

module.exports = { uploadBase64Image, uploadPDFBuffer };
