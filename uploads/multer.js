// uploads/multer.js
import multer from "multer";
import path from "path";
import fs from "fs";

// eslint-disable-next-line no-undef
const ROOT = process.cwd();
const UPLOAD_DIR = path.join(ROOT, "uploads", "avatar");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function sanitizeFileBaseName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "avatar";
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },

  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";

    const rawBase = path.basename(file.originalname || "avatar", ext);
    const base = sanitizeFileBaseName(rawBase);
    const stamp = Date.now();

    cb(null, `${base}-${stamp}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk || !extOk) {
    return cb(
      new Error("Only JPG, JPEG, PNG, and WEBP images are allowed.")
    );
  }

  return cb(null, true);
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
  fileFilter,
});
