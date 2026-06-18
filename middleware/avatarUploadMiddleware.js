// middleware/avatarUploadMiddleware.js
import multer from "multer";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."));
    }

    return cb(null, true);
  },
});

export function handleAvatarUpload(req, res, next) {
  const middleware = upload.single("avatar");

  middleware(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Image must be under 2MB.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Image upload failed.",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "Invalid image upload.",
    });
  });
}
