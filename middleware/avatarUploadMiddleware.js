// middleware/avatarUploadMiddleware.js
import multer from "multer";
import { upload } from "../uploads/multer.js";

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

      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "Invalid upload field.",
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