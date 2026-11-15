const multer = require('multer');

// Memory storage: Buffer retained in memory for in-flight SHA-256 calculation
const storage = multer.memoryStorage();

// Whitelist of strictly permitted forensic evidence MIME types
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/json',

  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',

  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',

  // Video
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',

  // Compressed Archives
  'application/zip',
  'application/x-zip-compressed',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 Megabytes limit

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1, // Single file upload per request
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type '${file.mimetype}'. Permitted types: PDF, Word docs, images (JPEG/PNG/WEBP), audio (MP3/WAV), video (MP4/MOV), and ZIP archives.`
        ),
        false
      );
    }
  },
});

/**
 * Express middleware wrapper to catch Multer errors gracefully
 */
function handleEvidenceUpload(fieldName = 'file') {
  const singleUpload = upload.single(fieldName);

  return (req, res, next) => {
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload processing error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }

      next();
    });
  };
}

module.exports = {
  handleEvidenceUpload,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
};

