const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// 1. Verify complete cryptographic hash chain (DCP and Judge only)
router.get(
  '/verify',
  authenticate,
  authorize(['DCP', 'JUDGE']),
  auditController.verifyChain
);

router.get(
  '/verify-chain',
  authenticate,
  authorize(['DCP', 'JUDGE']),
  auditController.verifyChain
);

// 2. Fetch paginated audit trail (DCP and Judge only)
router.get(
  '/trail',
  authenticate,
  authorize(['DCP', 'JUDGE']),
  auditController.getAuditTrail
);

// 3. Fetch global audit logs across system (up to 100 entries, joined with users & evidence)
router.get(
  '/global',
  authenticate,
  authorize(['DCP', 'JUDGE']),
  auditController.getGlobalAuditLogs
);

// 4. Fetch personal activity log for logged-in user (strictly own entries)
router.get(
  '/my-activity',
  authenticate,
  authorize(['INSPECTOR', 'DCP', 'JUDGE']),
  auditController.getMyActivity
);

module.exports = router;

