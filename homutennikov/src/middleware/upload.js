const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { nanoid } = require("nanoid");

const uploadDir = process.env.UPLOAD_DIR || "public/uploads";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${Date.now()}_${nanoid(8)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = /^image\//.test(file.mimetype);
  cb(ok ? null : new Error("Only images"), ok);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

module.exports = { upload };
