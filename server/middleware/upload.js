const util = require("util");
const multer = require("multer");
const path = require("path");
const maxSize = 12 * 1024 * 1024; // 12MB

// Allowed file types
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'application/pdf'
];

// Allowed file extensions
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.mp4', '.wav', '.pdf'];

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename) {
  // Remove path traversal attempts
  let sanitized = path.basename(filename);
  // Remove any remaining path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');
  // Remove special characters that could be dangerous
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }
  // Add timestamp to prevent overwrites
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);
  const timestamp = Date.now();
  return name + '_' + timestamp + ext;
}

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + "/resources/static/assets/uploads/");
  },
  filename: (req, file, cb) => {
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, sanitized);
  },
});

// File filter to check MIME type and extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check extension
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file type. Allowed types: ' + allowedExtensions.join(', ')), false);
  }
  
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file MIME type. Allowed types: ' + allowedMimeTypes.join(', ')), false);
  }
  
  cb(null, true);
};

let uploadFile = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter: fileFilter
}).single("file");

let uploadFileMiddleware = util.promisify(uploadFile);
module.exports = uploadFileMiddleware;