const express = require('express');
const router = express.Router();
const multer = require('multer');
const evidenceController = require('../controllers/evidence.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Configure Multer with memoryStorage (crucial: buffers kept in RAM for direct SHA-256 & cloud upload)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 Megabytes limit
  },
});

// 1. Upload evidence file (Inspector only)
router.post(
  '/upload',
  authenticate,
  authorize(['INSPECTOR']),
  upload.single('file'),
  evidenceController.uploadEvidence
);

// 2. Retrieve evidence uploaded by logged-in Inspector
router.get(
  '/my-evidence',
  authenticate,
  authorize(['INSPECTOR']),
  evidenceController.getMyEvidence
);

// 3. List all pending / approved / rejected evidence (DCP & Judge)
router.get(
  '/',
  authenticate,
  authorize(['DCP', 'JUDGE']),
  evidenceController.getAllEvidenceForDCP
);

// 4. Retrieve specific evidence by ID (RBAC & ownership checked in controller)
router.get(
  '/:id',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  evidenceController.getEvidenceById
);

// 5. Review evidence decision - Approve or Reject with remarks (DCP only)
router.patch(
  '/:id/review',
  authenticate,
  authorize(['DCP']),
  evidenceController.reviewEvidence
);

router.post(
  '/:id/review',
  authenticate,
  authorize(['DCP']),
  evidenceController.reviewEvidence
);

// 6. Cryptographic Verification Engine (Re-hash & compare against DB hash)
router.get(
  '/:id/verify',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  evidenceController.verifyEvidenceHash
);

router.post(
  '/:id/verify',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  evidenceController.verifyEvidenceHash
);

// 7. Verify External Copy against Sealed Vault Hash
router.post(
  '/:id/verify-external',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  upload.single('file'),
  evidenceController.verifyExternalCopy
);

// 8. Read-Only Streaming Viewer with Text Watermark (Judge & DCP)
router.get(
  '/:id/stream',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  evidenceController.streamEvidence
);

router.get(
  '/:id/view',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  evidenceController.streamEvidence
);

// 9. Structured Readable Content & Forensic Inspection (Judge & DCP)
router.get(
  '/:id/content',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  evidenceController.getEvidenceContent
);

// 10. Visual Audit Chain Timeline (Join audit_logs with users)
router.get(
  '/:id/audit-logs',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  evidenceController.getEvidenceAuditLogs
);

// 11. Generate Section 65B Indian Evidence Act Court Admissibility Certificate PDF
router.get(
  '/:id/report',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  evidenceController.generate65BCourtReport
);

module.exports = router;

